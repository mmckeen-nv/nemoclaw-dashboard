import { NextResponse } from "next/server"
import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const NODE_BIN_CANDIDATES = [
  process.env.NODE_BIN,
  "/Users/markmckeen/.nvm/versions/node/v22.22.2/bin/node",
  "/Users/markmckeen/.nvm/versions/node/v22.22.1/bin/node",
  "/opt/homebrew/bin/node",
  "/usr/local/bin/node",
].filter((value): value is string => Boolean(value))
const NODE_BIN = NODE_BIN_CANDIDATES.find((candidate) => existsSync(candidate)) ?? NODE_BIN_CANDIDATES[0]
const NEMOCLAW_BIN_CANDIDATES = [
  process.env.NEMOCLAW_BIN,
  "/Users/markmckeen/.local/bin/nemoclaw",
  "/Users/markmckeen/NemoClaw/bin/nemoclaw.js",
  "/Users/markmckeen/NemoClaw-mmckeen/bin/nemoclaw.js",
  "/Users/markmckeen/.nvm/versions/node/v22.22.2/bin/nemoclaw",
  "/usr/local/bin/nemoclaw",
  "/opt/homebrew/bin/nemoclaw",
].filter((value): value is string => Boolean(value))

const NEMOCLAW_BIN =
  NEMOCLAW_BIN_CANDIDATES.find((candidate) => existsSync(candidate)) ?? NEMOCLAW_BIN_CANDIDATES[0]
const CONFIG_PATH = join(homedir(), ".nemoclaw", "config.json")

type EndpointType = "build" | "ncp" | "nim-local" | "vllm" | "ollama" | "custom"

type NemoClawOnboardConfig = {
  endpointType: EndpointType
  endpointUrl: string
  ncpPartner: string | null
  model: string
  profile: string
  credentialEnv: string
  provider?: string
  providerLabel?: string
  onboardedAt: string
  availableModels?: string[]
}

type RuntimeSandbox = {
  name: string
  isDefault: boolean
  model: string | null
  provider: string | null
  gpuEnabled: boolean | null
  policies: string[]
}

type RuntimeService = {
  name: string
  status: string
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "")
}

function parseRuntimeList(output: string): RuntimeSandbox[] {
  const lines = stripAnsi(output).split(/\r?\n/)
  const sandboxes: RuntimeSandbox[] = []
  let current: RuntimeSandbox | null = null

  for (const line of lines) {
    const sandboxMatch = line.match(/^\s{2,}([\w.-]+)(\s+\*)?\s*$/)
    if (sandboxMatch) {
      current = {
        name: sandboxMatch[1],
        isDefault: Boolean(sandboxMatch[2]),
        model: null,
        provider: null,
        gpuEnabled: null,
        policies: [],
      }
      sandboxes.push(current)
      continue
    }

    if (!current) continue

    const detailMatch = stripAnsi(line).match(/^\s+model:\s*(.*?)\s+provider:\s*(.*?)\s+(GPU|CPU)\s+policies:\s*(.+)$/i)
    if (!detailMatch) continue

    current.model = detailMatch[1] === "unknown" ? null : detailMatch[1]
    current.provider = detailMatch[2] === "unknown" ? null : detailMatch[2]
    current.gpuEnabled = detailMatch[3].toUpperCase() === "GPU"
    current.policies = detailMatch[4] === "none"
      ? []
      : detailMatch[4].split(/\s*,\s*/).map((entry) => entry.trim()).filter(Boolean)
  }

  return sandboxes
}

function parseRuntimeStatus(output: string): RuntimeService[] {
  return stripAnsi(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^●\s+/.test(line))
    .map((line) => {
      const match = line.match(/^●\s+([\w.-]+)\s+\(([^)]+)\)$/)
      return match
        ? { name: match[1], status: match[2] }
        : { name: line.replace(/^●\s+/, ""), status: "unknown" }
    })
}

async function execNemoclaw(args: string[]) {
  const env = {
    ...process.env,
    PATH: `${process.env.PATH ?? ""}:/Users/markmckeen/.local/bin:/Users/markmckeen/.nvm/versions/node/v22.22.2/bin:/Users/markmckeen/.nvm/versions/node/v22.22.1/bin:/opt/homebrew/bin:/usr/local/bin`,
    NO_COLOR: "1",
    CLICOLOR: "0",
    CLICOLOR_FORCE: "0",
  }

  const command = /\.(?:c?m?js|ts)$/i.test(NEMOCLAW_BIN)
    ? execFileAsync(NODE_BIN, [NEMOCLAW_BIN, ...args], { env })
    : execFileAsync(NEMOCLAW_BIN, args, { env })

  const { stdout, stderr } = await command
  return { stdout, stderr }
}

function describeOnboardEndpoint(config: NemoClawOnboardConfig) {
  if (config.endpointUrl === "https://inference.local/v1") {
    return "Managed Inference Route (inference.local)"
  }

  return `${config.endpointType} (${config.endpointUrl})`
}

function describeOnboardProvider(config: NemoClawOnboardConfig) {
  if (config.providerLabel) {
    return config.providerLabel
  }

  switch (config.endpointType) {
    case "build":
      return "NVIDIA Endpoint API"
    case "ollama":
      return "Local Ollama"
    case "vllm":
      return "Local vLLM"
    case "nim-local":
      return "Local NIM"
    case "ncp":
      return "NVIDIA Cloud Partner"
    case "custom":
      return "Managed Inference Route"
    default:
      return "Unknown"
  }
}

async function loadNemoclawConfig(): Promise<NemoClawOnboardConfig | null> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8")
    return JSON.parse(raw) as NemoClawOnboardConfig
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return null
    }
    throw error
  }
}

export async function GET() {
  try {
    const [config, runtimeStatusResult, runtimeListResult] = await Promise.all([
      loadNemoclawConfig(),
      execNemoclaw(["status"]),
      execNemoclaw(["list"]),
    ])

    const sandboxes = parseRuntimeList(runtimeListResult.stdout)
    const services = parseRuntimeStatus(runtimeStatusResult.stdout)
    const defaultSandbox = sandboxes.find((sandbox) => sandbox.isDefault) ?? null

    if (!config) {
      return NextResponse.json({
        enabled: false,
        instances: sandboxes.length,
        models: [],
        config: null,
        source: "~/.nemoclaw/config.json + nemoclaw status/list",
        onboarded: false,
        note: "No NemoClaw onboard config found. Run `nemoclaw onboard` to configure inference.",
        runtime: {
          source: "nemoclaw-cli",
          sandboxes,
          services,
          defaultSandbox,
          rawStatus: runtimeStatusResult.stdout.trim(),
          rawList: runtimeListResult.stdout.trim(),
        },
      })
    }

    const models = Array.isArray(config.availableModels) && config.availableModels.length > 0
      ? config.availableModels
      : config.model
        ? [config.model]
        : []

    return NextResponse.json({
      enabled: true,
      instances: sandboxes.length || 1,
      models,
      config,
      source: "~/.nemoclaw/config.json + nemoclaw status/list",
      onboarded: true,
      endpoint: {
        type: config.endpointType,
        url: config.endpointUrl,
        description: describeOnboardEndpoint(config),
      },
      provider: {
        id: config.provider ?? null,
        label: describeOnboardProvider(config),
        credentialEnv: config.credentialEnv,
      },
      profile: config.profile,
      onboardedAt: config.onboardedAt,
      runtime: {
        source: "nemoclaw-cli",
        sandboxes,
        services,
        defaultSandbox,
        rawStatus: runtimeStatusResult.stdout.trim(),
        rawList: runtimeListResult.stdout.trim(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch NemoClaw config",
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Updating NemoClaw config is not wired yet. Use `nemoclaw onboard` to change the upstream-managed config.",
    },
    { status: 501 }
  )
}

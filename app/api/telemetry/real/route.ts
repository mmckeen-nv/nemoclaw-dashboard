import { NextResponse } from "next/server"
import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
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
  "/Users/markmckeen/.nemoclaw/source/bin/nemoclaw.js",
  "/Users/markmckeen/NemoClaw/bin/nemoclaw.js",
  "/Users/markmckeen/NemoClaw-mmckeen/bin/nemoclaw.js",
  "/Users/markmckeen/.nvm/versions/node/v22.22.2/bin/nemoclaw",
  "/usr/local/bin/nemoclaw",
  "/opt/homebrew/bin/nemoclaw",
].filter((value): value is string => Boolean(value))
const NEMOCLAW_BIN =
  NEMOCLAW_BIN_CANDIDATES.find((candidate) => existsSync(candidate)) ?? NEMOCLAW_BIN_CANDIDATES[0]

const OPENSHELL_BIN_CANDIDATES = [
  process.env.OPENSHELL_BIN,
  "/Users/markmckeen/.local/bin/openshell",
  "/Users/markmckeen/OpenShell/target/release/openshell",
  "/Users/markmckeen/openshell/target/release/openshell",
  "/Users/markmckeen/openshell/scripts/bin/openshell",
  "/usr/local/bin/openshell",
  "/opt/homebrew/bin/openshell",
].filter((value): value is string => Boolean(value))
const OPENSHELL_BIN =
  OPENSHELL_BIN_CANDIDATES.find((candidate) => existsSync(candidate)) ?? OPENSHELL_BIN_CANDIDATES[0]

type SandboxSummary = {
  id: string
  name: string
  namespace: string
  status: string
  sshHostAlias: string
  hasSshConfig: boolean
  source: "openshell"
  isDefault: boolean
}

type SandboxItem = {
  metadata: {
    name: string
    namespace: string
    labels: Record<string, string>
  }
  spec: {
    template: {
      image: string | null
    }
  }
  status: {
    phase: string
    podIP: string | null
    conditions: Array<{
      type: string
      status: string
    }>
  }
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "")
}

function parseField(output: string, label: string) {
  const normalizedLabel = label.toLowerCase()
  const line = output
    .split(/\r?\n/)
    .map((entry) => stripAnsi(entry).trim())
    .find((entry) => entry.toLowerCase().startsWith(`${normalizedLabel}:`))

  return line ? line.slice(label.length + 1).trim() : null
}

function parseSshHostAlias(sshConfig: string, fallbackName: string) {
  const hostLine = sshConfig
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.toLowerCase().startsWith("host "))

  const alias = hostLine
    ?.split(/\s+/)
    .slice(1)
    .find((entry) => entry !== "*")

  return alias || `openshell-${fallbackName}`
}

function normalizePhase(phase: string | null) {
  const value = (phase ?? "Unknown").toLowerCase()

  switch (value) {
    case "ready":
      return "Running"
    case "provisioning":
      return "Pending"
    case "deleting":
      return "Stopping"
    case "error":
      return "Error"
    default:
      return phase ?? "Unknown"
  }
}

function parseOpenShellSandboxNames(output: string) {
  return output
    .split(/\r?\n/)
    .map((entry) => stripAnsi(entry).trim())
    .filter((entry) => entry && !/^name\s+/i.test(entry) && !/^[-=]+$/.test(entry))
    .map((entry) => entry.split(/\s{2,}/)[0]?.trim())
    .filter((entry): entry is string => Boolean(entry))
}

function parseDefaultSandboxNames(output: string) {
  return new Set(
    output
      .split(/\r?\n/)
      .map((entry) => stripAnsi(entry))
      .filter((entry) => /^\s{2,}[\w.-]+(?:\s+\*)?\s*$/.test(entry) && entry.includes("*"))
      .map((entry) => entry.replace("*", "").trim())
      .filter(Boolean)
  )
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

async function execOpenShell(args: string[]) {
  const { stdout, stderr } = await execFileAsync(OPENSHELL_BIN, args, {
    env: {
      ...process.env,
      NO_COLOR: "1",
      CLICOLOR: "0",
      CLICOLOR_FORCE: "0",
    },
  })

  return { stdout, stderr }
}

async function readSandbox(name: string, defaultSandboxNames: Set<string>): Promise<{ summary: SandboxSummary; pod: SandboxItem }> {
  const [{ stdout: detailsStdout }, { stdout: sshStdout }] = await Promise.all([
    execOpenShell(["sandbox", "get", name]),
    execOpenShell(["sandbox", "ssh-config", name]),
  ])

  const sandboxName = parseField(detailsStdout, "Name") ?? name
  const namespace = parseField(detailsStdout, "Namespace") ?? "openshell"
  const phase = normalizePhase(parseField(detailsStdout, "Phase"))
  const sandboxId = parseField(detailsStdout, "Id") ?? sandboxName
  const sshConfig = sshStdout.trim()
  const sshHostAlias = parseSshHostAlias(sshConfig, sandboxName)
  const isDefault = defaultSandboxNames.has(sandboxName)

  return {
    summary: {
      id: sandboxId,
      name: sandboxName,
      namespace,
      status: phase,
      sshHostAlias,
      hasSshConfig: Boolean(sshConfig),
      source: "openshell",
      isDefault,
    },
    pod: {
      metadata: {
        name: sandboxName,
        namespace,
        labels: {
          "nemoclaw.ai/sandbox-name": sandboxName,
          ...(sandboxId ? { "nemoclaw.ai/sandbox-id": sandboxId } : {}),
          ...(isDefault ? { "nemoclaw.ai/default": "true" } : {}),
        },
      },
      spec: {
        template: {
          image: null,
        },
      },
      status: {
        phase,
        podIP: sshHostAlias,
        conditions: [
          {
            type: "Ready",
            status: phase === "Running" ? "True" : "False",
          },
        ],
      },
    },
  }
}

export async function GET() {
  try {
    const [{ stdout: sandboxListStdout }, defaultSandboxNames] = await Promise.all([
      execOpenShell(["sandbox", "list"]),
      execNemoclaw(["list"])
        .then(({ stdout }) => parseDefaultSandboxNames(stdout))
        .catch(() => new Set<string>()),
    ])

    const names = parseOpenShellSandboxNames(sandboxListStdout)
    const results = await Promise.all(names.map((name) => readSandbox(name, defaultSandboxNames)))
    const sandboxes = results.map((result) => result.summary)
    const items = results.map((result) => result.pod)

    return NextResponse.json({
      sandboxes,
      pods: { items },
      source: "openshell-cli",
      defaultSource: defaultSandboxNames.size > 0 ? "nemoclaw-cli" : "none",
      count: sandboxes.length,
      message: "Fetched live sandbox inventory from the clean OpenShell runtime",
    })
  } catch (error) {
    console.error("Error fetching real telemetry:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch live OpenShell sandbox inventory",
      },
      { status: 500 }
    )
  }
}

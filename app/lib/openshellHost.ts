import { exec, execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { promisify } from "node:util"

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)

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
const OPENSHELL_GATEWAY = process.env.OPENSHELL_GATEWAY || "openshell"
const OPENSHELL_NAMESPACE = "agent-sandbox-system"
const OPENCLAW_DASHBOARD_URL = "http://127.0.0.1:18789/"

export type HostTelemetry = {
  cpu: number
  memory: number
  disk: number
  gpuMemoryUsed?: number
  gpuMemoryTotal?: number
  gpuTemperature?: number
  timestamp: string
  source: "macos-host"
}

type SandboxInspection = {
  name: string
  id: string | null
  namespace: string | null
  phase: string | null
  sshHostAlias: string
  sshConfig: string
  rawDetails: string
}

export async function execOpenShell(args: string[]) {
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

async function execBash(command: string) {
  const { stdout } = await execFileAsync("/bin/bash", ["-lc", command])
  return stdout.trim()
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
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


export function normalizeSandboxPhase(phase: string | null) {
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

async function readCpuUsage() {
  const output = await execBash("top -l 1 -n 0 | grep CPU")
  const match = output.match(/([\d.]+)% idle/)
  const idle = match ? Number.parseFloat(match[1]) : 0
  return clampPercentage(100 - idle)
}

async function readMemoryUsage() {
  const output = await execBash("vm_stat")
  const pageSize = Number.parseInt(output.match(/page size of (\d+) bytes/i)?.[1] ?? "4096", 10)
  const valueFor = (label: string) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const match = output.match(new RegExp(`${escaped}:\\s+(\\d+)\\.?`, "i"))
    return Number.parseInt(match?.[1] ?? "0", 10)
  }

  const active = valueFor("Pages active")
  const wired = valueFor("Pages wired down")
  const compressed = valueFor("Pages occupied by compressor")
  const speculative = valueFor("Pages speculative")
  const inactive = valueFor("Pages inactive")
  const free = valueFor("Pages free")
  const totalPages = active + wired + compressed + speculative + inactive + free
  const usedPages = active + wired + compressed + speculative

  if (totalPages === 0) {
    return 0
  }

  return clampPercentage((usedPages * pageSize * 100) / (totalPages * pageSize))
}

async function readDiskUsage() {
  const output = await execBash("df -k / | tail -1")
  const columns = output.split(/\s+/)
  const usedPercent = columns[4]?.replace("%", "") ?? "0"
  return clampPercentage(Number.parseFloat(usedPercent))
}

export async function readHostTelemetry(): Promise<HostTelemetry> {
  const [cpu, memory, disk] = await Promise.all([readCpuUsage(), readMemoryUsage(), readDiskUsage()])

  return {
    cpu,
    memory,
    disk,
    timestamp: new Date().toISOString(),
    source: "macos-host",
  }
}

export async function inspectSandbox(name: string): Promise<SandboxInspection> {
  const [{ stdout: detailsStdout }, { stdout: sshStdout }] = await Promise.all([
    execOpenShell(["sandbox", "get", name]),
    execOpenShell(["sandbox", "ssh-config", name]),
  ])

  const sshConfig = sshStdout.trim()

  return {
    name: parseField(detailsStdout, "Name") ?? name,
    id: parseField(detailsStdout, "Id"),
    namespace: parseField(detailsStdout, "Namespace"),
    phase: normalizeSandboxPhase(parseField(detailsStdout, "Phase")),
    sshHostAlias: parseSshHostAlias(sshConfig, name),
    sshConfig,
    rawDetails: detailsStdout.trim(),
  }
}

export async function probeSandboxShell(name: string) {
  return inspectSandbox(name)
}

export function isOpenShellTransportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "")
  const normalized = message.toLowerCase()

  return (
    normalized.includes("transport error") ||
    normalized.includes("connection refused") ||
    normalized.includes("tcp connect error")
  )
}

export function getOpenClawDashboardUrl() {
  return OPENCLAW_DASHBOARD_URL
}

export { OPENSHELL_BIN, OPENSHELL_GATEWAY, OPENSHELL_NAMESPACE }

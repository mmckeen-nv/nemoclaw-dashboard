import { NextResponse } from "next/server"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { OPENSHELL_BIN } from "../../../../lib/openshellHost"

const execFileAsync = promisify(execFile)

async function execOpenShell(args: string[]) {
  const { stdout, stderr } = await execFileAsync(OPENSHELL_BIN, args, {
    env: {
      ...process.env,
      NO_COLOR: "1",
      CLICOLOR: "0",
      CLICOLOR_FORCE: "0",
    },
    maxBuffer: 10 * 1024 * 1024,
  })

  return { stdout, stderr }
}

async function yamlToJson(yaml: string) {
  const { stdout } = await execFileAsync(
    "/usr/bin/ruby",
    [
      "-ryaml",
      "-rjson",
      "-e",
      "print JSON.generate(YAML.safe_load(ARGF.read, permitted_classes: [Date, Time], aliases: true))",
    ],
    {
      input: yaml,
      maxBuffer: 10 * 1024 * 1024,
    }
  )

  return JSON.parse(stdout || "null")
}

async function jsonToYaml(value: unknown) {
  const { stdout } = await execFileAsync(
    "/usr/bin/ruby",
    ["-rjson", "-ryaml", "-e", "obj = JSON.parse(ARGF.read); print YAML.dump(obj)"],
    {
      input: JSON.stringify(value),
      maxBuffer: 10 * 1024 * 1024,
    }
  )

  return stdout
}

function normalizeTransportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "")
  const normalized = message.toLowerCase()

  if (
    normalized.includes("transport error") ||
    normalized.includes("connection refused") ||
    normalized.includes("tcp connect error")
  ) {
    return {
      status: 503,
      body: {
        error: "OpenShell gateway is unreachable",
        detail: message,
      },
    }
  }

  return {
    status: 500,
    body: {
      error: message || "OpenShell policy operation failed",
    },
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  try {
    const { sandboxId } = await params
    const { stdout } = await execOpenShell(["policy", "get", "--full", sandboxId])
    const currentConfig = await yamlToJson(stdout)

    return NextResponse.json({
      sandboxId,
      currentConfig,
      source: "openshell policy get --full",
    })
  } catch (error) {
    const normalized = normalizeTransportError(error)
    return NextResponse.json(normalized.body, { status: normalized.status })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  let tempDir: string | null = null

  try {
    const { sandboxId } = await params
    const body = await request.json()
    const policy = body?.policy

    if (!policy || typeof policy !== "object") {
      return NextResponse.json({ error: "policy object is required" }, { status: 400 })
    }

    const policyYaml = await jsonToYaml(policy)
    tempDir = await mkdtemp(join(tmpdir(), "nemo-shell-dashboard-policy-"))
    const policyPath = join(tempDir, `${sandboxId}.yaml`)
    await writeFile(policyPath, policyYaml, "utf8")

    const { stdout, stderr } = await execOpenShell([
      "policy",
      "set",
      sandboxId,
      "--policy",
      policyPath,
      "--wait",
    ])

    return NextResponse.json({
      success: true,
      sandboxId,
      policy,
      source: "openshell policy set --wait",
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      appliedAt: new Date().toISOString(),
      note: "Live sandbox policy updated through the upstream OpenShell CLI.",
    })
  } catch (error) {
    const normalized = normalizeTransportError(error)
    return NextResponse.json(normalized.body, { status: normalized.status })
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

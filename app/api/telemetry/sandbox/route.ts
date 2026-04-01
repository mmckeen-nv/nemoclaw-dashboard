import { NextResponse } from "next/server"
import { inspectSandbox, readHostTelemetry } from "../../../lib/openshellHost"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sandboxId = searchParams.get("sandboxId")

    if (!sandboxId) {
      return NextResponse.json({ error: "sandboxId is required" }, { status: 400 })
    }

    const telemetry = await readHostTelemetry()
    const inspection = await inspectSandbox(sandboxId)

    return NextResponse.json({
      ...telemetry,
      sandbox: {
        id: inspection.id,
        name: inspection.name,
        namespace: inspection.namespace,
        phase: inspection.phase,
        sshHostAlias: inspection.sshHostAlias,
      },
      note: "Live host telemetry plus OpenShell sandbox metadata. Sandbox-internal metrics still need an SSH-backed collector.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch sandbox telemetry",
      },
      { status: 500 }
    )
  }
}

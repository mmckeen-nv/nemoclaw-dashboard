import { NextResponse } from "next/server"
import { inspectSandbox, isOpenShellTransportError } from "../../../../lib/openshellHost"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sandboxId = searchParams.get("sandboxId")

    if (!sandboxId) {
      return NextResponse.json({ error: "sandboxId is required" }, { status: 400 })
    }

    const result = await inspectSandbox(sandboxId)
    const normalizedPhase = result.phase?.toLowerCase() ?? "unknown"
    const attached = ["running", "ready"].includes(normalizedPhase)

    return NextResponse.json({
      ok: true,
      sandboxId,
      attached,
      sandbox: {
        id: result.id,
        name: result.name,
        namespace: result.namespace,
        phase: result.phase,
      },
      attach: {
        transport: "ssh",
        sshHostAlias: result.sshHostAlias,
        command: `ssh ${result.sshHostAlias}`,
        sshConfig: result.sshConfig,
      },
      output: result.rawDetails,
      note: attached
        ? "Live OpenShell SSH attach metadata resolved for this sandbox. Use the generated host alias instead of pod/container exec assumptions."
        : "Sandbox is not currently attachable. SSH attach metadata resolved, but terminal attach will only work once the sandbox reaches Ready or Running.",
    })
  } catch (error) {
    if (isOpenShellTransportError(error)) {
      return NextResponse.json(
        {
          ok: false,
          available: false,
          error: "OpenShell gateway is unreachable. Start the upstream gateway before attaching to a sandbox terminal.",
          detail: error instanceof Error ? error.message : "OpenShell gateway unavailable",
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to inspect sandbox attach target",
      },
      { status: 500 }
    )
  }
}

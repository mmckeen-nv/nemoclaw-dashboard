import { NextResponse } from "next/server"
import { isOpenShellTransportError, probeSandboxShell } from "../../../../lib/openshellHost"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sandboxId = searchParams.get("sandboxId")

    if (!sandboxId) {
      return NextResponse.json({ error: "sandboxId is required" }, { status: 400 })
    }

    const result = await probeSandboxShell(sandboxId)

    return NextResponse.json({
      ok: true,
      sandboxId,
      attached: result.phase?.toLowerCase() === "running",
      output: result.rawDetails,
      sshHostAlias: result.sshHostAlias,
      sshConfig: result.sshConfig,
      note: "OpenShell CLI inspection succeeded. Next step is wiring a persistent SSH-backed terminal transport via the generated openshell-* host alias.",
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
        error: error instanceof Error ? error.message : "Failed to probe terminal attach",
      },
      { status: 500 }
    )
  }
}

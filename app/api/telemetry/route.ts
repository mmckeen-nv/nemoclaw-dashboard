import { NextResponse } from "next/server"
import { readHostTelemetry } from "../../lib/openshellHost"

export async function GET() {
  try {
    const telemetry = await readHostTelemetry()
    return NextResponse.json({
      ...telemetry,
      source: "macos-host",
      note: "Live host telemetry from the clean Mac runtime via local system inspection.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch host telemetry",
      },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { readHostTelemetry } from "../../../lib/openshellHost"

export async function GET() {
  try {
    const telemetry = await readHostTelemetry()
    return NextResponse.json(telemetry)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch host telemetry",
      },
      { status: 500 }
    )
  }
}

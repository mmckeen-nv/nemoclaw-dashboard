import { NextResponse } from 'next/server'
import { getOpenClawDashboardUrl } from '../../../../lib/openshellHost'

export async function GET() {
  const dashboardUrl = getOpenClawDashboardUrl()
  return NextResponse.json({
    ok: true,
    dashboardUrl,
    openInNewTab: true,
    loopbackOnly: true,
    note: 'OpenClaw Dashboard is loopback-only on the host. For remote browser access, add a reverse proxy route or rebind the gateway.'
  })
}

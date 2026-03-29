import { NextResponse } from 'next/server'
import { getOpenClawDashboardUrl } from '../../../../lib/openshellHost'

export async function GET() {
  const dashboardUrl = getOpenClawDashboardUrl()
  return NextResponse.json({
    ok: true,
    dashboardUrl,
    proxiedUrl: '/api/openshell/dashboard/proxy',
    openInNewTab: true,
    loopbackOnly: true,
    note: 'OpenClaw Dashboard is loopback-only on the host, so the web UI uses a local proxy route to expose it.'
  })
}

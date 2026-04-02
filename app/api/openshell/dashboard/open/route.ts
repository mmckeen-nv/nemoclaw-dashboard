import { NextResponse } from 'next/server'
import { getOpenClawDashboardUrl } from '../../../../lib/openshellHost'

const PROXY_PATH = '/api/openshell/dashboard/proxy'

async function probeDashboard(dashboardUrl: string) {
  try {
    const response = await fetch(dashboardUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      },
    })

    return {
      reachable: response.ok,
      status: response.status,
      statusText: response.statusText,
    }
  } catch (error) {
    return {
      reachable: false,
      status: null,
      statusText: error instanceof Error ? error.message : 'Dashboard probe failed',
    }
  }
}

export async function GET() {
  const dashboardUrl = getOpenClawDashboardUrl()
  const probe = await probeDashboard(dashboardUrl)

  return NextResponse.json({
    ok: probe.reachable,
    dashboardUrl,
    proxiedUrl: PROXY_PATH,
    openInNewTab: true,
    loopbackOnly: true,
    reachable: probe.reachable,
    upstreamStatus: probe.status,
    upstreamStatusText: probe.statusText,
    note: probe.reachable
      ? 'OpenClaw Dashboard is loopback-only on the host, so the web UI uses a local proxy route to expose it.'
      : 'OpenClaw Dashboard proxy target is currently unreachable from this host; use the status fields for recovery instead of assuming the dashboard is live.',
  })
}

import { NextResponse } from 'next/server'
import { getOpenClawDashboardUrl } from '../../../lib/openshellHost'

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
    dashboardUrl,
    reachableFromServer: probe.reachable,
    loopbackOnly: true,
    upstreamStatus: probe.status,
    upstreamStatusText: probe.statusText,
    note: probe.reachable
      ? 'OpenClaw Gateway Dashboard is loopback-only on the host. Use the dashboard proxy route to expose it in a browser.'
      : 'OpenClaw Gateway Dashboard is not currently reachable on its loopback bind address; check the status fields before assuming the proxy path is live.',
  })
}

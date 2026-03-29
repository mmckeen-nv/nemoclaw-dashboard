import { NextResponse } from 'next/server'

const OPENCLAW_LOCAL_DASHBOARD = 'http://127.0.0.1:18789/'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const targetPath = url.searchParams.get('path') || ''
    const target = new URL(targetPath, OPENCLAW_LOCAL_DASHBOARD)

    const upstream = await fetch(target.toString(), {
      method: 'GET',
      headers: {
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8'
      },
      cache: 'no-store'
    })

    const contentType = upstream.headers.get('content-type') || 'text/html; charset=utf-8'
    const body = await upstream.text()

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store'
      }
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to proxy OpenClaw dashboard'
    }, { status: 500 })
  }
}

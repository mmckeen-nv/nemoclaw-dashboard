import { NextResponse } from "next/server"

const OPENCLAW_LOCAL_DASHBOARD = "http://127.0.0.1:18789/"
const OPENCLAW_LOCAL_ORIGIN = new URL(OPENCLAW_LOCAL_DASHBOARD).origin
const PROXY_PATH = "/api/openshell/dashboard/proxy"

function resolveDashboardTarget(rawPath: string | null) {
  const candidate = (rawPath || "/").trim()

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    throw new Error("Dashboard proxy only accepts relative loopback paths")
  }

  const target = new URL(candidate, OPENCLAW_LOCAL_DASHBOARD)

  if (target.origin !== OPENCLAW_LOCAL_ORIGIN) {
    throw new Error("Dashboard proxy target escaped the local OpenClaw origin")
  }

  return target
}

function toProxyPath(assetPath: string) {
  return `${PROXY_PATH}?path=${encodeURIComponent(assetPath)}`
}

function rewriteHtmlForProxy(body: string) {
  return body.replace(/\b(href|src|action)=(['"])(\/[^'"#?][^'"]*)\2/g, (_match, attr, quote, assetPath) => {
    return `${attr}=${quote}${toProxyPath(assetPath)}${quote}`
  })
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const target = resolveDashboardTarget(url.searchParams.get("path"))

    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers: {
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    })

    const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8"
    const rawBody = await upstream.text()
    const body = contentType.includes("text/html") ? rewriteHtmlForProxy(rawBody) : rawBody

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to proxy OpenClaw dashboard"
    const status =
      message.includes("only accepts relative loopback paths") ||
      message.includes("escaped the local OpenClaw origin")
        ? 400
        : 500

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status }
    )
  }
}

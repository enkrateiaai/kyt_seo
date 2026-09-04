import { NextRequest, NextResponse } from 'next/server'

const REMOTE_BASE = 'http://100.117.19.15:8080/'
const PROXY_PREFIX = '/api/live-local-proxy'

function rewriteM3u8(text: string, segmentBase: string): string {
  return text
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (!t || t.startsWith('#')) return line
      // absolute path like /live/live.m3u8?hls_ctx=...
      if (t.startsWith('/live/')) return PROXY_PREFIX + t
      // relative segment like live-13.ts?hls_ctx=...
      return PROXY_PREFIX + '/' + segmentBase + '/' + t
    })
    .join('\n')
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const joinedPath = Array.isArray(path) ? path.join('/') : ''
  const target = new URL(joinedPath, REMOTE_BASE)

  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value)
  })

  const headers = new Headers(request.headers)
  headers.delete('host')

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
      redirect: 'manual',
      cache: 'no-store',
    })

    const responseHeaders = new Headers(upstream.headers)
    responseHeaders.set('cache-control', 'no-store, max-age=0')

    const ct = upstream.headers.get('content-type') ?? ''
    if (ct.includes('mpegurl') || joinedPath.endsWith('.m3u8')) {
      const text = await upstream.text()
      const segmentBase = joinedPath.includes('/') ? joinedPath.split('/').slice(0, -1).join('/') : joinedPath
      const rewritten = rewriteM3u8(text, segmentBase)
      return new NextResponse(rewritten, {
        status: upstream.status,
        headers: {
          'content-type': ct || 'application/vnd.apple.mpegurl',
          'cache-control': 'no-store, max-age=0',
          'access-control-allow-origin': '*',
        },
      })
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch {
    return new NextResponse('Stream proxy unavailable', { status: 502 })
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context)
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context)
}

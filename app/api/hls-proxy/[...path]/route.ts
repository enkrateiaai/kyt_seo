import { NextRequest, NextResponse } from 'next/server'
import { noteViewer } from '@/lib/viewerTracker'

// Direct SRS HLS access — bypasses Flask, no auth needed (stream is public to viewers anyway)
const SRS_BASE = process.env.SRS_HLS_URL ?? 'http://100.117.19.15:8080'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const joined = path.join('/')
  const search = req.nextUrl.search

  // Track viewer via SRS-generated hls_ctx session ID (present on segment requests)
  const hlsCtx = req.nextUrl.searchParams.get('hls_ctx')
  if (hlsCtx && joined.endsWith('.ts')) noteViewer(hlsCtx)

  try {
    const upstream = await fetch(`${SRS_BASE}/${joined}${search}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    const ct = upstream.headers.get('content-type') ?? ''
    const isM3u8 = ct.includes('mpegurl') || joined.endsWith('.m3u8')

    if (isM3u8) {
      // Rewrite absolute /live/ paths so HLS.js fetches segments via this proxy
      let body = await upstream.text()
      body = body.replace(/^\/live\//gm, '/api/hls-proxy/live/')
      return new NextResponse(body, {
        status: upstream.status,
        headers: {
          'content-type': 'application/vnd.apple.mpegurl',
          'cache-control': 'no-cache, no-store',
          'access-control-allow-origin': '*',
        },
      })
    }

    // .ts segments — stream through
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': ct || 'video/mp2t',
        'cache-control': 'no-cache',
        'access-control-allow-origin': '*',
      },
    })
  } catch {
    return new NextResponse('HLS upstream unavailable', { status: 502 })
  }
}

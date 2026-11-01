import { NextRequest, NextResponse } from 'next/server'
import http from 'http'
import { Readable } from 'stream'
import { STUDIO_BASE, STUDIO_TOKEN, fetchWebinarConfig, webinarPhase } from '@/lib/webinar'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PASS_THROUGH = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified']

// Streams the webinar video from the studio. Only the currently configured
// webinar file can be requested, and only while the webinar window is open.
export async function GET(request: NextRequest) {
  const webinar = await fetchWebinarConfig()
  if (!webinar) {
    return NextResponse.json({ error: 'Kein Webinar konfiguriert' }, { status: 404 })
  }

  const phase = webinarPhase(webinar, Date.now())
  if (phase !== 'live') {
    return NextResponse.json(
      { error: phase === 'before' ? 'Webinar hat noch nicht begonnen' : 'Webinar ist beendet' },
      { status: 403 },
    )
  }

  const target = new URL(`/api/files/${encodeURIComponent(webinar.filename)}/stream`, STUDIO_BASE + '/')
  const range = request.headers.get('range')

  const headers: Record<string, string> = { authorization: `Bearer ${STUDIO_TOKEN}` }
  if (range) headers.range = range

  return new Promise<NextResponse>((resolve) => {
    const req = http.request(
      {
        hostname: target.hostname,
        port: Number(target.port) || 3500,
        path: target.pathname + target.search,
        method: 'GET',
        headers,
      },
      (upstream) => {
        const outHeaders = new Headers()
        for (const name of PASS_THROUGH) {
          const value = upstream.headers[name]
          if (value) outHeaders.set(name, Array.isArray(value) ? value.join(', ') : value)
        }
        outHeaders.set('cache-control', 'no-store, max-age=0')
        if (!outHeaders.get('accept-ranges')) outHeaders.set('accept-ranges', 'bytes')

        const body = Readable.toWeb(upstream) as unknown as ReadableStream
        resolve(new NextResponse(body, { status: upstream.statusCode ?? 502, headers: outHeaders }))
      },
    )
    req.on('error', () => {
      resolve(NextResponse.json({ error: 'Video nicht verfügbar' }, { status: 502 }))
    })
    req.end()
  })
}

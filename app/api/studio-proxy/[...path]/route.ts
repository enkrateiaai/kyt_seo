import { NextRequest, NextResponse } from 'next/server'
import http from 'http'
import { Readable } from 'stream'
import { auth } from '@clerk/nextjs/server'
import { hasClerkServerConfig } from '@/lib/authConfig'
import { getViewerUser, isAdminUser } from '@/lib/memberAccess'

export const maxDuration = 300

const STUDIO_BASE = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
const STUDIO_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

// This proxy injects the studio API token, so it is as powerful as the studio
// itself: it can list and delete media, read the schedule and start streams.
// Only studio admins may use it - without this check the endpoint was open
// to anyone and handed out the studio token on every call.
async function requireAdmin(): Promise<NextResponse | null> {
  if (!hasClerkServerConfig()) {
    return NextResponse.json({ error: 'Auth nicht konfiguriert' }, { status: 503 })
  }
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getViewerUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

function nodeProxy(request: NextRequest, joined: string): Promise<NextResponse> {
  return new Promise((resolve) => {
    const target = new URL(joined, STUDIO_BASE + '/')
    request.nextUrl.searchParams.forEach((v, k) => target.searchParams.append(k, v))

    const reqHeaders: Record<string, string> = {}
    request.headers.forEach((v, k) => { if (k !== 'host') reqHeaders[k] = v })
    reqHeaders['authorization'] = `Bearer ${STUDIO_TOKEN}`

    const proxyReq = http.request(
      { hostname: target.hostname, port: Number(target.port) || 3500, path: target.pathname + target.search, method: request.method, headers: reqHeaders },
      (proxyRes) => {
        const chunks: Buffer[] = []
        proxyRes.on('data', (c: Buffer) => chunks.push(c))
        proxyRes.on('end', () => {
          const body = Buffer.concat(chunks)
          const resHeaders = new Headers()
          Object.entries(proxyRes.headers).forEach(([k, v]) => {
            if (v) resHeaders.set(k, Array.isArray(v) ? v.join(', ') : v)
          })
          resHeaders.set('cache-control', 'no-store, max-age=0')
          resolve(new NextResponse(body, { status: proxyRes.statusCode ?? 502, headers: resHeaders }))
        })
        proxyRes.on('error', () => resolve(new NextResponse('Upstream error', { status: 502 })))
      }
    )

    proxyReq.on('error', () => resolve(new NextResponse('Studio proxy unavailable', { status: 502 })))

    if (request.body) {
      Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]).pipe(proxyReq)
    } else {
      proxyReq.end()
    }
  })
}

async function streamProxy(request: NextRequest, joined: string): Promise<NextResponse> {
  const target = new URL(joined, STUDIO_BASE + '/')
  request.nextUrl.searchParams.forEach((v, k) => target.searchParams.append(k, v))
  const reqHeaders: Record<string, string> = { authorization: `Bearer ${STUDIO_TOKEN}` }
  request.headers.forEach((v, k) => { if (k !== 'host') reqHeaders[k] = v })
  try {
    const upstream = await fetch(target.toString(), { method: request.method, headers: reqHeaders, cache: 'no-store' })
    const resHeaders = new Headers()
    upstream.headers.forEach((v, k) => { if (!['transfer-encoding'].includes(k)) resHeaders.set(k, v) })
    resHeaders.set('cache-control', 'no-store')
    return new NextResponse(upstream.body, { status: upstream.status, headers: resHeaders })
  } catch {
    return new NextResponse('Stream unavailable', { status: 502 })
  }
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { path } = await context.params
  const joined = Array.isArray(path) ? path.join('/') : ''
  if (joined.endsWith('/stream') || joined.endsWith('/thumbnail')) return streamProxy(request, joined)
  return nodeProxy(request, joined)
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx) }
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx) }
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx) }
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx) }

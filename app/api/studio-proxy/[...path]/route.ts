import { NextRequest, NextResponse } from 'next/server'

const STUDIO_BASE = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
const STUDIO_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const joined = Array.isArray(path) ? path.join('/') : ''
  const target = new URL(joined, STUDIO_BASE + '/')

  request.nextUrl.searchParams.forEach((v, k) => target.searchParams.append(k, v))

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.set('Authorization', `Bearer ${STUDIO_TOKEN}`)

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      // @ts-ignore – needed for streaming body
      duplex: 'half',
      redirect: 'manual',
      cache: 'no-store',
    })

    const responseHeaders = new Headers(upstream.headers)
    responseHeaders.set('cache-control', 'no-store, max-age=0')
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch {
    return new NextResponse('Studio proxy unavailable', { status: 502 })
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx) }
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx) }
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx) }
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx) }

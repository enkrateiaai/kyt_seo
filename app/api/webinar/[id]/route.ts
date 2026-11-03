import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { hasClerkServerConfig } from '@/lib/authConfig'
import { getViewerUser, isAdminUser } from '@/lib/memberAccess'
import { STUDIO_BASE, STUDIO_TOKEN } from '@/lib/webinar'
import redis from '@/lib/redis'

export const dynamic = 'force-dynamic'

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

// Admin: one slot including how many people registered for it.
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await context.params
  let registrations = 0
  try {
    registrations = await redis.scard(`webinar:reg:slots:${id}`)
  } catch {
    registrations = 0
  }

  return NextResponse.json(
    { id, registrations },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}

// Admin: update a scheduled webinar.
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await context.params
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  try {
    const res = await fetch(`${STUDIO_BASE}/api/webinar/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${STUDIO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const text = await res.text()
    return new NextResponse(text || JSON.stringify({ ok: res.ok }), {
      status: res.status,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0' },
    })
  } catch {
    return NextResponse.json({ error: 'Studio nicht erreichbar' }, { status: 502 })
  }
}

// Admin: remove one scheduled webinar.
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await context.params
  try {
    const res = await fetch(`${STUDIO_BASE}/api/webinar/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${STUDIO_TOKEN}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    const text = await res.text()
    return new NextResponse(text || JSON.stringify({ ok: res.ok }), {
      status: res.status,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0' },
    })
  } catch {
    return NextResponse.json({ error: 'Studio nicht erreichbar' }, { status: 502 })
  }
}

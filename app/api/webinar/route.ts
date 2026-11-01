import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { hasClerkServerConfig } from '@/lib/authConfig'
import { getViewerUser, isAdminUser } from '@/lib/memberAccess'
import {
  STUDIO_BASE,
  STUDIO_TOKEN,
  fetchWebinars,
  pickLiveWebinar,
  pickNextWebinar,
} from '@/lib/webinar'

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

// Public: the webinar page itself is not protected.
export async function GET() {
  const now = Date.now()
  const webinars = await fetchWebinars()
  const live = pickLiveWebinar(webinars, now)
  const next = pickNextWebinar(webinars, now)
  return NextResponse.json(
    {
      webinars,
      active: live,
      next,
      phase: live ? 'live' : next ? 'before' : 'none',
      serverNow: now,
    },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  )
}

// Admin: schedule a new webinar.
export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  try {
    const res = await fetch(`${STUDIO_BASE}/api/webinar`, {
      method: 'POST',
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

// Admin: remove all scheduled webinars.
export async function DELETE() {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const res = await fetch(`${STUDIO_BASE}/api/webinar`, {
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

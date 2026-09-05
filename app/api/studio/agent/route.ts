import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const STUDIO_BASE = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
const STUDIO_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

/**
 * LLM/Agent API for Enkra Studio.
 *
 * GET  /api/studio/agent?action=info
 *   → numbered video list, active stream, scheduled jobs
 *
 * POST /api/studio/agent
 *   Body: { action: "schedule", video: "#1"|"filename.mov", date: "2026-09-07", time: "07:00" }
 *   Body: { action: "cancel",   jobId: "abc12345" }
 *   Body: { action: "start",    video: "#1"|"filename.mov" }
 *   Body: { action: "stop" }
 *
 * Requires Clerk authentication (any signed-in user with admin role).
 */

async function flaskFetch(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${STUDIO_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${STUDIO_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  return res
}

async function checkAdmin() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return false
  const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>
  return meta.role === 'admin'
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const r = await flaskFetch('/api/agent/info')
  const data = await r.json()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const action = body.action as string

  if (action === 'schedule') {
    const r = await flaskFetch('/api/agent/schedule', 'POST', { video: body.video, date: body.date, time: body.time })
    return NextResponse.json(await r.json(), { status: r.status })
  }

  if (action === 'cancel') {
    const r = await flaskFetch(`/api/stream/schedule/${body.jobId}`, 'DELETE')
    return NextResponse.json(await r.json(), { status: r.status })
  }

  if (action === 'start') {
    const r = await flaskFetch('/api/agent/schedule', 'POST', { video: body.video, streamNow: true, date: new Date().toISOString().slice(0, 10), time: '00:00' })
    return NextResponse.json(await r.json(), { status: r.status })
  }

  if (action === 'stop') {
    const r = await flaskFetch('/api/stream/stop', 'POST')
    return NextResponse.json(await r.json(), { status: r.status })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

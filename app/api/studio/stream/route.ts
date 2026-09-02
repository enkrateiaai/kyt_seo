import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'

const API_URL = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
const API_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

async function assertAdmin() {
  const { userId } = await auth()
  if (!userId) return false
  const user = await currentUser()
  return (user?.publicMetadata as any)?.role === 'admin'
}

const headers = { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' }

export async function GET() {
  if (!await assertAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const res = await fetch(`${API_URL}/api/stream/status`, { headers, cache: 'no-store' })
  return Response.json(await res.json(), { status: res.status })
}

export async function POST(req: NextRequest) {
  if (!await assertAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { action, filename, streamKey, datetime } = body

  if (action === 'start') {
    const res = await fetch(`${API_URL}/api/stream/start`, {
      method: 'POST', headers, body: JSON.stringify({ filename, streamKey }),
    })
    return Response.json(await res.json(), { status: res.status })
  }
  if (action === 'stop') {
    const res = await fetch(`${API_URL}/api/stream/stop`, { method: 'POST', headers, body: '{}' })
    return Response.json(await res.json(), { status: res.status })
  }
  if (action === 'schedule') {
    const res = await fetch(`${API_URL}/api/stream/schedule`, {
      method: 'POST', headers, body: JSON.stringify({ filename, streamKey, datetime }),
    })
    return Response.json(await res.json(), { status: res.status })
  }
  if (action === 'cancel') {
    const { jobId } = body
    const res = await fetch(`${API_URL}/api/stream/schedule/${jobId}`, { method: 'DELETE', headers })
    return Response.json(await res.json(), { status: res.status })
  }
  return Response.json({ error: 'unknown action' }, { status: 400 })
}

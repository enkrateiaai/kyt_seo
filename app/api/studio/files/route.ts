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

export async function GET() {
  if (!await assertAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const res = await fetch(`${API_URL}/api/files`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
    cache: 'no-store',
  })
  return Response.json(await res.json(), { status: res.status })
}

export async function DELETE(req: NextRequest) {
  if (!await assertAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  if (!name) return Response.json({ error: 'name required' }, { status: 400 })
  const res = await fetch(`${API_URL}/api/files/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  })
  return Response.json(await res.json(), { status: res.status })
}

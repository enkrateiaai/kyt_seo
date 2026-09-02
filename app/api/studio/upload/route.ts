import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'

export const maxDuration = 300

const API_URL = process.env.STUDIO_API_URL ?? 'http://100.117.19.15:3500'
const API_TOKEN = process.env.STUDIO_API_TOKEN ?? ''

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const user = await currentUser()
  if ((user?.publicMetadata as any)?.role !== 'admin')
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const contentType = req.headers.get('content-type') ?? ''
  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': contentType },
    // @ts-ignore – duplex required for streaming body in Node fetch
    body: req.body,
    duplex: 'half',
  })
  return Response.json(await res.json(), { status: res.status })
}

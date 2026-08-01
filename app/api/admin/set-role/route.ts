import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getViewerUser, isAdminUser } from '@/lib/memberAccess'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getViewerUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { targetUserId, role } = await req.json()
  if (!targetUserId || !role) return NextResponse.json({ error: 'targetUserId and role required' }, { status: 400 })

  const client = await clerkClient()
  const target = await client.users.getUser(targetUserId)
  const existing = target.publicMetadata && typeof target.publicMetadata === 'object'
    ? target.publicMetadata
    : {}

  await client.users.updateUserMetadata(targetUserId, {
    publicMetadata: { ...existing, role },
  })

  return NextResponse.json({ ok: true })
}

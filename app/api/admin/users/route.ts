import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await clerkClient()
  const caller = await client.users.getUser(userId)
  if ((caller.publicMetadata as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await client.users.getUserList({ limit: 500, orderBy: '-created_at' })
  const users = result.data.map(u => ({
    id: u.id,
    email: u.emailAddresses[0]?.emailAddress ?? '',
    firstName: u.firstName,
    lastName: u.lastName,
    role: (u.publicMetadata as any)?.role ?? null,
    group: (u.publicMetadata as any)?.group ?? null,
    createdAt: u.createdAt,
    lastSignInAt: u.lastSignInAt,
    banned: u.banned,
  }))

  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await clerkClient()
  const caller = await client.users.getUser(userId)
  if ((caller.publicMetadata as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { targetUserId, role, group } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })

  const target = await client.users.getUser(targetUserId)
  const existing = { ...(target.publicMetadata as any) }

  if (role === null) {
    delete existing.role
  } else if (role !== undefined) {
    existing.role = role
  }
  if (group === null) {
    delete existing.group
  } else if (group !== undefined) {
    existing.group = group
  }

  await client.users.updateUserMetadata(targetUserId, { publicMetadata: existing })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await clerkClient()
  const caller = await client.users.getUser(userId)
  if ((caller.publicMetadata as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
  if (targetUserId === userId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  await client.users.banUser(targetUserId)
  await client.users.deleteUser(targetUserId)
  return NextResponse.json({ ok: true })
}

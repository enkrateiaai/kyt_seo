import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import redis from '@/lib/redis'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await clerkClient()
  const caller = await client.users.getUser(userId)
  if ((caller.publicMetadata as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const raw = await redis.get('invites')
  const invites: any[] = raw ? JSON.parse(raw as string) : []
  // Return newest first
  return NextResponse.json(invites.slice().reverse())
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await clerkClient()
  const caller = await client.users.getUser(userId)
  if ((caller.publicMetadata as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await req.json()
  const raw = await redis.get('invites')
  const invites: any[] = raw ? JSON.parse(raw as string) : []
  const invite = invites.find((i: any) => i.id === id)

  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Revoke Clerk invitation if applicable
  if (invite.clerkInvitationId) {
    try {
      await client.invitations.revokeInvitation(invite.clerkInvitationId)
    } catch (e) {
      console.warn('[revoke] Clerk revoke failed (may already be consumed):', e)
    }
  }

  const updated = invites.map((i: any) =>
    i.id === id ? { ...i, status: 'revoked', revokedAt: new Date().toISOString() } : i
  )
  await redis.set('invites', JSON.stringify(updated))

  return NextResponse.json({ ok: true })
}

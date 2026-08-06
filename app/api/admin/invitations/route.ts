import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getViewerUser, isAdminUser } from '@/lib/memberAccess'

async function guardAdmin() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getViewerUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export async function GET() {
  const err = await guardAdmin()
  if (err) return err

  const client = await clerkClient()
  const result = await client.invitations.getInvitationList({ status: 'pending', limit: 100 })

  const invitations = result.data.map((inv) => ({
    id: inv.id,
    emailAddress: inv.emailAddress,
    createdAt: inv.createdAt,
    role: (inv.publicMetadata as { role?: string })?.role ?? null,
  }))

  return NextResponse.json(invitations)
}

export async function DELETE(req: NextRequest) {
  const err = await guardAdmin()
  if (err) return err

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const client = await clerkClient()
  await client.invitations.revokeInvitation(id)

  return NextResponse.json({ ok: true })
}

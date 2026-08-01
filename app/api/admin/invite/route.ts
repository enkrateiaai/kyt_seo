import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getViewerUser, isAdminUser } from '@/lib/memberAccess'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getViewerUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role } = await req.json()
  if (!email || !role) return NextResponse.json({ error: 'email and role required' }, { status: 400 })

  const client = await clerkClient()

  // Delete existing user first to clear sessions
  const existing = await client.users.getUserList({ emailAddress: [email] })
  if (existing.data[0]) {
    await client.users.deleteUser(existing.data[0].id)
  }

  const invitation = await client.invitations.createInvitation({
    emailAddress: email,
    publicMetadata: { role },
    redirectUrl: 'https://kundaliniyogatribe.de/sign-up',
    ignoreExisting: true,
  })

  return NextResponse.json({ ok: true, id: invitation.id })
}

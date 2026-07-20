import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import redis from '@/lib/redis'
import crypto from 'crypto'
import { Resend } from 'resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.kundaliniyogatribe.de'
const resend = new Resend(process.env.RESEND_API_KEY)

async function sendInviteEmail(to: string, token: string) {
  const link = `${APP_URL}/accept-invite?token=${token}`
  await resend.emails.send({
    from: 'Kundalini Yoga Tribe <info@kundaliniyogatribe.de>',
    to,
    subject: 'Du wurdest ins Kundalini Yoga Tribe eingeladen',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#2a2520;">
        <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#b89654;margin-bottom:16px;">
          Kundalini Yoga Tribe
        </p>
        <h1 style="font-size:28px;font-weight:300;font-family:Georgia,serif;margin-bottom:16px;">
          Du wurdest eingeladen
        </h1>
        <p style="font-size:16px;line-height:1.7;color:#6b5d4f;margin-bottom:32px;">
          Du hast bereits einen Account. Klicke unten, um deine Einladung anzunehmen und
          Zugang zum exklusiven Mitgliederbereich zu erhalten.
        </p>
        <a href="${link}" style="display:inline-block;background:#2a2520;color:#fbf8f1;
           text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;">
          Einladung annehmen →
        </a>
        <p style="font-size:12px;color:#9b8e7e;margin-top:32px;">
          Dieser Link ist 7 Tage gültig.<br>
          Falls du diese E-Mail nicht erwartet hast, kannst du sie ignorieren.
        </p>
      </div>
    `,
  })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await clerkClient()
  const caller = await client.users.getUser(userId)
  if ((caller.publicMetadata as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  let body: { email?: string; role?: string; group?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const role = body.role === 'admin' ? 'admin' : 'member'
  const group = body.group === 'mit-lives' ? 'mit-lives' : 'ohne-lives'
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const inviteId = crypto.randomUUID()

  // Check if email already exists in Clerk
  const existing = await client.users.getUserList({ emailAddress: [email] })
  const existingUser = existing.data[0]

  const raw = await redis.get('invites')
  const invites: any[] = raw ? JSON.parse(raw as string) : []

  // Reject duplicate pending invite
  const duplicate = invites.find((i: any) => i.email === email && i.status === 'pending')
  if (duplicate) {
    return NextResponse.json({ error: 'Pending invite already exists for this email' }, { status: 409 })
  }

  if (existingUser) {
    // Flow B: existing Clerk user — set role directly + send custom email with token
    const token = crypto.randomUUID()
    await redis.set(`invite:token:${token}`, JSON.stringify({ inviteId, userId: existingUser.id, role, group }), 'EX', 60 * 60 * 24 * 7)

    await sendInviteEmail(email, token)

    invites.push({
      id: inviteId,
      email,
      role,
      group,
      type: 'in-app',
      status: 'pending',
      invitedBy: userId,
      clerkUserId: existingUser.id,
      createdAt: new Date().toISOString(),
    })
    await redis.set('invites', JSON.stringify(invites))

    return NextResponse.json({ ok: true, flow: 'in-app', email })
  }

  // Flow A: new user — Clerk sends the invite email
  let clerkInvitation: any
  try {
    clerkInvitation = await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${APP_URL}/accept-invite`,
      publicMetadata: { role, group, inviteId },
    })
  } catch (err: any) {
    console.error('[invite] Clerk invitation error:', err)
    return NextResponse.json({ error: err?.errors?.[0]?.message || 'Clerk invitation failed' }, { status: 500 })
  }

  invites.push({
    id: inviteId,
    email,
    role,
    group,
    type: 'clerk',
    status: 'pending',
    invitedBy: userId,
    clerkInvitationId: clerkInvitation.id,
    createdAt: new Date().toISOString(),
  })
  await redis.set('invites', JSON.stringify(invites))

  return NextResponse.json({ ok: true, flow: 'clerk', email, clerkInvitationId: clerkInvitation.id })
}

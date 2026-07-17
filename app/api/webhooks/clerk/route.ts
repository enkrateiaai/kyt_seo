import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import redis from '@/lib/redis'

type ClerkEvent = {
  type: string
  data: {
    id: string
    email_addresses: { email_address: string }[]
    public_metadata: { role?: string; inviteId?: string }
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_SIGNING_SECRET
  if (!secret) {
    console.error('[webhook] CLERK_SIGNING_SECRET not set')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const body = await req.text()
  const headers = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }

  let evt: ClerkEvent
  try {
    evt = new Webhook(secret).verify(body, headers) as ClerkEvent
  } catch (err) {
    console.error('[webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (evt.type === 'user.created') {
    const userId = evt.data.id
    const email = evt.data.email_addresses[0]?.email_address
    const inviteId = evt.data.public_metadata?.inviteId

    console.log(`[webhook] user.created ${userId} ${email} inviteId=${inviteId}`)

    if (inviteId) {
      const raw = await redis.get('invites')
      const invites: any[] = raw ? JSON.parse(raw as string) : []
      const updated = invites.map((inv: any) =>
        inv.id === inviteId ? { ...inv, status: 'accepted', acceptedAt: new Date().toISOString(), clerkUserId: userId } : inv
      )
      await redis.set('invites', JSON.stringify(updated))
    }
  }

  if (evt.type === 'user.deleted') {
    console.log(`[webhook] user.deleted ${evt.data.id}`)
  }

  return NextResponse.json({ received: true })
}

import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

const CLAIM_LINK_PREFIX = 'claim-link:'
const EXPIRES_IN_HOURS = 168
const EXPIRES_IN_SECONDS = EXPIRES_IN_HOURS * 60 * 60

export async function POST(request: NextRequest) {
  const secret = process.env.CLAIM_LINK_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'CLAIM_LINK_SECRET not configured' }, { status: 500 })
  }

  let body: { email?: string; customerRef?: string; targetGroup?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const customerRef = body.customerRef?.trim()
  const targetGroup = body.targetGroup?.trim()

  if (!email && !customerRef) {
    return NextResponse.json({ error: 'Provide email or customerRef' }, { status: 400 })
  }

  const token = crypto.randomUUID()
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + EXPIRES_IN_SECONDS * 1000)
  const payload = JSON.stringify({
    email: email || undefined,
    customerRef: customerRef || undefined,
    targetGroup: targetGroup || undefined,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  })
  await redis.setex(`${CLAIM_LINK_PREFIX}${token}`, EXPIRES_IN_SECONDS, payload)

  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin || 'http://localhost:3000'
  const claimUrl = `${origin.replace(/\/$/, '')}/claim?token=${encodeURIComponent(token)}`

  return NextResponse.json({
    success: true,
    email: email || null,
    customerRef: customerRef || null,
    targetGroup: targetGroup || null,
    claimUrl,
    expiresInHours: EXPIRES_IN_HOURS,
  })
}

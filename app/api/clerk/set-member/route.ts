import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * POST /api/clerk/set-member
 * Called from shop automation (n8n / Zapier / Make / etc.) after purchase.
 *
 * Body (JSON):
 *   { "email": "user@example.com", "secret": "your-secret" }
 *   OR
 *   { "userId": "user_abc123", "secret": "your-secret" }
 *
 * Sets publicMetadata.role = 'member' on the matching Clerk user.
 * Requires CLERK_WEBHOOK_SECRET env var to be set in Vercel.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET?.trim()

  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  let body: { email?: string; userId?: string; secret?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate secret
  if (body.secret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await clerkClient()

  try {
    let userId = body.userId

    // Look up by email if userId not provided
    if (!userId && body.email) {
      const users = await client.users.getUserList({ emailAddress: [body.email] })
      const user = users.data[0]
      if (!user) {
        return NextResponse.json({ error: 'User not found', email: body.email }, { status: 404 })
      }
      userId = user.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'Provide email or userId' }, { status: 400 })
    }

    // Set role to member
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: 'member' },
    })

    return NextResponse.json({ success: true, userId })
  } catch (e: any) {
    console.error('Clerk set-member error:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

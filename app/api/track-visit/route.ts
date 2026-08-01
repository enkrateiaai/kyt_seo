import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const existing = user.unsafeMetadata && typeof user.unsafeMetadata === 'object'
    ? user.unsafeMetadata
    : {}

  await client.users.updateUser(userId, {
    unsafeMetadata: {
      ...existing,
      lastSeen: new Date().toISOString(),
    },
  })

  return NextResponse.json({ ok: true })
}

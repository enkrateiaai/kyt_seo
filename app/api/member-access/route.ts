import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ isMember: false })
  }

  const secretKey = process.env.CLERK_SECRET_KEY?.trim()
  if (!secretKey) {
    return NextResponse.json({ isMember: false }, { status: 500 })
  }

  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ isMember: false }, { status: response.status })
    }

    const user = (await response.json()) as {
      publicMetadata?: {
        role?: string
      }
    }

    return NextResponse.json({ isMember: user.publicMetadata?.role === 'member' })
  } catch {
    return NextResponse.json({ isMember: false }, { status: 502 })
  }
}

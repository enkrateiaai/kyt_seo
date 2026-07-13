import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getViewerUser, hasLiveAccess, hasVideoAccess } from '@/lib/memberAccess'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ isMember: false, canAccessLive: false })
  }

  try {
    const user = await getViewerUser()
    return NextResponse.json({
      isMember: hasVideoAccess(user),
      canAccessLive: hasLiveAccess(user),
    })
  } catch {
    return NextResponse.json({ isMember: false, canAccessLive: false }, { status: 502 })
  }
}

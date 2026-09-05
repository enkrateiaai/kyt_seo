import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const DIRECT_URL = 'https://enkra.tail1049ba.ts.net:3501'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await currentUser()
  if ((user?.publicMetadata as any)?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ url: DIRECT_URL, token: process.env.STUDIO_API_TOKEN ?? '' })
}

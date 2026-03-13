import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  
  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50',
    {
      headers: {
        Authorization: 'Bearer ' + (session as any).accessToken,
      }
    }
  )

  const data = await res.json()
  return NextResponse.json(data)
}

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const playlistId = req.nextUrl.searchParams.get('playlistId')?.trim()
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

  if (!playlistId) {
    return NextResponse.json({ error: 'playlistId is required' }, { status: 400 })
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=200&playlistId=${encodeURIComponent(playlistId)}&key=${apiKey}`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch playlist items from YouTube' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch playlist items' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

const CHANNEL_ID = 'UCzwnk2edclACo1lTwhp5VMQ'

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${CHANNEL_ID}&maxResults=50&key=${apiKey}`,
      { next: { revalidate: 300 } }
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 })
  }
}

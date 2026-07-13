import { NextResponse } from 'next/server'

const REMOTE_STATUS_URL = 'http://72.61.94.93:9999/api/streams'

type RemoteStream = {
  app?: string
  name?: string
  url?: string
  publish?: {
    active?: boolean
  }
}

export async function GET() {
  try {
    const response = await fetch(REMOTE_STATUS_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return NextResponse.json({ live: false, error: `upstream_${response.status}` }, { status: 502 })
    }

    const payload = (await response.json()) as { streams?: RemoteStream[] }
    const streams = Array.isArray(payload.streams) ? payload.streams : []
    const live = streams.some((stream) => {
      const appMatches = stream.app === 'live'
      const nameMatches = stream.name === 'stream' || stream.name === 'stream.m3u8'
      const urlMatches = stream.url === '/live/stream'
      return appMatches && (nameMatches || urlMatches) && Boolean(stream.publish?.active)
    })

    return NextResponse.json({ live }, { headers: { 'cache-control': 'no-store, max-age=0' } })
  } catch {
    return NextResponse.json({ live: false, error: 'upstream_unreachable' }, { status: 502 })
  }
}

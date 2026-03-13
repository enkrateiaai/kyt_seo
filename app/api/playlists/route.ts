import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

export async function GET() {
  const data = await redis.get('playlists')
  const playlists = data ? JSON.parse(data as string) : []
  return NextResponse.json(playlists)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = await redis.get('playlists')
  const playlists = data ? JSON.parse(data as string) : []
  playlists.push({ id: Date.now(), title: body.title, playlistId: body.playlistId })
  await redis.set('playlists', JSON.stringify(playlists))
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const data = await redis.get('playlists')
  const playlists = data ? JSON.parse(data as string) : []
  const updated = playlists.map((p: any) =>
    p.id === body.id ? { ...p, title: body.title, playlistId: body.playlistId } : p
  )
  await redis.set('playlists', JSON.stringify(updated))
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  await redis.set('playlists', JSON.stringify(body))
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const data = await redis.get('playlists')
  const playlists = data ? JSON.parse(data as string) : []
  const updated = playlists.filter((p: any) => p.id !== id)
  await redis.set('playlists', JSON.stringify(updated))
  return NextResponse.json({ ok: true })
}

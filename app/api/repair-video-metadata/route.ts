import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

const SECRET = process.env.PROCESS_SECRET || 'kyt-process-2024'

type Item = {
  videoId?: string
  title?: string
  slug?: string
}

export async function POST(req: NextRequest) {
  const { secret, items } = await req.json().catch(() => ({}))

  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!Array.isArray(items) || !items.length) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 })
  }

  const updated: Array<{ videoId: string; title?: string; slug?: string }> = []
  const skipped: Array<{ videoId: string; reason: string }> = []

  for (const rawItem of items as Item[]) {
    const videoId = rawItem?.videoId?.trim()
    const title = rawItem?.title?.trim()
    const slug = rawItem?.slug?.trim()

    if (!videoId) {
      skipped.push({ videoId: 'unknown', reason: 'missing-video-id' })
      continue
    }

    if (title) {
      await redis.set(`title:${videoId}`, title)
    }

    if (slug) {
      await redis.set(`slug:${slug}`, videoId)
      await redis.set(`vidslug:${videoId}`, slug)
    }

    updated.push({ videoId, title, slug })
  }

  return NextResponse.json({ ok: true, updated, skipped })
}

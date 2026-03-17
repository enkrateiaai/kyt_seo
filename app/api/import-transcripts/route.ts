import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

const SECRET = process.env.PROCESS_SECRET || 'kyt-process-2024'

type TranscriptItem = {
  videoId?: string
  title?: string
  transcript?: string
}

export async function POST(req: NextRequest) {
  const { secret, items } = await req.json().catch(() => ({}))

  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!Array.isArray(items) || !items.length) {
    return NextResponse.json({ error: 'No transcript items provided' }, { status: 400 })
  }

  const imported: Array<{ videoId: string; title?: string }> = []
  const skipped: Array<{ videoId: string; reason: string }> = []

  for (const rawItem of items as TranscriptItem[]) {
    const videoId = rawItem?.videoId?.trim()
    const transcript = rawItem?.transcript?.trim()
    const title = rawItem?.title?.trim()

    if (!videoId || !transcript) {
      skipped.push({ videoId: videoId || 'unknown', reason: 'missing-data' })
      continue
    }

    const transcriptKey = `transcript:${videoId}`
    if (await redis.exists(transcriptKey)) {
      skipped.push({ videoId, reason: 'already-exists' })
      continue
    }

    await redis.set(transcriptKey, transcript)
    if (title) {
      await redis.set(`title:${videoId}`, title)
    }

    imported.push({ videoId, title })
  }

  return NextResponse.json({
    ok: true,
    importedCount: imported.length,
    skippedCount: skipped.length,
    imported,
    skipped,
  })
}

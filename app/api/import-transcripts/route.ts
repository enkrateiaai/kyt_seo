import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

const SECRET = process.env.PROCESS_SECRET || 'kyt-process-2024'

type TranscriptItem = {
  videoId?: string
  title?: string
  transcript?: string
}

export async function POST(req: NextRequest) {
  const { secret, items, overwrite } = await req.json().catch(() => ({}))

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
    const rawTitle = rawItem?.title?.trim()

    if (!videoId || !transcript) {
      skipped.push({ videoId: videoId || 'unknown', reason: 'missing-data' })
      continue
    }

    const transcriptKey = `transcript:${videoId}`
    if (!overwrite && await redis.exists(transcriptKey)) {
      skipped.push({ videoId, reason: 'already-exists' })
      continue
    }

    await redis.set(transcriptKey, transcript)
    const title = await resolveTitle(videoId, rawTitle)
    if (title) {
      await redis.set(`title:${videoId}`, title)
      await ensureSlug(videoId, title)
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

async function resolveTitle(videoId: string, candidate?: string) {
  if (isUsableTitle(candidate)) return candidate

  const existing = await redis.get(`title:${videoId}`)
  if (isUsableTitle(existing as string | null | undefined)) return existing as string

  const fetched = await fetchVideoTitle(videoId)
  if (isUsableTitle(fetched)) return fetched

  return undefined
}

function isUsableTitle(title?: string | null) {
  if (!title) return false
  const value = title.trim()
  if (value.length < 6) return false
  if (/^[0-9xXhHsS-]+$/.test(value)) return false
  return true
}

async function fetchVideoTitle(videoId: string) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return undefined
    const data = await res.json()
    return typeof data?.title === 'string' ? data.title.trim() : undefined
  } catch {
    return undefined
  }
}

async function ensureSlug(videoId: string, title: string) {
  const existingSlug = await redis.get(`vidslug:${videoId}`)
  if (existingSlug) return existingSlug as string

  const baseSlug = slugify(title) || videoId.toLowerCase()
  const uniqueSlug = await makeUniqueSlug(baseSlug)
  await redis.set(`vidslug:${videoId}`, uniqueSlug)
  await redis.set(`slug:${uniqueSlug}`, videoId)
  return uniqueSlug
}

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80).replace(/^-|-$/g, '')
}

async function makeUniqueSlug(baseSlug: string) {
  let slug = baseSlug
  let counter = 2
  while (await redis.exists(`slug:${slug}`)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }
  return slug
}

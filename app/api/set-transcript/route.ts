import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

const SECRET = process.env.PROCESS_SECRET || 'kyt-process-2024'

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80).replace(/^-|-$/g, '')
}

async function makeUniqueSlug(base: string, excludeVideoId?: string): Promise<string> {
  let slug = base, counter = 1
  while (true) {
    const existing = await redis.get(`slug:${slug}`)
    if (!existing || existing === excludeVideoId) break
    slug = `${base}-${counter++}`
  }
  return slug
}

// POST /api/set-transcript
// Body: { secret, videoId, transcript?, title?, forceSlug? }
// Sets transcript and/or title in Redis. If forceSlug=true, regenerates slug from title.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { secret, videoId, transcript, title, forceSlug } = body

  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId' }, { status: 400 })
  }

  const updates: Record<string, string> = {}

  if (transcript) {
    await redis.set(`transcript:${videoId}`, transcript)
    updates.transcript = `${transcript.length} chars`
  }

  if (title) {
    await redis.set(`title:${videoId}`, title)
    updates.title = title
  }

  if (forceSlug && title) {
    const oldSlug = await redis.get(`vidslug:${videoId}`) as string | null
    const newSlug = await makeUniqueSlug(slugify(title), videoId)
    await redis.set(`vidslug:${videoId}`, newSlug)
    await redis.set(`slug:${newSlug}`, videoId)
    if (oldSlug && oldSlug !== newSlug) {
      await redis.del(`slug:${oldSlug}`)
    }
    updates.slug = newSlug
  } else if (title && !await redis.exists(`vidslug:${videoId}`)) {
    const slug = await makeUniqueSlug(slugify(title))
    await redis.set(`vidslug:${videoId}`, slug)
    await redis.set(`slug:${slug}`, videoId)
    updates.slug = slug
  }

  return NextResponse.json({ ok: true, videoId, updates })
}

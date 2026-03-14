import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

export interface SearchResult {
  id: string
  title: string
  thumbnail: string
  excerpt: string
  matchStart: number
  matchEnd: number
}

function getExcerpt(text: string, query: string, contextChars = 140): { excerpt: string; start: number; end: number } {
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return { excerpt: '', start: -1, end: -1 }

  const from = Math.max(0, idx - contextChars / 2)
  const to = Math.min(text.length, idx + query.length + contextChars / 2)

  let excerpt = text.slice(from, to)
  if (from > 0) excerpt = '…' + excerpt
  if (to < text.length) excerpt = excerpt + '…'

  const relStart = (from > 0 ? 1 : 0) + (idx - from)
  const relEnd = relStart + query.length

  return { excerpt, start: relStart, end: relEnd }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  // Find all transcript keys
  let cursor = '0'
  const keys: string[] = []
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', 'transcript:*', 'COUNT', 100)
    cursor = nextCursor
    keys.push(...batch)
  } while (cursor !== '0')

  if (keys.length === 0) return NextResponse.json([])

  // Fetch all transcripts in parallel
  const values = await Promise.all(keys.map(k => redis.get(k)))

  const results: SearchResult[] = []

  for (let i = 0; i < keys.length; i++) {
    const raw = values[i]
    if (!raw) continue

    // Strip HTML tags for searching
    const text = (raw as string).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    const { excerpt, start, end } = getExcerpt(text, q)
    if (start === -1) continue

    const id = keys[i].replace('transcript:', '')
    const customTitle = await redis.get(`title:${id}`)

    results.push({
      id,
      title: (customTitle as string | null) ?? id,
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      excerpt,
      matchStart: start,
      matchEnd: end,
    })
  }

  return NextResponse.json(results)
}

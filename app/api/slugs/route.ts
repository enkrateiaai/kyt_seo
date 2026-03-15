import { NextResponse } from 'next/server'
import redis from '@/lib/redis'

// Returns { videoId: slug } map for all videos that have a slug
export async function GET() {
  const keys = await redis.keys('vidslug:*')
  const result: Record<string, string> = {}
  for (const key of keys) {
    const videoId = key.replace('vidslug:', '')
    const slug = await redis.get(key) as string
    if (slug) result[videoId] = slug
  }
  return NextResponse.json(result)
}

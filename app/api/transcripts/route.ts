import { NextResponse } from 'next/server'
import redis from '@/lib/redis'

export async function GET() {
  let cursor = '0'
  const ids: string[] = []
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', 'transcript:*', 'COUNT', 100)
    cursor = nextCursor
    ids.push(...batch.map((k: string) => k.replace('transcript:', '')))
  } while (cursor !== '0')
  return NextResponse.json(ids)
}

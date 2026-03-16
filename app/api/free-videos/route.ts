import { NextResponse } from 'next/server'
import redis from '@/lib/redis'

// Returns array of free video IDs
export async function GET() {
  const keys = await redis.keys('free:*')
  const freeIds: string[] = []
  for (const key of keys) {
    const val = await redis.get(key)
    if (val === '1' || val === 'true') {
      freeIds.push(key.replace('free:', ''))
    }
  }
  return NextResponse.json(freeIds)
}

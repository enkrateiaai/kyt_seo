import { NextResponse } from 'next/server'
import { FREE_VIDEO_ID } from '@/lib/freeVideo'

// Returns array of free video IDs
export async function GET() {
  return NextResponse.json([FREE_VIDEO_ID])
}

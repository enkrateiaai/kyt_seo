import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

const SECRET = process.env.SANITY_PREVIEW_SECRET || 'kyt-preview-secret'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  if (searchParams.get('secret') !== SECRET) {
    return new Response('Invalid token', { status: 401 })
  }
  const slug = searchParams.get('slug')
  const type = searchParams.get('type') || 'article'
  ;(await draftMode()).enable()
  // If no slug, just return OK — Presentation Tool handles navigation itself
  if (!slug) {
    return new Response('Draft mode enabled', { status: 200 })
  }
  const path = type === 'article' ? `/artikel/${slug}` : `/${slug}`
  redirect(path)
}

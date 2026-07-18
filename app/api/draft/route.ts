import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

const SECRET = process.env.SANITY_PREVIEW_SECRET || 'kyt-preview-secret'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  if (searchParams.get('secret') !== SECRET) {
    return new Response('Invalid token', { status: 401 })
  }
  const slug = searchParams.get('slug') || '/'
  const type = searchParams.get('type') || 'article'
  ;(await draftMode()).enable()
  const path = type === 'article' ? `/artikel/${slug}` : `/${slug}`
  redirect(path)
}

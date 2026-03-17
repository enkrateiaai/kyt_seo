import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function injectAuthAwareMemberLink(html: string, isLoggedIn: boolean): string {
  const memberLink = isLoggedIn
    ? '<li><a href="/sign-out">Log out</a></li>'
    : '<li><a href="/sign-in">Mitglieder</a></li>'

  return html.replace(/<li><a href="\/sign-in">Mitglieder<\/a><\/li>/g, memberLink)
}

export async function serveSatnamHtml(filename: string): Promise<NextResponse> {
  const filePath = path.join(process.cwd(), 'public', 'satnam', filename)
  try {
    const html = fs.readFileSync(filePath, 'utf8')
    const { userId } = await auth()
    const hydratedHtml = injectAuthAwareMemberLink(html, !!userId)

    return new NextResponse(hydratedHtml, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, max-age=0',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}

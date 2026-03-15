import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export function serveSatnamHtml(filename: string): NextResponse {
  const filePath = path.join(process.cwd(), 'public', 'satnam', filename)
  try {
    const html = fs.readFileSync(filePath, 'utf8')
    return new NextResponse(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}

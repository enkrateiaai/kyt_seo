import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const SRS_URL = process.env.SRS_URL ?? 'http://100.117.19.15:8080'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const filePath = path.join('/')
  const upstream = await fetch(`${SRS_URL}/hls/${filePath}`, { cache: 'no-store' })
  const ct = upstream.headers.get('Content-Type') ??
    (filePath.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t')
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

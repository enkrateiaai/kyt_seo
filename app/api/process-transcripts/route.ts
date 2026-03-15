import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

// Secret to protect this endpoint
const SECRET = process.env.PROCESS_SECRET || 'kyt-process-2024'

export async function POST(req: NextRequest) {
  const { secret, dryRun } = await req.json().catch(() => ({}))
  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No YouTube API key' }, { status: 500 })

  // Get playlists from Redis
  const playlistsRaw = await redis.get('playlists')
  const playlists = playlistsRaw ? JSON.parse(playlistsRaw as string) : []

  const results: any[] = []
  let newCount = 0

  for (const playlist of playlists) {
    const videos = await fetchPlaylistVideos(playlist.playlistId, apiKey)
    const playlistResults = []

    for (let i = 0; i < videos.length; i++) {
      const { videoId, title } = videos[i]
      const hasTranscript = await redis.exists(`transcript:${videoId}`)
      
      if (hasTranscript) {
        playlistResults.push({ videoId, status: 'exists' })
        continue
      }

      // Store title if missing
      const existingTitle = await redis.get(`title:${videoId}`)
      if (!existingTitle && !dryRun) await redis.set(`title:${videoId}`, title)

      // Generate slug if missing  
      const hasSlug = await redis.exists(`vidslug:${videoId}`)
      let slug = ''
      if (!hasSlug && !dryRun) {
        slug = await makeUniqueSlug(slugify(title))
        await redis.set(`vidslug:${videoId}`, slug)
        await redis.set(`slug:${slug}`, videoId)
      }

      // Mark first video as free
      if (i === 0 && !dryRun) {
        await redis.set(`free:${videoId}`, '1')
      }

      // Fetch transcript
      const transcript = await fetchTranscript(videoId)
      if (transcript && !dryRun) {
        await redis.set(`transcript:${videoId}`, transcript)
        newCount++
        playlistResults.push({ videoId, title, status: 'new', chars: transcript.length, slug })
      } else {
        playlistResults.push({ videoId, title, status: transcript ? 'dry-run' : 'no-transcript' })
      }
    }
    results.push({ playlist: playlist.title, videos: playlistResults })
  }

  return NextResponse.json({ ok: true, newTranscripts: newCount, results })
}

async function fetchPlaylistVideos(playlistId: string, apiKey: string) {
  const videos: { videoId: string; title: string }[] = []
  let pageToken = ''
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`
    const res = await fetch(url)
    const data = await res.json()
    for (const item of data.items || []) {
      videos.push({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title
      })
    }
    pageToken = data.nextPageToken || ''
  } while (pageToken)
  return videos
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // Try YouTube's internal timedtext API for auto-generated German captions
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept-Language': 'de-DE,de;q=0.9', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const html = await pageRes.text()
    
    // Extract caption URL from page source
    const captionMatch = html.match(/"captionTracks":\[.*?"baseUrl":"([^"]+)"/)
    if (!captionMatch) return null
    
    const captionUrl = captionMatch[1].replace(/\\u0026/g, '&')
    const captionRes = await fetch(captionUrl + '&fmt=vtt')
    if (!captionRes.ok) return null
    
    const vtt = await captionRes.text()
    return vttToText(vtt)
  } catch {
    return null
  }
}

function vttToText(vtt: string): string {
  const lines = vtt.split('\n')
  const seen = new Set<string>()
  const result: string[] = []
  for (const line of lines) {
    const clean = line.trim().replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')
    if (!clean || clean === 'WEBVTT' || clean.includes('-->') || /^\d+$/.test(clean)) continue
    if (!seen.has(clean)) { seen.add(clean); result.push(clean) }
  }
  return result.join(' ')
}

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80).replace(/^-|-$/g, '')
}

async function makeUniqueSlug(base: string): Promise<string> {
  let slug = base, counter = 1
  while (await redis.exists(`slug:${slug}`)) { slug = `${base}-${counter++}` }
  return slug
}

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
    return vttToHtml(vtt)
  } catch {
    return null
  }
}

type Cue = {
  start: number
  end: number
  text: string
}

function vttToHtml(vtt: string): string {
  const blocks = vtt
    .replace(/\r/g, '')
    .split('\n\n')
    .map(block => block.trim())
    .filter(Boolean)

  const cues: Cue[] = []

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

    if (!lines.length || lines[0] === 'WEBVTT') continue

    const timeLineIndex = lines.findIndex(line => line.includes('-->'))
    if (timeLineIndex === -1) continue

    const [rawStart, rawEnd] = lines[timeLineIndex].split('-->').map(part => part.trim().split(' ')[0])
    const start = parseVttTime(rawStart)
    const end = parseVttTime(rawEnd)
    const textLines = lines.slice(timeLineIndex + 1)
    if (!textLines.length) continue

    const text = normalizeCaptionText(textLines.join(' '))
    if (!text) continue

    const previous = cues[cues.length - 1]
    if (previous && previous.text === text) continue

    cues.push({ start, end, text })
  }

  if (!cues.length) return ''

  const paragraphs: string[] = []
  let current: string[] = []
  let previousEnd = 0

  for (const cue of cues) {
    const gap = cue.start - previousEnd
    const currentText = current.join(' ')
    const shouldBreak =
      !current.length
        ? false
        : gap > 1.8 ||
          /[.!?…]$/.test(currentText) ||
          currentText.length > 420

    if (shouldBreak) {
      paragraphs.push(`<p>${escapeHtml(current.join(' '))}</p>`)
      current = []
    }

    current.push(cue.text)
    previousEnd = cue.end
  }

  if (current.length) {
    paragraphs.push(`<p>${escapeHtml(current.join(' '))}</p>`)
  }

  return paragraphs.join('')
}

function normalizeCaptionText(text: string): string {
  return text
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
    .replace(/<\/?c>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseVttTime(value: string): number {
  const match = value.match(/(?:(\d+):)?(\d+):(\d+)\.(\d+)/)
  if (!match) return 0
  const [, hours = '0', minutes = '0', seconds = '0', millis = '0'] = match
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(millis) / 1000
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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

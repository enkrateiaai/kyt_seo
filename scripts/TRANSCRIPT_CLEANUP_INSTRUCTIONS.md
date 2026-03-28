# KYT Transcript Pipeline — Instructions for Claude/Codex

## Overview

When Catherine publishes a new YouTube video, it goes through two stages before the
transcript appears correctly on kundaliniyogatribe.de:

**Stage 1 — Extraction** (automated): fetch the raw auto-generated captions from
YouTube and store them as plain text in Redis.

**Stage 2 — Cleanup** (LLM session): fix spelling/grammar, remove disfluencies,
and wrap in `<p>` tags so it renders correctly on the site.

---

## Stage 1 — Extracting transcripts for new videos

### What runs automatically (VPS nightly at 01:00 CET)

The VPS script `~/kyt_seo/process_videos.py` calls the Vercel endpoint
`/api/process-transcripts`. This endpoint:
- Reads all playlists from Redis (`playlists` key)
- Fetches video IDs from YouTube API for each playlist
- For each new video: stores `title:{videoId}` and `vidslug:{videoId}` in Redis
- Tries to fetch YouTube captions by scraping the video page

**Limitation:** Vercel's server IPs are often blocked by YouTube for caption
scraping, so the nightly job frequently fails to get the transcript text even
though it registers the slug/title correctly.

### What to run manually on Mac (when nightly fails or for immediate pickup)

Run this from the repo root on Viktor's Mac — residential IPs are not blocked:

```bash
python3 scripts/fetch_transcripts.py
```

This script:
1. Reads all playlists from `/api/playlists`
2. Fetches all video IDs from YouTube API
3. Checks which don't have `transcript:{videoId}` in Redis yet
4. Uses `youtube-transcript-api` (prefers German, falls back to any language)
5. Pushes raw transcript text to Redis via `POST /api/set-transcript`

Output shows each video processed and how many chars were stored. Run any time
after Catherine publishes a new video.

**Single video:**
```bash
python3 scripts/fetch_transcripts.py VIDEO_ID
```

### How to check what's been picked up (slugs/titles registered but no transcript)

```python
import redis as redis_lib, requests

r = redis_lib.from_url('redis://default:nkSTGw41uEWtb5vs0WDHPPJ779TDNdKa@redis-15054.crce198.eu-central-1-3.ec2.cloud.redislabs.com:15054')

# All videos in playlists
playlists = requests.get('https://kundaliniyogatribe.de/api/playlists').json()
YOUTUBE_KEY = 'AIzaSyCt0hdTnbK6kgxBbg6G-B1KZmdhSQgb1pI'

for pl in playlists:
    url = f"https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId={pl['playlistId']}&maxResults=50&key={YOUTUBE_KEY}"
    items = requests.get(url).json().get('items', [])
    for item in items:
        vid = item['snippet']['resourceId']['videoId']
        title = item['snippet']['title']
        has_transcript = r.exists(f'transcript:{vid}')
        has_slug = r.exists(f'vidslug:{vid}')
        if not has_transcript:
            slug = r.get(f'vidslug:{vid}')
            slug = slug.decode() if slug else '(no slug yet)'
            print(f"MISSING: {vid} | {title!r} | slug={slug}")
```

---

## Stage 2 — Cleanup (this is what you do after extraction)

kundaliniyogatribe.de renders transcripts as raw HTML on each video's detail page
(`dangerouslySetInnerHTML`), so plain text with newlines won't show paragraphs —
it needs `<p>` tags. Raw auto-generated captions also have errors that need fixing.

---

## How to find which transcripts need cleanup (Stage 2)

```python
import redis as redis_lib

r = redis_lib.from_url('redis://default:nkSTGw41uEWtb5vs0WDHPPJ779TDNdKa@redis-15054.crce198.eu-central-1-3.ec2.cloud.redislabs.com:15054')

keys = r.keys('transcript:*')
for k in keys:
    val = r.get(k).decode()
    vid = k.decode().replace('transcript:', '')
    if '<p>' not in val:
        slug = r.get(f'vidslug:{vid}')
        slug = slug.decode() if slug else vid
        print(f'{vid} ({slug}): {len(val)} chars')
        print(f'  URL: https://kundaliniyogatribe.de/videos/{slug}')
        print(f'  Preview: {val[:120]}')
        print()
```

---

## How to read a transcript

```python
import redis as redis_lib
r = redis_lib.from_url('redis://default:nkSTGw41uEWtb5vs0WDHPPJ779TDNdKa@redis-15054.crce198.eu-central-1-3.ec2.cloud.redislabs.com:15054')
VIDEO_ID = 'REPLACE_WITH_VIDEO_ID'
print(r.get(f'transcript:{VIDEO_ID}').decode())
```

---

## How to store the cleaned transcript

```python
import redis as redis_lib
r = redis_lib.from_url('redis://default:nkSTGw41uEWtb5vs0WDHPPJ779TDNdKa@redis-15054.crce198.eu-central-1-3.ec2.cloud.redislabs.com:15054')
VIDEO_ID = 'REPLACE_WITH_VIDEO_ID'

cleaned_html = """<p>First paragraph here.</p>
<p>Second paragraph here.</p>"""

r.set(f'transcript:{VIDEO_ID}', cleaned_html)
print(f'Stored {len(cleaned_html)} chars — live immediately at site')
```

No deployment needed — Redis writes are live instantly.

---

## Cleanup rules

### Fix auto-transcription errors (German yoga context)

| Wrong | Correct | Notes |
|-------|---------|-------|
| charten / gechartet | chanten / gechanted | Always mishears "chanten" |
| Krier / Kriya | Kriya | Kundalini exercise sequence |
| Darty Hay | Dharti Hai | Mantra name (Earth is) |
| Guram / Guduram | Guru Ram Das | Deity name in mantra |
| erdein / erden dich | erden / erden dich | Grounding instruction |
| de Brustbein | dem Brustbein | Grammatical case |
| Was Anspannung los | Lass Anspannung los | Mishearing |
| Handwächen | Handflächen | Palms of hands |
| rechte den Kopf | richte den Kopf | "Richte" = straighten |
| Namen / Nam und | Namaste, und | Opening greeting |
| wunderwunderschönen | wunderschönen | Repeated syllable |

### Remove speech disfluencies

- Solo `ähm`, `äh`, `hmm` — delete or replace with a comma/nothing
- Repeated words: `an an`, `mit dem mit der` — remove the repeat
- Incomplete word fragments: `wah`, `ets`, `sta` — remove or correct in context
- Trailing orphan letters like `M.` at end — delete

### Chanting / mantra sections

When auto-transcription hits a mantra being chanted aloud, it produces garbled
text (often foreign scripts — Hindi/Gurmukhi/Tamil mix). Replace the entire
chanting block with a note in square brackets:

```
[Chanten: MANTRA NAME — e.g. Sat Nam / Dharti Hai, Akash Hai, Guru Ram Das Hai]
```

The chanting block is identifiable because it:
- Contains non-Latin scripts (Hindi देवनागरी, Gurmukhi ਗੁਰਮੁਖੀ, etc.)
- Or has repeated syllable-like fragments: `S. S. S Se S S S`
- Usually surrounded by German instructions ("jetzt chanten wir gemeinsam" / "halt die Hände")

### Paragraph structure (typical yoga class flow)

Split into paragraphs at these natural topic breaks:

1. **Welcome / greeting** — "Namaste", "guten Morgen", "schön dass du da bist"
2. **Topic intro** — what practice/kriya/mantra we're doing today, why
3. **Meaning / context** — explanation of the mantra or kriya's effect
4. **Movement description** — step-by-step instructions for the physical sequence
5. **Centering / breath** — "Bring die Hände...", "Schließ die Augen...", breathing
6. **Chanting / practice** — `[Chanten: ...]` placeholder
7. **Coming out** — "Halt die Hände...", final breaths, integration
8. **Closing / farewell** — "Schön dass du dabei warst", "Bis bald"

Not every video has all 8 sections — use judgment. Shorter Celestial Communication
videos (1000–3000 chars) may only need 4–5 paragraphs.

---

## Output format

```html
<p>First paragraph text here.</p>
<p>Second paragraph text here.</p>
<p>[Chanten: Sat Nam]</p>
<p>Closing paragraph here.</p>
```

- Only `<p>` tags, nothing else (no `<h3>`, `<em>`, `<br>`, etc.)
- No empty paragraphs
- The cleaned HTML is stored directly as the Redis value

---

## Where this lives in the repo

- **Redis key format**: `transcript:{youtubeVideoId}` (e.g. `transcript:KXH1Atna1EA`)
- **Slug lookup**: `vidslug:{videoId}` → slug string → URL `/videos/{slug}`
- **Rendered at**: `app/videos/[id]/page.tsx` line ~665 (`dangerouslySetInnerHTML`)
- **Raw fetch script**: `scripts/fetch_transcripts.py` (run locally on Mac — VPS IPs blocked by YouTube)
- **Vercel endpoint** (alternative push method): `POST /api/set-transcript` with `{secret, videoId, transcript}`

---

## Verifying

After storing, open the video URL in a browser. The page shows the transcript in a
beige box below the video. Paragraphs should be visually separated. No code
deployment needed — Redis is the live store.

---

## Full workflow summary (for every new video Catherine publishes)

1. Catherine uploads video to YouTube, adds it to a playlist
2. **VPS nightly job** (01:00 CET) registers slug + title in Redis automatically
3. **Mac script** `python3 scripts/fetch_transcripts.py` — run this to pull the raw transcript (do it from Viktor's Mac, not VPS)
4. **Claude/Codex cleanup session** — run the "find which need cleanup" script to see the new video, read the raw transcript, clean it, store HTML back
5. Video page at `kundaliniyogatribe.de/videos/{slug}` is live immediately

Run `python3 scripts/fetch_transcripts.py` any time to check for new videos and pull their transcripts in one go.

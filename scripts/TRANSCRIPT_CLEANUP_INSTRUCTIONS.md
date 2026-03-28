# KYT Transcript Cleanup — Instructions for Claude/Codex

## What this is

kundaliniyogatribe.de stores YouTube video transcripts in Redis. They are rendered
as raw HTML on each video's detail page (`dangerouslySetInnerHTML`), so they need
to be proper HTML with `<p>` tags — not plain text with newlines.

Transcripts come from `youtube-transcript-api` (auto-generated German captions) and
are stored as raw concatenated text. They need:
1. Spelling/grammar corrections (auto-transcription errors)
2. Removal of speech disfluencies
3. Logical paragraph breaks wrapped in `<p>` tags

---

## How to find which transcripts need cleanup

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

## Remaining videos to clean (as of 2026-03-28)

Run the "find which need cleanup" script above to get the current list.
Approximately 22 videos remain after the first two demos (KXH1Atna1EA, TpXu-tE2YWE).
Most are long German morning Kriya sessions (10,000–20,000 chars).

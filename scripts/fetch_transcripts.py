#!/usr/bin/env python3
"""
KYT Transcript Fetcher — runs locally on Mac (not VPS, VPS IPs are blocked by YouTube)

Uses youtube-transcript-api to fetch transcripts for videos that the Vercel
nightly job can't reach (YouTube blocks cloud provider IPs for scraping).

Usage:
  python3 scripts/fetch_transcripts.py            # fix all missing
  python3 scripts/fetch_transcripts.py --dry-run  # show what would be done
  python3 scripts/fetch_transcripts.py VIDEO_ID   # fix single video
"""

import sys
import os
import json
import re
import requests
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, VideoUnavailable

# ── Config ─────────────────────────────────────────────────────────────────────
BASE_URL       = "https://kundaliniyogatribe.de"
SECRET         = "kyt-process-2024"
YOUTUBE_KEY    = os.environ.get("YOUTUBE_API_KEY", "AIzaSyCt0hdTnbK6kgxBbg6G-B1KZmdhSQgb1pI")
DRY_RUN        = "--dry-run" in sys.argv

# ── YouTube transcript API ──────────────────────────────────────────────────────
ytt_api = YouTubeTranscriptApi()

def fetch_transcript(video_id: str) -> str | None:
    """Try to get German transcript, fall back to any language."""
    try:
        transcript_list = ytt_api.list(video_id)
        # Prefer German (auto-generated or manual)
        try:
            t = transcript_list.find_transcript(['de'])
        except NoTranscriptFound:
            try:
                t = transcript_list.find_generated_transcript(['de'])
            except NoTranscriptFound:
                # Fall back to first available language
                t = next(iter(transcript_list))
        entries = t.fetch()
        text = ' '.join(e.text.strip() for e in entries if e.text.strip())
        return text if text else None
    except (VideoUnavailable, Exception) as e:
        print(f"  ✗ No transcript: {type(e).__name__}")
        return None

# ── API helpers ─────────────────────────────────────────────────────────────────
def get_all_playlist_videos() -> list[dict]:
    """Return [{videoId, title, playlistTitle}] for all playlist videos."""
    playlists = requests.get(f"{BASE_URL}/api/playlists").json()
    videos = []
    for pl in playlists:
        pid = pl['playlistId']
        page_token = ''
        while True:
            url = (f"https://www.googleapis.com/youtube/v3/playlistItems"
                   f"?part=snippet&playlistId={pid}&maxResults=50&key={YOUTUBE_KEY}")
            if page_token:
                url += f"&pageToken={page_token}"
            data = requests.get(url).json()
            for item in data.get('items', []):
                vid = item['snippet']['resourceId']['videoId']
                title = item['snippet']['title']
                videos.append({'videoId': vid, 'title': title, 'playlist': pl['title']})
            page_token = data.get('nextPageToken', '')
            if not page_token:
                break
    return videos

def get_has_transcript() -> set[str]:
    return set(requests.get(f"{BASE_URL}/api/transcripts").json())

def push_transcript(video_id: str, transcript: str, title: str | None = None) -> dict:
    r = requests.post(f"{BASE_URL}/api/set-transcript", json={
        'secret': SECRET,
        'videoId': video_id,
        'transcript': transcript,
        'title': title,  # only sets title in Redis if provided (won't overwrite existing)
    })
    return r.json()

# ── Main ────────────────────────────────────────────────────────────────────────
def main():
    # Single video mode
    single_id = next((a for a in sys.argv[1:] if not a.startswith('--')), None)

    if single_id:
        print(f"Fetching transcript for {single_id}...")
        transcript = fetch_transcript(single_id)
        if transcript:
            print(f"  Got {len(transcript)} chars")
            if not DRY_RUN:
                result = push_transcript(single_id, transcript)
                print(f"  Pushed: {result}")
        return

    print("Loading playlist videos...")
    all_videos = get_all_playlist_videos()
    has_transcript = get_has_transcript()

    print(f"Total videos in playlists: {len(all_videos)}")
    print(f"Videos with transcripts: {len(has_transcript)}")

    # Deduplicate (same video can appear in multiple playlists)
    seen = set()
    missing = []
    for v in all_videos:
        vid = v['videoId']
        if vid not in seen and vid not in has_transcript:
            seen.add(vid)
            missing.append(v)

    print(f"Videos needing transcripts: {len(missing)}")
    if DRY_RUN:
        for v in missing:
            print(f"  {v['videoId']}: {v['title']!r} [{v['playlist']}]")
        return

    print()
    success = 0
    failed = []

    for v in missing:
        vid = v['videoId']
        title = v['title']
        print(f"{vid} ({title!r})...")

        transcript = fetch_transcript(vid)
        if transcript:
            result = push_transcript(vid, transcript)
            print(f"  ✓ {len(transcript)} chars → {result.get('updates', {})}")
            success += 1
        else:
            failed.append(vid)

    print(f"\nDone: {success} transcripts added, {len(failed)} failed")
    if failed:
        print(f"Failed: {failed}")

if __name__ == '__main__':
    main()

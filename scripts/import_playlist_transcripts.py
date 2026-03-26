#!/usr/bin/env python3
import html
import os
import re
import sys

import requests
from youtube_transcript_api import YouTubeTranscriptApi


PROCESS_ENDPOINT = os.environ.get(
    "PROCESS_ENDPOINT",
    "https://www.kundaliniyogatribe.de/api/process-transcripts",
)
IMPORT_ENDPOINT = os.environ.get(
    "IMPORT_ENDPOINT",
    "https://www.kundaliniyogatribe.de/api/import-transcripts",
)
PROCESS_SECRET = os.environ.get("PROCESS_SECRET", "kyt-process-2024")


def build_transcript_html(snippets):
    paragraphs = []
    current = []
    previous_end = 0.0

    for snippet in snippets:
      text = normalize_text(snippet.text)
      if not text:
          continue

      start = float(snippet.start)
      duration = float(snippet.duration)
      gap = start - previous_end
      current_text = " ".join(current)
      should_break = bool(current) and (
          gap > 1.8 or
          current_text.endswith((".", "!", "?", "…")) or
          len(current_text) > 420
      )

      if should_break:
          paragraphs.append(f"<p>{html.escape(' '.join(current))}</p>")
          current = []

      if not current or current[-1] != text:
          current.append(text)

      previous_end = start + duration

    if current:
        paragraphs.append(f"<p>{html.escape(' '.join(current))}</p>")

    return "".join(paragraphs)


def normalize_text(text):
    return re.sub(r"\s+", " ", text or "").strip()


def fetch_missing_videos(playlist_name):
    response = requests.post(
        PROCESS_ENDPOINT,
        json={"secret": PROCESS_SECRET, "dryRun": True},
        timeout=180,
    )
    response.raise_for_status()
    data = response.json()

    for playlist in data.get("results", []):
        if playlist_name.lower() not in playlist.get("playlist", "").lower():
            continue
        return [
            item for item in playlist.get("videos", [])
            if item.get("status") == "no-transcript"
        ]

    raise RuntimeError(f"Playlist not found: {playlist_name}")


def import_transcripts(items):
    response = requests.post(
        IMPORT_ENDPOINT,
        json={"secret": PROCESS_SECRET, "items": items},
        timeout=180,
    )
    response.raise_for_status()
    return response.json()


def main():
    playlist_name = " ".join(sys.argv[1:]).strip() or "Celestial Communication"
    api = YouTubeTranscriptApi()
    missing_videos = fetch_missing_videos(playlist_name)

    if not missing_videos:
        print(f"No missing transcript videos found for {playlist_name}")
        return

    ready = []
    failed = []

    for item in missing_videos:
        video_id = item["videoId"]
        title = item.get("title", "")
        print(f"Fetching transcript for {video_id} — {title}")
        try:
            snippets = api.fetch(video_id, languages=["de", "en"])
            transcript = build_transcript_html(snippets)
            if transcript:
                ready.append({
                    "videoId": video_id,
                    "title": title,
                    "transcript": transcript,
                })
        except Exception as exc:
            failed.append({
                "videoId": video_id,
                "title": title,
                "error": str(exc),
            })
            print(f"Skipping {video_id}: {exc}")

    if not ready:
        print("No transcripts could be fetched")
        if failed:
            print({"failed": failed})
        return

    result = import_transcripts(ready)
    print(result)
    if failed:
        print({"failed": failed})


if __name__ == "__main__":
    main()

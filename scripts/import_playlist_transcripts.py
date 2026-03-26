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
WATCH_HEADERS = {
    "Accept-Language": "de-DE,de;q=0.9",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


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


def fetch_transcript_html(api, video_id):
    try:
        snippets = api.fetch(video_id, languages=["de", "en"])
        transcript = build_transcript_html(snippets)
        if transcript:
            return transcript
    except Exception:
        pass

    watch_res = requests.get(
        f"https://www.youtube.com/watch?v={video_id}",
        headers=WATCH_HEADERS,
        timeout=60,
    )
    watch_res.raise_for_status()
    match = re.search(r'"captionTracks":\[(.*?)\]', watch_res.text)
    if not match:
        raise RuntimeError("No captionTracks found in watch page")

    base_match = re.search(r'"baseUrl":"([^"]+)"', match.group(1))
    if not base_match:
        raise RuntimeError("No caption baseUrl found")

    caption_url = base_match.group(1).replace("\\u0026", "&")
    caption_res = requests.get(f"{caption_url}&fmt=vtt", headers=WATCH_HEADERS, timeout=60)
    caption_res.raise_for_status()
    transcript = vtt_to_html(caption_res.text)
    if not transcript:
        raise RuntimeError("Caption track returned no usable transcript")
    return transcript


def vtt_to_html(vtt):
    blocks = [
        block.strip()
        for block in vtt.replace("\r", "").split("\n\n")
        if block.strip()
    ]
    cues = []

    for block in blocks:
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines or lines[0] == "WEBVTT":
            continue

        time_line_index = next((i for i, line in enumerate(lines) if "-->" in line), -1)
        if time_line_index == -1:
            continue

        raw_start, raw_end = [
            part.strip().split(" ")[0]
            for part in lines[time_line_index].split("-->")
        ]
        text = normalize_vtt_text(" ".join(lines[time_line_index + 1:]))
        if not text:
            continue

        previous = cues[-1] if cues else None
        if previous and previous["text"] == text:
            continue

        cues.append({
            "start": parse_vtt_time(raw_start),
            "end": parse_vtt_time(raw_end),
            "text": text,
        })

    if not cues:
        return ""

    paragraphs = []
    current = []
    previous_end = 0.0

    for cue in cues:
        gap = cue["start"] - previous_end
        current_text = " ".join(current)
        should_break = bool(current) and (
            gap > 1.8 or
            current_text.endswith((".", "!", "?", "…")) or
            len(current_text) > 420
        )

        if should_break:
            paragraphs.append(f"<p>{html.escape(' '.join(current))}</p>")
            current = []

        current.append(cue["text"])
        previous_end = cue["end"]

    if current:
        paragraphs.append(f"<p>{html.escape(' '.join(current))}</p>")

    return "".join(paragraphs)


def normalize_vtt_text(text):
    cleaned = re.sub(r"<\d{2}:\d{2}:\d{2}\.\d{3}>", "", text)
    cleaned = re.sub(r"</?c>", "", cleaned)
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    return normalize_text(
        cleaned
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )


def parse_vtt_time(value):
    match = re.match(r"(?:(\d+):)?(\d+):(\d+)\.(\d+)", value)
    if not match:
        return 0
    hours, minutes, seconds, millis = match.groups(default="0")
    return (
        int(hours) * 3600 +
        int(minutes) * 60 +
        int(seconds) +
        int(millis) / 1000
    )


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
            transcript = fetch_transcript_html(api, video_id)
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

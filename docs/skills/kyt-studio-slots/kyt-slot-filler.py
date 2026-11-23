#!/usr/bin/env python3
"""
KYT Slot-Filler - plant die Studio-Slots der naechsten 7 Tage aus der
Mediathek und raeumt abgefeuerte Eintraege auf.

Slot-Regeln (Europe/Amsterdam):
  Slot 1: 06:30 Mo-Fr, 07:00 Sa-So  -> Video (neueste Datei der Mediathek)
  Slot 2: 10:00 taeglich            -> Video (neueste Datei der Mediathek)
  Slot 3: So 20:30                  -> NICHT automatisch (Live-Session von Hand)

Quelle der Wahrheit: Studio-API auf enkra (100.117.19.15:3500), Bearer-Token
aus dem kyt-seo-Container auf diesem Pi.

Idempotent: legt nur an, was fehlt, und loescht nur, was abgefeuert ist.
Aufruf: kyt-slot-filler.py [--dry-run] [--days N]
"""
import argparse
import datetime
import json
import subprocess
import sys
import urllib.error
import urllib.request
import zoneinfo

TZ = zoneinfo.ZoneInfo("Europe/Amsterdam")
API = "http://100.117.19.15:3500"
DEFAULT_DAYS = 9
TOLERANCE_MIN = 5
CLEANUP_AFTER_H = 2

SLOT1 = {0: (6, 30), 1: (6, 30), 2: (6, 30), 3: (6, 30), 4: (6, 30), 5: (7, 0), 6: (7, 0)}
SLOT2 = (10, 0)

_TOKEN = None


def api_token():
    global _TOKEN
    if _TOKEN is None:
        out = subprocess.check_output(
            ["docker", "exec", "kyt-seo", "printenv", "STUDIO_API_TOKEN"], text=True
        )
        _TOKEN = out.strip()
    return _TOKEN


def api(path, method="GET", body=None):
    req = urllib.request.Request(API + path, method=method)
    req.add_header("Authorization", "Bearer " + api_token())
    req.add_header("Accept", "application/json")
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, data=data, timeout=25) as resp:
        raw = resp.read().decode("utf-8")
    return json.loads(raw) if raw.strip() else {}


def newest_video():
    files = api("/api/files")
    if isinstance(files, dict):
        files = files.get("files") or files.get("items") or []
    files = [f for f in files if isinstance(f, dict) and (f.get("filename") or f.get("name"))]
    if not files:
        return None
    files.sort(key=lambda f: float(f.get("mtime") or 0))
    last = files[-1]
    return last.get("filename") or last.get("name")


def parse_dt(raw):
    if not raw:
        return None
    try:
        return datetime.datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None


def planned_slots(days):
    now_local = datetime.datetime.now(TZ)
    out = []
    for offset in range(days + 1):
        day = (now_local + datetime.timedelta(days=offset)).date()
        h, m = SLOT1[day.weekday()]
        out.append(datetime.datetime.combine(day, datetime.time(h, m), TZ))
        out.append(datetime.datetime.combine(day, datetime.time(*SLOT2), TZ))
    return sorted(out)


def live_slots(days):
    """Slot 3: Sonntag 20:30 - Live-Session von Hand (nur mit --include-live)."""
    now_local = datetime.datetime.now(TZ)
    out = []
    for offset in range(days + 1):
        day = (now_local + datetime.timedelta(days=offset)).date()
        if day.weekday() != 6:
            continue
        out.append(datetime.datetime.combine(day, datetime.time(20, 30), TZ))
    return sorted(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--days", type=int, default=DEFAULT_DAYS)
    ap.add_argument("--include-live", action="store_true",
                    help="auch Slot 3 (So 20:30) als Live-Session planen")
    args = ap.parse_args()

    status = api("/api/stream/status")
    scheduled = status.get("scheduled") or []
    running = bool(status.get("running"))
    now_utc = datetime.datetime.now(datetime.timezone.utc)

    existing = []
    for entry in scheduled:
        ts = parse_dt(entry.get("datetime"))
        if ts:
            existing.append((ts, entry))
    existing.sort(key=lambda pair: pair[0])

    created = 0
    deleted = 0

    # 1) Aufraeumen: Eintraege, die lange vorbei sind, raeumen auf.
    if not running:
        for ts, entry in existing:
            if ts < now_utc - datetime.timedelta(hours=CLEANUP_AFTER_H):
                label = entry.get("filename") or entry.get("mode") or "?"
                if args.dry_run:
                    print(f"[dry] DEL alt {ts:%Y-%m-%d %H:%M}Z {label} id={entry.get('id')}")
                else:
                    try:
                        api(f"/api/stream/schedule/{entry.get('id')}", method="DELETE")
                        print(f"  DEL alt {ts:%Y-%m-%d %H:%M}Z {label} id={entry.get('id')}")
                    except urllib.error.HTTPError as exc:
                        print(f"  WARN DEL {entry.get('id')}: HTTP {exc.code}")
                deleted += 1
    else:
        print("  laufender Stream aktiv - kein Cleanup")

    # 2) Neue Datei aus der Mediathek fuer die Video-Slots.
    video = newest_video()
    if not video:
        print("  WARN Mediathek leer - keine Video-Slots geplant")
    print(f"  Mediathek-Datei: {video}")

    # 3) Fehlende Slots der naechsten N Tage anlegen.
    wanted = planned_slots(args.days)
    if args.include_live:
        wanted += live_slots(args.days)

    for slot in wanted:
        ts_utc = slot.astimezone(datetime.timezone.utc)
        clash = False
        for ts, _entry in existing:
            if abs((ts - ts_utc).total_seconds()) <= TOLERANCE_MIN * 60:
                clash = True
                break
        if clash:
            continue
        if ts_utc <= now_utc:
            continue
        iso = ts_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        is_live = slot.hour == 20 and slot.minute == 30
        payload = ({"filename": None, "datetime": iso, "mode": "live", "streamKey": "live"}
                   if is_live else
                   {"filename": video, "datetime": iso, "mode": "video"})
        if args.dry_run:
            print(f"[dry] POST {iso} {slot:%a %d.%m. %H:%M} Berlin "
                  f"{'live' if is_live else 'video ' + str(video)}")
        else:
            try:
                resp = api("/api/stream/schedule", method="POST", body=payload)
                print(f"  POST {iso} {slot:%a %d.%m. %H:%M} Berlin "
                      f"{'live' if is_live else 'video'} id={resp.get('id')}")
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", "replace")[:120]
                print(f"  WARN POST {iso}: HTTP {exc.code} {detail}")
                continue
        created += 1

    print(f"fertig: {created} angelegt, {deleted} aufgeraeumt" + (" (dry-run)" if args.dry_run else ""))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"FEHLER: {exc}")
        sys.exit(1)

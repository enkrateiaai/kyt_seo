# Studio-API, Stores, Crons

## Endpunkte (Studio-API auf enkra, Port 3500)

Bearer-Token noetig. Token holen mit:
`docker exec gdrive-srs-streamer printenv STUDIO_API_TOKEN` (kein Trailing Newline!)

| Endpunkt | Zweck |
|---|---|
| `GET /api/stream/status` | laufender Stream + `scheduled[]` + `lastInfo` |
| `GET /api/files` | Mediathek (neueste Datei = hoechstes `mtime`) |
| `POST /api/stream/schedule` | Slot setzen: `{filename, datetime, mode:"video"}` bzw. `{mode:"live", streamKey:"live", datetime}` |
| `DELETE /api/stream/schedule/<id>` | Slot loeschen |
| `GET /api/webinar` | oeffentliche Webinar-Fenster (ohne Token: 401) |
| `POST/PUT/DELETE /api/webinar[/<id>]` | Webinar-Eintraege pflegen |
| `GET /api/health` | Health des Containers |
| `GET /api/audit` | Append-only JSONL aller Aktionen |
| `GET /api/srs/info` | `stream_count`, `streams[].publish.active`, `viewer_count` |

Alternativ auf vrouwtje ueber den Studio-Proxy (Token wird dort gesetzt):
`http://127.0.0.1:3010/api/studio-proxy/api/<pfad>`

## Stores (Container `gdrive-srs-streamer`)

| Datei | Host auf enkra | Inhalt |
|---|---|---|
| `/app/.secrets/schedule.json` | `/Users/enkra/docker/srs/secrets/schedule.json` | Live-/Video-Slots (`mode`, `datetime`, `filename`) |
| `/app/.secrets/webinar.json` | `.../webinar.json` | Webinar-Fenster fuer `/webinar` |
| `/app/.secrets/webinar_cta.json` | `.../webinar_cta.json` | CTA-Button (z. B. Calendly) |
| `/data/uploads/` | (Docker-Volume `srs_srs-data`) | Mediathek-Videos; **hier muss die Datei liegen**, sonst filtert `_webinar_public()` den Eintrag weg |
| `/data/uploads/.audit.jsonl` | Volume | Audit-Log (`schedule.add`, `schedule.fire`, `stream.start`, ...) |

Quellcode: `/Users/enkra/docker/srs/scripts/api-server.py` (Flask/gunicorn, 1 Worker, 16 Threads).

## Aktive Slot-Crons (OpenClaw auf enkra)

Alle Agent `kundaliniyogatribe`, Telegram `-1003813295957`, Zeitzone Europe/Amsterdam.

| Zweck | Werktag | Wochenende |
|---|---|---|
| Warnung 10 Min vor Slot 1 | `20 6 * * 1-5` | `50 6 * * 0,6` |
| Angebot 5 Min vor Slot 1 | `25 6 * * 1-5` | `55 6 * * 0,6` |
| Fallback Slot 1 (letztes Video) | `28 6 * * 1-5` | `58 6 * * 0,6` |
| Warnung / Angebot / Fallback Slot 2 | `50 9 * * *` / `55 9 * * *` / `58 9 * * *` | - |

**Der Filler fuer die Vorausplanung sitzt nicht im OpenClaw, sondern auf vrouwtje:**
`/home/vik/bin/kyt-slot-filler.py`, Cron `17 */6 * * *` (vik-Crontab), Log
`/home/vik/logs/kyt-slot-filler.log`. Er spricht die Studio-API direkt mit dem
Bearer-Token aus `docker exec kyt-seo printenv STUDIO_API_TOKEN` an
(`http://100.117.19.15:3500`) - nicht ueber den Studio-Proxy (der haengt an
Clerk-Sessions und antwortet auf curl mit 401).

Der Filler plant Slot 1 + Slot 2 der naechsten 9 Tage mit dem neuesten Video der
Mediathek, raeumt abgefeuerte Eintraege auf und fasst bestehende Slots nicht an.
Slot 3 (So 20:30 Live) plant er nur mit `--include-live`.

Die OpenClaw-Warn-/Angebots-/Fallback-Crons bleiben als zweite Ebene aktiv: sie
greifen, falls ein Tag ohne geplanten Slot bleibt.

## Agent-Werkzeuge (openclaw-Container)

`/root/.openclaw/workspace-kundaliniyogatribe/scripts/kyt_slot.py` - Modi `list`,
`warn --slot`, `offer --slot`, `add --file`, `cancel --id`, `live --slot`,
`fallback --slot`. Skills im selben Workspace: `kyt-studio-schedule`,
`kyt-webinar-booking-slots`, `kyt-slot-reminder-jobs`, `kyt-webinar-cta-link`.

Slot-Pattern fuer Warnungen: `/root/.openclaw/live_slots.yaml` (`lookahead_days: 14`).

## Debug-Matrix

| Symptom | Ursache | Pruefung |
|---|---|---|
| `/webinar` zeigt 0 Termine | Datei fehlt in `/data/uploads` -> `_webinar_public()` filtert | `GET /api/webinar` mit Token, `ls /data/uploads` |
| Slot feuert nicht | `datetime` in der Vergangenheit oder falsche Zeitzone | `GET /api/stream/status`, `TZ=Europe/Amsterdam date` |
| 401 von der API | Token mit Newline/Secret-Masking | Token frisch aus dem Container printen |
| Slots fehlen morgens | Fallback-Cron lief nicht | `openclaw cron list`, Audit-Log |
| Studio-Seite leer (07.11.) | Studio-Container blockiert, kein Request-Timeout | `docker logs mystudio`, `/api/health` |

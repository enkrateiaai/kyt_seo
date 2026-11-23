---
name: kyt-studio-slots
description: Betrieb und Debugging der KYT-Webinar-Slots (kundaliniyogatribe.de / Studio auf /studio, /webinar-anmeldung). Nutzt werden: Topologie enkra <-> vrouwtje, Studio-API (gdrive-srs-streamer), Slot-Regeln und -Zeiten, die OpenClaw-Slot-Crons, Warum-Termine leer sind, Planen/Pruefen/Freigeben von Live-Slots. Nur fuer KYT/Studio/Slot-/Webinar-Aufgaben.
---

# KYT Studio & Slots

Betrieb der Studio-Slots von Kundalini Yoga Tribe. Alles laeuft ueber **enkra**; der
oeffentliche KYT-Stack (Next.js `kyt-seo`) laeuft auf dem Pi **vrouwtje**.

## Was laeuft wo

| Rolle | Ort | Zugang |
|---|---|---|
| Studio-/Stream-API (schedule.json, webinar.json, /api/files) | enkra, Container `gdrive-srs-streamer`, Port **3500** | `http://100.117.19.15:3500`, Bearer `STUDIO_API_TOKEN` |
| Studio-Oberflaeche (Next.js) | enkra, Container `mystudio`, Port **3085** | `http://100.117.19.15:3085` |
| OpenClaw-Agenten + Cronjobs | enkra, Container `openclaw-openclaw-1` | `openclaw cron list` |
| KYT-Website / Studio-Proxy | vrouwtje (Pi), Container `kyt-seo` | `http://127.0.0.1:3010/api/studio-proxy/...` (nur lokal auf dem Pi) |
| KYT-Quellcode | enkra `/Users/enkra/kyt_seo_build/repo` | – |

## Zugangskette (Mac -> vrouwtje)

Es gibt **keinen** direkten SSH-Zugang von diesem Mac auf vrouwtje. Die funktionierende
Kette ist Mac -> enkra -> openclaw-Container -> vrouwtje:

```bash
ssh enkra   # auf enkra anmelden
D=/Applications/Docker.app/Contents/Resources/bin/docker
$D exec openclaw-openclaw-1 ssh -i /root/.ssh/id_ed25519 vik@100.90.161.78 '<cmd>'
```

Token fuer die Studio-API (nur aus dem Container holen, nie aus .env-Dateien):

```bash
$D exec gdrive-srs-streamer printenv STUDIO_API_TOKEN
```

## Schnellstatus

`scripts/kyt-slots.sh` (in diesem Skill) holt Schedule, Webinar-Liste und die
Slot-Crons in einem Rutsch und ist das bevorzugte Werkzeug vor jedem Eingriff:

```bash
bash ~/.codex/skills/kyt-studio-slots/scripts/kyt-slots.sh          # Schedule + Termine
bash ~/.codex/skills/kyt-studio-slots/scripts/kyt-slots.sh --cron   # + Cron-Status
```

## Slot-Regeln (Europe/Amsterdam)

| Slot | Zeit | Tage |
|---|---|---|
| 1 | 06:30 | Mo-Fr |
| 1 | 07:00 | Sa-So |
| 2 | 10:00 | taeglich |
| 3 | 20:30 | So (Programmslot, keine Warnung) |

UTC-Umrechnung: **Sommerzeit 06:30 Amsterdam = 04:30Z, Winterzeit = 05:30Z**. Nie
fest verdrahten, immer `TZ=Europe/Amsterdam date` pruefen.

## Was automatisch laeuft (und was nicht)

Aktiv sind 9 OpenClaw-Crons (Agent `kundaliniyogatribe`, Telegram-Ziel
`-1003813295957`): `kyt-slot-warn-10m`, `kyt-slot-offer-5m` und `kyt-slot-fallback`
je fuer Slot 1 (Werktag 20/25/28, Wochenende 50/55/58) und Slot 2 (taeglich
50/55/58). Sie **warnen, bieten an und setzen notfalls das letzte Video der
Mediathek** - sie planen aber **keine Woche im Voraus**.

Slots werden **nicht** 7 Tage im Voraus befuellt - das uebernimmt der
`kyt-slot-filler.py` auf vrouwtje (siehe unten). Vorausgeplante Slots entstehen
sonst nur durch Agent-Laeufe oder manuelles Eintragen im Studio.

## 7-Tage-Fueller (automatisch)

`/home/vik/bin/kyt-slot-filler.py` auf **vrouwtje**, Cron `17 */6 * * *`, Log
`/home/vik/logs/kyt-slot-filler.log`. Deterministisch, idempotent, ohne LLM:

- plant Slot 1 (06:30 Mo-Fr / 07:00 Sa-So) und Slot 2 (10:00) fuer die naechsten
  9 Tage mit dem neuesten Video der Mediathek
- raeumt Eintraege auf, die laenger als 2 h in der Vergangenheit liegen
  (nur wenn kein Stream laeuft)
- **bestehende Slots werden nie angefasst** - Agenten waehlen die Datei teils
  bewusst, die Auswahl darf nicht ueberschrieben werden
- Slot 3 (So 20:30, Live von Hand) bleibt unangetastet; optional mit
  `--include-live`

Im Repo liegt dieselbe Datei unter `scripts/kyt-slot-filler.py`. Manuell starten
ueber die Kette (siehe unten), Dry-Run mit `--dry-run`.

## Eingriffe

Slots setzen/entfernen laufen ueber die Studio-API, nicht ueber die Datei:

```bash
# auf vrouwtje (Studio-Proxy nimmt den Token mit)
curl -X POST http://127.0.0.1:3010/api/studio-proxy/api/stream/schedule \
  -H 'Content-Type: application/json' \
  -d '{"filename":"<datei>.mp4","datetime":"<UTC-ISO>","mode":"video"}'
```

- `datetime` muss in der **Zukunft** liegen (mind. +5 s), sonst lehnt das Backend ab.
- `mode:"live"` + `streamKey:"live"` = echte OBS-Session, `filename` bleibt dann `null`.
- `DELETE /api/studio-proxy/api/stream/schedule/<id>` zum Entfernen. Ein Slot erst
  loeschen, wenn `running == false` **und** `datetime` in der Vergangenheit liegt.

Details, Endpunkte, Cron-IDs, Store-Dateien und Pitfalls:
`references/studio-api.md`.

## Pitfalls

- **Leere Termine auf /webinar:** `_webinar_public()` in `api-server.py` verwirft
  jeden Eintrag, dessen Datei nicht in `UPLOADS_DIR` (`/data/uploads`) liegt.
  Ein Eintrag in `webinar.json` ohne Datei dort erscheint als `webinars: []`.
- **401 trotz korrektem Token:** Der Wert muss ohne Trailing Newline und ohne
  Secret-Masking im Shell-String stehen. Aus dem Container printen, nicht aus
  einer Datei lesen.
- **Zwei verschiedene Stores:** `schedule.json` = Streams/Live-Slots,
  `webinar.json` = Webinar-Fenster. Nicht verwechseln.
- **Direkte Backend-Calls liefern 401**, wenn der Bearer-Header fehlt; der
  Studio-Proxy auf vrouwtje uebernimmt das.
- **Alle Zeiten in UTC** im Schedule, Anzeige in Europe/Amsterdam.

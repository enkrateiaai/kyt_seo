#!/usr/bin/env bash
# Kompakter Status der KYT-Studio-Slots (Schedule, Termine, optional Cron).
# Nutzt die einzige funktionierende Kette: Mac -> enkra -> openclaw -> vrouwtje.
set -uo pipefail

ENKRA_SSH=${ENKRA_SSH:-enkra}
API=${STUDIO_API_URL:-http://100.117.19.15:3500}
HORIZON_DAYS=${HORIZON_DAYS:-7}

echo "== KYT Studio-Slots =="
echo "-- hole Token/Schedule von enkra --"

REMOTE=$(ssh -o BatchMode=yes -o ConnectTimeout=12 "$ENKRA_SSH" 'bash -s' <<'REMOTEEOF'
D=/Applications/Docker.app/Contents/Resources/bin/docker
echo "###TOKEN###"
$D exec gdrive-srs-streamer printenv STUDIO_API_TOKEN 2>/dev/null
echo "###SCHEDULE###"
cat /Users/enkra/docker/srs/secrets/schedule.json 2>/dev/null
echo
echo "###WEBINARFILE###"
cat /Users/enkra/docker/srs/secrets/webinar.json 2>/dev/null
echo
REMOTEEOF
)

TOKEN=$(printf '%s' "$REMOTE" | sed -n '/^###TOKEN###$/,/^###SCHEDULE###$/p' | sed '1d;$d' | tr -d '\r\n')
SCHED=$(printf '%s' "$REMOTE" | sed -n '/^###SCHEDULE###$/,/^###WEBINARFILE###$/p' | sed '1d;$d')
WEBFILE=$(printf '%s' "$REMOTE" | sed -n '/^###WEBINARFILE###$/,$p' | sed '1d')

if [ -z "$TOKEN" ]; then
  echo "FEHLER: Token nicht erhalten (ssh $ENKRA_SSH / Container gdrive-srs-streamer)"
  exit 1
fi

echo "-- Studio-Schedule (naechste ${HORIZON_DAYS} Tage) --"
printf '%s' "$SCHED" | HORIZON_DAYS="$HORIZON_DAYS" python3 -c '
import json,sys,datetime,os
horizon=int(os.environ.get("HORIZON_DAYS","7"))
try:
    data=json.load(sys.stdin)
except Exception:
    print("  schedule.json nicht lesbar"); sys.exit(0)
now=datetime.datetime.now(datetime.timezone.utc)
end=now+datetime.timedelta(days=horizon)
if not isinstance(data,list):
    print("  unerwartetes Format:",type(data).__name__); sys.exit(0)
data.sort(key=lambda j: str(j.get("datetime")))
rows=0
for j in data:
    raw=str(j.get("datetime") or "")
    if not raw: continue
    ts=datetime.datetime.fromisoformat(raw.replace("Z","+00:00"))
    if ts<now-datetime.timedelta(hours=2): continue
    if ts>end: continue
    rows+=1
    berlin=ts.astimezone(datetime.timezone(datetime.timedelta(hours=1)))
    tag="live " if j.get("mode")=="live" else "video"
    name = j.get("filename") or "-"
    print(f"  {ts:%Y-%m-%d %H:%M}Z  {berlin:%a %d.%m. %H:%M} Berlin  {tag}  {name}")
if not rows:
    print("  (keine Slots im Fenster)")
print(f"  -> Eintraege gesamt in schedule.json: {len(data)}")
'

echo "-- /api/webinar (oeffentliche Terminliste) --"
API_JSON=$(curl -s -m 10 -H "Authorization: Bearer $TOKEN" "$API/api/webinar" 2>/dev/null)
printf '%s' "$API_JSON" | python3 -c '
import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    print("  API nicht erreichbar"); sys.exit(0)
w=d.get("webinars") or []
print(f"  Termine sichtbar: {len(w)}")
for x in w:
    print("   ",x.get("startsAt"),"|",x.get("filename"))
if not w:
    print("  -> leer. Ursache pruefen: webinar.json-Eintrag ohne Datei in UPLOADS_DIR (/data/uploads)")
'

if [ "${1:-}" = "--cron" ]; then
  echo "-- OpenClaw Slot-Crons --"
  ssh -o BatchMode=yes -o ConnectTimeout=12 "$ENKRA_SSH" \
    "/Applications/Docker.app/Contents/Resources/bin/docker exec openclaw-openclaw-1 openclaw cron list" 2>/dev/null \
    | grep -i -E "kyt-slot" | cut -c1-160
fi

# Backlog – Kundalini Yoga Tribe

Schreib hier neue Aufgaben rein und sag mir dann: **„schau in den backlog"** – ich lese die Datei und fange an.

---

## Format

```
### Titel der Aufgabe
**Priorität:** hoch / mittel / niedrig
**Bereich:** videos / seo / design / newsletter / backend / sonstiges
**Status:** offen / in arbeit / erledigt

Beschreibung was gemacht werden soll.
```

---

## Offen

### Titel der nächsten Videos eintragen (Redis)
**Priorität:** mittel
**Bereich:** videos / backend
**Status:** offen

Für jedes neue Video mit Platzhalter-Titel (z.B. "2", "3" ...) den echten Titel in Redis speichern.
Einfach hier schreiben: `videoId → Titel`
Beispiel:
- `abc123xyz` → `Meditation – Angst & Vertrauen`
- `def456uvw` → `Kriya für das Nervensystem`

---

### Transcripts für neue Playlist verarbeiten
**Priorität:** mittel
**Bereich:** videos / backend
**Status:** offen

Neue Playlist wurde in Admin hinzugefügt. Videos herunterladen, VTT → Text konvertieren und in Redis speichern.
Außerdem: erstes Video der Playlist als „free" markieren (Redis: `free:videoId = 1`).
- [ ] Playlist-ID aus Admin entnehmen
- [ ] yt-dlp: Untertitel für alle neuen Videos holen
- [ ] Transcripts in Redis speichern (`transcript:<videoId>`)
- [ ] Erstes Video als free markieren

---

### Erste Videos pro Playlist als "free" markieren
**Priorität:** hoch
**Bereich:** videos / backend
**Status:** offen

Für jede Playlist das erste Video als kostenlos markieren (Redis: `free:videoId = 1`).
Liste der freien Video-IDs:
- `kSuZH5l2iok` ✅ bereits erledigt
- [ ] weitere IDs hier eintragen

---

### Impressum & Datenschutz fertigstellen
**Priorität:** hoch
**Bereich:** seo / rechtlich
**Status:** offen

Daten eintragen und noindex-Tag entfernen, damit die Seiten indexiert werden.

---

### Stadtseiten fertigstellen
**Priorität:** mittel
**Bereich:** seo
**Status:** offen

Noch fehlende Städte generieren:
- [ ] Stuttgart
- [ ] Leipzig
- [ ] Hannover
- [ ] Nürnberg
- [ ] Freiburg

---

### Kriya-Seiten fertigstellen
**Priorität:** mittel
**Bereich:** seo
**Status:** offen

Noch fehlende Kriyas generieren:
- [ ] Detox-Kriya
- [ ] Selbstvertrauen-Kriya
- [ ] Herzöffnung-Kriya
- [ ] Morgenroutine-Kriya

---

### Mailjet Absender verifizieren
**Priorität:** hoch
**Bereich:** newsletter
**Status:** offen

`noreply@kundaliniyogatribe.de` im Mailjet-Dashboard als Absender verifizieren.
Sonst werden Bestätigungsmails nicht zugestellt.

---

## Ideen / Später

- Admin-Interface zum Hochladen von Transcripts (ohne Redis direkt)
- Video-Detailseiten: Hintergründe / Kontext-Abschnitt hinzufügen
- Sitemap automatisch erweitern wenn neue Stadtseiten dazukommen
- Google Search Console: Sitemap einreichen und Indexierung prüfen

---

## Erledigt

- [x] Satnam-Site auf Root-Domain deployen
- [x] `/videos` Seite mit Clerk-Auth
- [x] Proxy satnam-site → my-dashboard (Vercel rewrites)
- [x] Newsletter Double-Opt-In mit Mailjet + Redis
- [x] Favicon & OG-Image generieren
- [x] Logo umbenennen zu „Kundalini Yoga Tribe"
- [x] Videos-Menüpunkt in Navigation
- [x] Video-Detailseiten `/videos/[id]` mit Transcript + Glossar
- [x] Read-Aloud Button (Web Speech API, rate 0.75, Deutsch)
- [x] Paywall für nicht-Mitglieder (nur Video gesperrt, Transcript + Glossar frei)
- [x] Transcript `jugwEwiiTlg` aus echten YouTube Auto-Captions (yt-dlp)
- [x] Lock-Overlay mit „Mitglied werden" CTA auf Video-Detailseiten
- [x] Transcript `kSuZH5l2iok` – Meditation Emotionen & Kreativität
- [x] Transcript `jugwEwiiTlg` – Meditation Innere Stabilität & Stille
- [x] Vercel Analytics installiert

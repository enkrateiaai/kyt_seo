# Tribe Live Exklusiv

## Stack
- Next.js 16 + Tailwind
- Clerk (Google Auth, role: "member")
- Upstash Redis (Playlist storage)
- YouTube Data API v3

## Pages
- /videos - YouTube gallery (locked for non-members)
- /dashboard - User dashboard
- /admin - Playlist manager
- /shop - Redirect for non-members

## Member aktivieren
Clerk Dashboard → Users → Public Metadata → {"role": "member"}

## Neue Shop-Nutzer anlegen (n8n)
`POST /api/clerk/create-member` — wird aus der Shop-Automation (n8n) nach einer **neuen**
Bestellung aufgerufen und legt den Clerk-Nutzer an bzw. aktualisiert die Berechtigung.

| Feld | Wert |
|------|------|
| `email` | Kunden-Mail aus der Bestellung (Pflicht) |
| `firstName` / `lastName` | aus der Bestellung |
| `tier` | `live` → *The Tribe (mit lives)*, `video` → *The Tribe (ohne lives)* |
| `password` | optionales Passwort (z. B. das geteilte Tribe-Portalpasswort) |
| `orderNumber` | nur Info |

Auth: `Authorization: Bearer <CLERK_MEMBER_SECRET>` (oder `secret` im Body).

- **Tier → Berechtigung:** `live` → `publicMetadata.role = "mitlives"` + Org
  `org_3g4kskqf7orownjspuiq0sjfz9d`; `video` → `role = "ohnelives"` + Org
  `org_3g4kx68gr2ojo2lhqpydamu8yak` (beide in `memberGroups`, damit `lib/memberAccess.ts`
  den Tier erkennt). Admins werden nicht heruntergestuft.
- **Antwort:** `{ ok, created, userId, email, tier, role, orgId, label, checked }` —
  `checked` ist das Ergebnis des Zurücklesens (Rechte wirklich gesetzt?).
- Existiert der Nutzer schon, wird nur die Berechtigung aktualisiert (kein Passwort-Reset).
- Env nötig: `CLERK_MEMBER_SECRET` (siehe `.env.local` auf vrouwtje).

## Deploy
vercel --prod

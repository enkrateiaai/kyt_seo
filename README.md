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

## Deploy
vercel --prod

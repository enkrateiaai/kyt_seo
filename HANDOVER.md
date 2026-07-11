# Handover: kyt-seo (kundaliniyogatribe.de)

Instructions for any LLM or developer taking over work on this project.

---

## Repository

- **GitHub:** https://github.com/enkrateiaai/kyt_seo
- **Branch:** `main` (single branch, push directly)
- **Local path on Viktor's Mac:** `/Users/viktornikulin/my-dashboard/`

Clone it:
```bash
git clone git@github.com:enkrateiaai/kyt_seo.git
```

---

## What this project is

A Next.js 16 app for **kundaliniyogatribe.de** — a Kundalini Yoga membership site.

Key features:
- `/videos` — video gallery with playlists; members see all, guests see guest-only playlists
- `/admin` — admin panel to manage playlists (Redis-backed)
- `/satnam` — static landing page (`public/satnam/index.html`)
- Clerk for auth (`isMember = user?.publicMetadata?.role === 'member'`)
- Redis (ioredis) for playlist data

---

## Infrastructure

| What | Where |
|------|-------|
| Production host | vrouwtje Pi, Tailscale IP `100.90.161.78` |
| SSH | `ssh vik@vrouwtje` (or `ssh vik@100.90.161.78`) |
| Container name | `kyt-seo` |
| Port | Pi port `3010` → container port `3000` |
| Domain | `kundaliniyogatribe.de` via Cloudflare tunnel |
| Env file on Pi | `/home/vik/docker/kyt-seo/.env.local` |

---

## Deployment rules — READ CAREFULLY

**NEVER build on the Pi.** It crashes the entire host (WordPress, MariaDB, Home Assistant all go down).

Every deploy must follow this sequence:

1. **Commit and push** all changes to `git@github.com:enkrateiaai/kyt_seo.git` (branch: main)
2. **GitHub Actions builds** the linux/arm64 image automatically and pushes to `ghcr.io/enkrateiaai/kyt-seo`
3. **SSH to Pi** and pull + swap the container:

```bash
ssh vik@vrouwtje
docker pull ghcr.io/enkrateiaai/kyt-seo:latest
docker tag kyt-seo:stable kyt-seo:rollback   # keep rollback
docker stop kyt-seo && docker rm kyt-seo
docker run -d \
  --name kyt-seo \
  --init \
  --restart unless-stopped \
  -p 3010:3000 \
  --env-file /home/vik/docker/kyt-seo/.env.local \
  ghcr.io/enkrateiaai/kyt-seo:latest
docker tag ghcr.io/enkrateiaai/kyt-seo:latest kyt-seo:stable
```

4. **Smoke test** — must return 200 before calling it done:
```bash
curl -s -o /dev/null -w "%{http_code}" https://kundaliniyogatribe.de/
```

**Hard stops:**
- No `docker build` or `docker compose build` on vrouwtje
- No `docker start` (reuses old image) — always `docker run` with explicit image
- No deploying uncommitted code
- No claiming success without a passing HTTP 200 check

---

## Instant rollback (if something breaks)

The previous image is always tagged `kyt-seo:rollback` on the Pi:

```bash
ssh vik@vrouwtje
docker stop kyt-seo && docker rm kyt-seo
docker run -d \
  --name kyt-seo \
  --init \
  --restart unless-stopped \
  -p 3010:3000 \
  --env-file /home/vik/docker/kyt-seo/.env.local \
  kyt-seo:rollback
```

---

## Rolling back code to a previous commit

Find the commit you want:
```bash
git log --oneline
```

Roll back (this creates a new commit that reverts — does not rewrite history):
```bash
git revert <commit-sha>        # undo one commit
git push origin main           # triggers CI rebuild and deploy
```

Or to go back to a specific point:
```bash
git revert <newest-sha>..<oldest-sha>   # revert a range
git push origin main
```

---

## Key files

| File | Purpose |
|------|---------|
| `app/videos/gallery.tsx` | Video gallery — playlist visibility logic |
| `app/admin/AdminClient.tsx` | Admin UI — playlist management |
| `app/api/playlists/route.ts` | REST API — playlist CRUD (Redis) |
| `public/satnam/index.html` | Static landing page (1131 lines) |
| `next.config.ts` | Next.js config — has `output: 'standalone'` |
| `Dockerfile.deploy` | Multi-stage build for linux/arm64 |
| `.github/workflows/deploy.yml` | CI/CD — builds and deploys on push to main |

---

## GitHub Actions CI/CD

Workflow: `.github/workflows/deploy.yml`
- Triggers on every push to `main`
- Builds `linux/arm64` image (~20 min via QEMU)
- Pushes to `ghcr.io/enkrateiaai/kyt-seo`
- Deploys via SSH over Tailscale (requires `TS_OAUTH_CLIENT_ID` + `TS_OAUTH_SECRET` secrets in GitHub — ask Viktor to set these up if not done)

Check run status:
```bash
gh run list --repo enkrateiaai/kyt_seo --limit 5
gh run view <run-id> --repo enkrateiaai/kyt_seo
```

---

## Secrets

GitHub Actions secrets already set:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `SSH_DEPLOY_KEY`

Still needed for auto-deploy (SSH via Tailscale):
- `TS_OAUTH_CLIENT_ID`
- `TS_OAUTH_SECRET`

The `.env.local` on the Pi contains all runtime secrets (Redis URL, Clerk keys, etc.). It is NOT in git — do not commit it.

---

## Playlist data (Redis)

Playlists are stored in Redis. Each playlist has:
- `visibleForCustomers` — show to logged-in members
- `visibleForNonCustomers` — show to guests

To inspect or set values directly on the Pi:
```bash
ssh vik@vrouwtje
docker exec -it kyt-seo node -e "
const Redis = require('ioredis');
const r = new Redis(process.env.REDIS_URL);
r.keys('playlist:*').then(k => console.log(k));
"
```

# KYT (kundaliniyogatribe.de) — LLM Handoff Document

*Date:* 2026-09-09
*Repo:* `git@github.com:enkrateiaai/kyt_seo.git` (branch: `main`)
*Live site:* <https://kundaliniyogatribe.de>
*For:* another LLM agent picking up day-to-day operations of the KYT stack

> Authority: managed and monitored, but do not stop production services, change public DNS/routes, delete source data, expose secrets, or perform irreversible actions without Viktor's explicit approval. Prefer backups, read-only checks, reversible changes, pinned versions, and staged cutovers. Never place passwords, API keys, tunnel tokens, bot tokens, or credential payloads in chat, logs, or handoff files.

---

## 1. What this is

A Next.js 16 app that powers the public Kundalini Yoga Tribe site, including:
- Public marketing pages (Artikelen, Blog, Datenschutz)
- Member area (videos, dashboard)
- Admin (playlist manager)
- Studio (live stream studio, integrated with SRS + Flask on Enkra)
- Shop (PayPal integration)

The repo is a single Next.js project deployed as a container image to a Raspberry Pi 4 (`vrouwtje`).

---

## 2. Infrastructure map

| Component | Location | Notes |
|---|---|---|
| Source | `github.com/enkrateiaai/kyt_seo` | branch `main` is production |
| Container registry | `ghcr.io/enkrateiaai/kyt-seo` | tags: `latest`, `prod-nightly`, `snap-YYYYMMDD`, `<sha>` |
| Production host | `vrouwtje` (Raspberry Pi 4, 2 GB RAM) | user `vik`, SSH via Tailscale |
| Production IP (Tailscale) | `100.90.161.78` | GitHub Actions reaches it via Tailscale |
| Domain | `kundaliniyogatribe.de` | Cloudflare DNS |
| Tunnel | `cloudflared-kyt-production` container on vrouwtje | Cloudflare account owned by Viktor |
| App port | container `:3000`, host `:3010` | nginx / cloudflared fronts it |
| Public site | `https://kundaliniyogatribe.de/` | terminates at cloudflared, forwards to localhost:3010 |

### Related / sister systems (do not touch unless explicitly asked)
- **Charan site** (`charan-amrit-kaur.de`) — runs on `enkra`, separate tunnel, separate Cloudflare account
- **SRS / Flask / HLS** — runs on `enkra`, provides the `/studio` and `/stream` flows for this site
- **OpenClaw / n8n / HA** — runs on `enkra`, separate container set
- **frauchen (Pi)** — Solar/inverter side project, not in this deploy path

---

## 3. Repo layout

```
kyt_seo/
├── app/                Next.js app router (routes, pages, components)
│   ├── admin/          Playlist manager
│   ├── api/            Route handlers (incl. live-local-status, stream/switch)
│   ├── blog/, artikel/, datenschutz/, dashboard/, anmeldung/
│   └── studio/         Live-stream studio UI (talks to Flask on Enkra)
├── lib/                Shared client libs
├── kyt_seo/            Subproject (older / nested)
├── docs/               Internal notes
├── scripts/            Healthcheck etc.
├── .github/workflows/
│   ├── deploy.yml      PRODUCTION deploy (manual dispatch)
│   └── staging.yml     Staging image build (push to `staging` branch)
├── Dockerfile.deploy   Multi-stage build for production image
├── BACKLOG.md          Viktor's task list (markdown format)
├── frauchen-handoff.md Unrelated side-project notes (do not mix up)
└── frauchen-solar-handoff.md Unrelated side-project notes
```

`bottle-shop/`, `docs/` content changes, `frauchen-*.md` are uncommitted as of 2026-09-09. Do not touch them unless asked.

---

## 4. Tech stack

- Next.js 16 + Tailwind
- Clerk (Google Auth, role metadata `role: "member"`)
- Upstash Redis (playlist + transcripts storage)
- YouTube Data API v3 (admin pulls)
- PayPal SDK (shop)
- TypeScript strict mode
- ESLint flat config

### Auth roles
- Members get `publicMetadata.role = "member"` set in Clerk Dashboard
- `/videos` is locked behind that role
- `/admin` requires elevated role (set manually)

---

## 5. Deploy flow (production)

Triggered **manually** via `workflow_dispatch` on `.github/workflows/deploy.yml`. There is no auto-deploy.

Pipeline:
1. **typecheck** — `npx tsc --noEmit` on Node 20
2. **build & push** — multi-arch (linux/arm64), tags:
   - `latest`
   - `prod-nightly`
   - `<commit-sha>`
   - `snap-<UTC date YYYYMMDD>`
3. **connect Tailscale** — uses `TS_AUTHKEY` secret
4. **deploy to vrouwtje** — over Tailscale SSH as `vik@100.90.161.78`:
   ```
   docker pull ghcr.io/enkrateiaai/kyt-seo:<sha>
   docker tag kyt-seo:stable kyt-seo:rollback 2>/dev/null || true
   docker stop kyt-seo && docker rm kyt-seo
   docker run -d \
     --name kyt-seo --init --restart unless-stopped \
     -p 3010:3000 \
     --env-file /home/vik/docker/kyt-seo/.env.local \
     -v /home/vik/docker/kyt-seo/public/satnam:/app/public/satnam \
     ghcr.io/enkrateiaai/kyt-seo:<sha>
   docker tag ghcr.io/enkrateiaai/kyt-seo:<sha> kyt-seo:stable
   ```
5. **smoke test** — `curl https://kundaliniyogatribe.de/` must return `200`

### Rollback
The previous image is always preserved as `kyt-seo:rollback` (set by the deploy step). To roll back:

```bash
ssh vik@100.90.161.78
docker stop kyt-seo && docker rm kyt-seo
docker run -d --name kyt-seo --init --restart unless-stopped \
  -p 3010:3000 \
  --env-file /home/vik/docker/kyt-seo/.env.local \
  -v /home/vik/docker/kyt-seo/public/satnam:/app/public/satnam \
  kyt-seo:rollback
docker tag kyt-seo:rollback kyt-seo:stable
```

Earlier images are recoverable from GHCR tags (`prod-nightly`, `snap-YYYYMMDD`, `<sha>`).

---

## 6. Environment

Container reads env from `/home/vik/docker/kyt-seo/.env.local` on vrouwtje. **Never commit this file.**

Variables used (names only, values live in `.env.local` on host):

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser key |
| `CLERK_SECRET_KEY` | Clerk server key |
| `REDIS_URL` | Upstash Redis URL (transcripts, playlist, free flags) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal browser client ID |
| `PAYPAL_CLIENT_ID` | PayPal server client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal server secret |

Build-time args mirror these (see `Dockerfile.deploy`). They are injected by GitHub Actions from repository secrets (`CLERK_SECRET_KEY`, `REDIS_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` / `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `TS_AUTHKEY`, `SSH_DEPLOY_KEY`).

GitHub repo secrets also include `TS_AUTHKEY` (Tailscale) and `SSH_DEPLOY_KEY` (private key matching an authorized key on `vik@100.90.161.78`).

---

## 7. Common operational checks

### Is the site up?
```bash
curl -sI -o /dev/null -w "%{http_code}\n" https://kundaliniyogatribe.de/
```
Expect `200`. Anything else → check `docker ps` on vrouwtje.

### Container health
```bash
ssh vik@100.90.161.78 'docker ps --format "{{.Names}}\t{{.Status}}" | grep kyt-seo'
```
Look for `Up X minutes (healthy)`.

### Disk / memory pressure on vrouwtje
```bash
ssh vik@100.90.161.78 'df -h / && free -h && vcgencmd measure_temp'
```
- Disk: 39 / 57 GB (71 % as of 2026-09-09) — getting tight
- RAM: 2 GB total; app + cloudflared + WP + backups is fine
- Temp: anything > 75 °C is concerning

### Recent deploys
- GitHub Actions: <https://github.com/enkrateiaai/kyt_seo/actions>
- Production deploy is `workflow_dispatch` (manual), no schedule
- Staging deploys on every push to `staging` branch

### View logs
```bash
ssh vik@100.90.161.78 'docker logs --tail 200 kyt-seo'
```

---

## 8. Known quirks

- **`/studio` talks to Flask on Enkra** — `/api/live-local-status` and `/api/stream/switch` route to the SRS control plane on `enkra:8088`. If the studio shows stale data, check Enkra Flask + SRS, not this repo. See `~/srs-studio-handover.md`.
- **`BACKLOG.md` is read by the user via conversation** — Viktor says "schau in den backlog" to make the LLM ingest the file. Don't move/rename it.
- **frauchen handoffs are unrelated** — `frauchen-handoff.md` and `frauchen-solar-handoff.md` in this repo root are about a different (solar/inverter) project. Do not edit them as part of KYT work.
- **No Vercel** — the README mentions `vercel --prod` as legacy. Production is GH Actions → vrouwtje, not Vercel.
- **Cloudflare Tunnel is on a different account than Charan** — do not reuse Charan's tunnel or tokens.
- **Studio GDrive browser** is part of the live studio, not regular Drive sharing. Token lives on Enkra, not in this repo.

---

## 9. Quick triage flowchart

```
Site down?
├── HTTP 5xx
│   ├── docker ps on vrouwtje → container not running? → restart or redeploy
│   ├── container restarting? → docker logs kyt-seo (last 200 lines)
│   └── container running but 5xx? → curl localhost:3010 from vrouwtje directly
├── HTTP 502/504
│   ├── cloudflared-kyt-production not running → docker logs cloudflared-kyt-production
│   └── tunnel config drift → check /home/vik/docker/cloudflared/ on vrouwtje
└── HTTP 200 but content broken
    └── specific page? → check BACKLOG.md, then redeploy previous image
```

---

## 10. Open tasks the next agent should know about

- BACKLOG.md is Viktor's active task list — read it on first contact
- Studio stream-switch race condition was fixed in `049965c`, monitor for regressions
- GDrive scroll hint / viewer tracking shipped in `21aafa4`, monitor engagement
- Counter numbering for new videos must assign a new number, not renumber existing (see session notes 2026-09)


---

## 11. Secret handling protocol

You are operating on Viktor's infrastructure. When you need a secret value (API key, token, password, private key, etc.) to complete a task, follow this protocol.

### When you need a secret

You will encounter tasks like: "deploy this", "rotate the Clerk key", "add a new PayPal client", "fix the webhook". These tasks require real values. **Never invent, guess, derive, or fabricate any secret value.** If a value is not already in your context, you do not have it.

### How to ask Viktor

When you realize you need a secret, stop and ask in this exact format:

> I need a secret for **[purpose, e.g. `REDIS_URL` for build-time injection / `SSH_DEPLOY_KEY` for the deploy step / `PAYPAL_CLIENT_SECRET` for the shop]**.
>
> Where to put it: **[repo secret name OR host path OR env var]**.
>
> Please provide it via the most secure channel you prefer:
> - Paste into chat (acceptable here — this conversation is the operational channel)
> - Add it directly to the host file `/home/vik/docker/kyt-seo/.env.local` on vrouwtje
> - Add it as a GitHub repo secret under Settings → Secrets and variables → Actions
>
> After providing, I'll continue with **[the exact next step I will take]**.

### What NOT to do

- ❌ Do not invent placeholder values like `sk_test_REPLACE_ME` or `xxx`
- ❌ Do not copy values from `.env.local` in your memory if the file may have rotated
- ❌ Do not echo the secret back in chat after using it (one-time use is the goal)
- ❌ Do not write the secret into a file in the repo, even temporarily — `.env.local` and `*.local` are gitignored but assume everything committed is public
- ❌ Do not store the secret in your persistent memory across sessions

### What TO do once received

1. **Use it once** for the immediate task
2. **Persist it in the right place** (host file or repo secret) and tell Viktor where you put it
3. **Do not echo it back** in subsequent messages — refer to it by name only ("the Redis URL is set on vrouwtje")
4. **Suggest rotation timing** — note in your final message if the secret should be rotated soon

### The map of where secrets live

| Purpose | Where |
|---|---|
| Runtime env (Redis, Clerk, PayPal) | `/home/vik/docker/kyt-seo/.env.local` on vrouwtje |
| Build-time env (same names) | GitHub repo secrets → injected via `Dockerfile.deploy` build args |
| GitHub Actions secrets | Repo Settings → Secrets: `CLERK_SECRET_KEY`, `REDIS_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `TS_AUTHKEY`, `SSH_DEPLOY_KEY` |
| Cloudflare tunnel token | `cloudflared-kyt-production` container on vrouwtje, mounted via env or config file |
| Tailscale auth key | GitHub repo secret `TS_AUTHKEY` (rotates) |
| SSH keypair for deploy | Public key in `vik@100.90.161.78`'s `~/.ssh/authorized_keys`; private key in `SSH_DEPLOY_KEY` repo secret |

### Asking Viktor to add a new secret

If the task requires a brand-new credential that doesn't exist yet:

> This needs a new credential we don't have set up. Suggested name: **`[NAME]`**.
>
> To create:
> 1. Get the value from **[where the service issues it, e.g. Clerk dashboard → API keys → new key]**
> 2. Add it to **[host path or repo secret]**
> 3. Tell me when it's added and I'll wire it in

### Trust boundary

Anything Viktor pastes in chat is treated as live, but only the specific value for the specific purpose requested. If Viktor pastes something unrelated (e.g. a different service's key), do not use it for the current task — confirm first.

# Deploying Oberon Prime

This repo (`oberon-nextgenai-mobile`) is one Expo SDK 53 codebase that ships **two** things, plus it
talks to the NestJS API in `oberon-nextgenai-api`. This doc is the end-to-end runbook for getting
everything online on **Easypanel**.

---

## 1. Architecture

```
                         ┌─────────────────────────────┐
   iOS / Android  ◄──────┤  EAS Build → App/Play Store  │   (NOT Easypanel)
   (native app)          └─────────────────────────────┘
                                      │ calls
                                      ▼
   Browser  ◄──── Easypanel: WEB  ───────────►  Easypanel: API (NestJS, :3000)
            static SPA (this repo, nginx)            │
            built with API_ORIGIN baked in           ├── MongoDB (primary)
                                                      ├── MongoDB Atlas (vector search, external)
                                                      └── Redis (queues / cache / rate-limit)
```

Three deployables:

| Target | What it is | Where it runs |
|---|---|---|
| **Native** | iOS/Android binary | **EAS Build → app stores.** Not Easypanel. Just points at the deployed API. |
| **Web** | Static SPA (`react-native-web`) | **Easypanel** App, built from this repo's `Dockerfile`, served by nginx. |
| **API** | NestJS server | **Easypanel** App, built from `oberon-nextgenai-api/Dockerfile`. |

> A React Native app can't itself "run" on a panel. Easypanel only ever hosts the **API** and the
> **static web build**. Phones download the native binary from a store.

---

## 2. Easypanel: backing services (do these first)

The API **will not boot** without Mongo, an Atlas vector cluster, and Redis.

- **Redis** — add an Easypanel Redis service. Set on the API: `REDIS_URL=redis://<redis-service>:6379`.
- **Primary MongoDB** — either add an Easypanel MongoDB service and set
  `MONGO_URI=mongodb://<user>:<pass>@<mongo-service>:27017/<db>?authSource=admin`, or point at Atlas.
- **MongoDB Atlas vector cluster** (required, **external/cloud**) — RAG vector search uses a *dedicated*
  Atlas connection. The API throws on boot if missing. Set:
  - `ATLAS_VECTOR_URI` — the Atlas connection string
  - `ATLAS_VECTOR_DB_NAME` — the vector DB name
  - `ATLAS_VECTOR_INDEX` (optional, default `vector_search_index`)

---

## 3. Easypanel: API service

1. **Create App** → source = `oberon-nextgenai-api` repo, build method = **Dockerfile**.
2. **Port** `3000`. **Domain** e.g. `api.<your-domain>` (Easypanel issues Let's Encrypt TLS).
3. **Healthcheck** `GET /api/health` → `{"status":"ok",...}`.
4. **Volume** mount `/app/uploads` so uploaded files persist across deploys.
5. **Env vars** — see §4. No DB migration step is needed; Mongoose creates collections on demand.
   (Optional seeds exist: `npm run seed:plugins:prod`, `npm run migrate:mcp-tools` — run manually if you
   want the beta plugin catalog / MCP tools.)

### 4. API environment variables

Source of truth for the full list (~120 vars) is `oberon-nextgenai-api/.env.example`. The essentials:

**Required to boot**
| Var | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `MONGO_URI` | primary MongoDB connection string |
| `ATLAS_VECTOR_URI` | Atlas vector cluster (boot fails if unset) |
| `ATLAS_VECTOR_DB_NAME` | Atlas vector DB name (boot fails if unset) |
| `REDIS_URL` | e.g. `redis://redis:6379` |
| `JWT_SECRET` | cryptographically random, 32+ bytes |

**Wiring (set for web + mobile to work end-to-end)**
| Var | Value |
|---|---|
| `CORS_ORIGIN` | `https://app.<your-domain>` (comma-separated for multiple origins) |
| `FRONTEND_URL` | web origin — used in password-reset / invite links |
| `MOBILE_SSO_ALLOWED_REDIRECT_SCHEMES` | `primeai` |
| `APPLE_BUNDLE_ID` | `ai.oberon.prime` |
| `ENCRYPTION_KEY` | 32-byte key for at-rest encryption of OAuth tokens / 2FA secrets |

**Feature-gated (set only for features you use)** — see `.env.example` for names:
- LLM: `OPENAI_API_KEY`, `OPENAI_MODEL`, `GOOGLE_GEMINI_API_KEY`
- Email: `SMTP_*` / `EMAIL_FROM`, or `RESEND_API_KEY`
- Storage: `S3_*`, `AWS_REGION`
- Sign-in SSO: `AUTH_GOOGLE_*`, `AUTH_MICROSOFT_*`
- Integrations: `GOOGLE_CLIENT_*`, `MICROSOFT_*` / `MICROSOFT_TEAMS_*`, `TWILIO_*`, Meta/WhatsApp
  (`META_*`, `WHATSAPP_*`), `N8N_*`, voice (`RETELL_*`, `ELEVENLABS_*`, `VAPI_*`)
- Cron toggles: `CRON_ENABLED` (+ per-job `CRON_*` flags)

---

## 5. Easypanel: web service (this repo)

The web SPA bakes the API URL **at build time** (it's a static bundle — no runtime env).

1. **Create App** → source = this repo, pick the branch to ship, build method = **Dockerfile**.
2. **Build args** (Easypanel → service → Build):
   - `APP_VARIANT=prod`
   - `API_ORIGIN_PROD=https://api.<your-domain>`
3. **Port** `80`. **Domain** e.g. `app.<your-domain>`.
4. **Deploy.**

> ⚠️ Because the API origin is compiled into the bundle, **changing the API URL means redeploying** the
> web app with a new `API_ORIGIN_PROD` build arg. It is not editable at runtime.

The `Dockerfile` runs `expo export --platform web` and serves the output with nginx; `nginx.conf`
provides SPA fallback so `expo-router` deep links resolve.

---

## 6. CORS / cross-origin checklist

The API already supports a cookieless cross-origin web/mobile client — no API code changes needed:

- Set the API's `CORS_ORIGIN` to the web origin (`https://app.<your-domain>`). It's a comma-separated
  allow-list, reflected per-request.
- The web/mobile client authenticates with a **Bearer token**; the API's CSRF guard bypasses CSRF for
  Bearer-only requests, so no CSRF token plumbing is required.
- SSE streaming (`POST /api/chat/stream`, Prime console) works cross-origin once the origin is allowed.
- JWTs are 1-day; there's no refresh endpoint — clients re-authenticate on expiry.

---

## 7. Native app (separate track)

Not an Easypanel deploy. Build with EAS, pointing at the deployed API:

```bash
APP_VARIANT=prod API_ORIGIN_PROD=https://api.<your-domain> eas build --profile production
```

Then submit the resulting binaries to the App Store / Play Store. The native app just calls the same API.

---

## 8. Go-live order

1. Bring up **Redis + Mongo**, and provision the **Atlas vector cluster**.
2. Deploy the **API**; verify `curl https://api.<your-domain>/api/health` → `{"status":"ok"}`.
3. Deploy the **web** app with the build args; load `https://app.<your-domain>`, log in, open Prime, send
   a message and confirm streaming works (validates CORS + SSE + auth).
4. Build & submit the **native** app via EAS.

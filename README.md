# CodePulse

A unified competitive programming dashboard that aggregates your activity across GitHub, LeetCode, Codeforces, and CodeChef — with ML-powered insights on when you code best.

**Live:** [codepulse-gules.vercel.app](https://codepulse-gules.vercel.app)

---

## Features

- **Multi-platform sync** — GitHub contributions, LeetCode problems & contest rating, Codeforces rating history, CodeChef rating & heatmap
- **Unified activity heatmap** — contribution calendar across all platforms in one view
- **Rating graphs** — contest rating history charts per platform
- **Analytics** — streak tracking, day-of-week patterns, platform breakdowns
- **AI peak-time prediction** — XGBoost model identifies your most productive coding hours and days (SHAP-explained)
- **Secure token storage** — platform access tokens encrypted with AES-256-GCM at rest

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 14 (App Router) |
| Auth | Clerk |
| Database | Neon PostgreSQL + Drizzle ORM |
| Cache | Upstash Redis |
| ML Service | FastAPI + XGBoost + SHAP (Python 3.11) |
| Deployment | Vercel (app) + Render (ML) |

---

## Project Structure

```
codepulse/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Authenticated dashboard pages
│   │   └── dashboard/
│   │       ├── analytics/  # ML-powered analytics page
│   │       ├── codechef/   # CodeChef dashboard
│   │       ├── codeforces/ # Codeforces dashboard
│   │       ├── github/     # GitHub dashboard
│   │       └── leetcode/   # LeetCode dashboard
│   └── api/
│       ├── ml/peak-time/   # ML proxy route
│       ├── platforms/      # Per-platform sync routes
│       └── webhooks/clerk/ # Clerk user lifecycle webhook
├── actions/                # Next.js server actions
├── components/             # React components + charts
├── db/                     # Drizzle schema + migrations
├── lib/                    # Redis, encryption, ML client, SSRF guard
├── ml/                     # FastAPI ML service (separate deployment)
│   ├── api.py              # FastAPI app + auth
│   ├── model.py            # XGBoost model + SHAP
│   ├── predict.py          # Per-request training + inference
│   ├── Dockerfile          # Python 3.11 slim
│   └── requirements.txt
└── render.yaml             # Render Blueprint for ML service
```

---

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+ (for ML service)
- A Neon project, Upstash Redis instance, and Clerk application

### 1. Clone and install

```bash
git clone https://github.com/arghya0003/codepulse.git
cd codepulse
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Database (Neon)
DATABASE_URL=postgresql://...?sslmode=require
DIRECT_URL=postgresql://...?sslmode=require

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ML Service (optional — ML sections hidden if not set)
ML_SERVICE_URL=http://localhost:8001
ML_INTERNAL_TOKEN=

# Admin
SETUP_SECRET=
```

### 3. Run database migrations

```bash
npm run db:push
```

### 4. Start the app

```bash
npm run dev
```

### 5. ML service (optional)

```bash
cd ml
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn api:app --port 8001 --reload
```

---

## Deployment

### Architecture

```
User → Vercel (Next.js) → Neon DB
                        → Upstash Redis
                        → Render (ML FastAPI)
                        → External APIs (GitHub, LeetCode, Codeforces, CodeChef)
```

### Deploy ML service (Render)

The `render.yaml` at the repo root defines the ML service as a Blueprint.

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect the GitHub repo — Render auto-reads `render.yaml`
3. After deploy, copy the service URL and the auto-generated `ML_SERVICE_API_KEY` from the Environment tab

### Deploy Next.js (Vercel)

1. Import the repo at [vercel.com](https://vercel.com)
2. Set all environment variables (see `.env.example`)
   - `ML_SERVICE_URL` = Render service URL
   - `ML_INTERNAL_TOKEN` = Render's `ML_SERVICE_API_KEY` value
3. Deploy

### Clerk webhook (required)

After Vercel deployment:
1. Clerk Dashboard → **Webhooks** → Add endpoint: `https://your-app.vercel.app/api/webhooks/clerk`
2. Subscribe to: `user.created`, `user.updated`, `user.deleted`
3. Copy the signing secret → set as `CLERK_WEBHOOK_SECRET` in Vercel → redeploy

---

## Database

```bash
npm run db:push        # sync schema to DB (development)
npm run db:generate    # generate migration files
npm run db:migrate     # apply migrations
npm run db:studio      # open Drizzle Studio
```

### Schema

| Table | Purpose |
|---|---|
| `users` | Clerk user linked to internal ID |
| `platformProfiles` | Per-platform handle, rating, rank, metadata (JSONB) |
| `contributionSnapshots` | Daily activity counts per platform |
| `friendConnections` | Social graph (pending / accepted / blocked) |
| `mlPredictions` | Cached ML model outputs |

---

## ML Service

The FastAPI service trains an XGBoost binary classifier on-the-fly per request using the user's submission history. No pre-trained model file required.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/predict/peak_time` | Full analysis — peak days/hours, SHAP factors, behaviour cluster |
| `POST` | `/predict` | Single (day, hour) probability |
| `POST` | `/recommend` | Top-3 session recommendations |
| `POST` | `/explain` | SHAP explanation for a specific cell |

Authentication: `X-API-Key` header (set `ML_SERVICE_API_KEY` in the Render environment).

> **Note:** Render free tier spins down after 15 min of inactivity (~25s cold start). Add a cron job pinging `/health` every 14 minutes to keep it warm.

---

## Security

- All outbound fetches go through `fetchAllowed()` — SSRF protection via a hostname allowlist
- Platform OAuth tokens encrypted with AES-256-GCM before storage
- Security headers set globally: `X-Frame-Options: DENY`, CSP, `X-Content-Type-Options`, `Referrer-Policy`
- Clerk webhook signature verified on every event

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Yes | Clerk webhook signing secret |
| `DATABASE_URL` | Yes | Neon pooled connection string |
| `DIRECT_URL` | Yes | Neon direct (unpooled) connection string |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |
| `ENCRYPTION_KEY` | Yes | 32-byte hex for AES-256-GCM |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis token |
| `ML_SERVICE_URL` | No | ML service base URL (ML sections hidden if unset) |
| `ML_INTERNAL_TOKEN` | No | API key sent to ML service |
| `SETUP_SECRET` | Yes | Protects `/api/setup` and `/api/migrate` |

---

## License

MIT

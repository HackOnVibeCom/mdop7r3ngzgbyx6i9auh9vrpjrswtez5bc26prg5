# ChaloPlan — Effortless Group Planning in One Link 🎒

**HackOnVibe Nov 2026** | **Solo Project by Mansi Yadav**

> Group planning simplified into a single interactive link: from "let's go somewhere" to live voting, AI-crafted itineraries, and memory keeping. Zero signups required for friends, with a viral growth loop built into every step.

## 🌟 The Pitch

**Problem:** Group plans almost always fail in messy chat threads. Hundreds of messages about "when should we go?" and "where to?", resulting in dispersed dates, budgets, and endless indecision.

**Solution:** One person creates a plan in 30 seconds and shares a single link. Friends vote in 10 seconds without downloading an app or creating an account. The platform deterministically finds the winning date, destination, and budget, while Google Gemini generates the full day-by-day itinerary, assigns tasks, and calculates minimum-transaction expense splits.

**One-liner:** "Group plans die in chat threads. ChaloPlan brings them to life in a single link, engineered to spread virally to new groups with every plan."

## ✨ Key Features

- **Zero Signup Friction** - One link, friends just enter their name and vote in 10 seconds.
- **AI-Powered Itineraries** - Google Gemini 2.0 Flash generates customized schedules, cost breakdowns, and task assignments.
- **Real-Time Synchronous Voting** - Powered by Supabase Realtime for live updates as votes pour in.
- **Fair & Deterministic Decisions** - Scoring algorithms compute winning dates, places, and median budgets directly in code before AI writes the narrative.
- **Greedy Expense Settlement** - Graph-based algorithm minimizes the total number of peer-to-peer transactions required.
- **Organic Viral Loop** - Every shared plan and story card carries referral tracking (`?ref=`), turning participants into new hosts.

## 🚀 Tech Stack

- **Frontend:** Vite + React + Tailwind CSS + Framer Motion
- **Backend:** Supabase (PostgreSQL + Realtime + Storage + Deno Edge Functions)
- **AI Engine:** Google Gemini 2.0 Flash
- **Geodata:** OpenStreetMap (Nominatim API) + Open-Meteo
- **3D:** `@react-three/fiber` globe on `/dashboard`, lazy-loaded so it never ships to the vote page
- **Deployment:** Vercel (SPA + serverless `api/og.js` for crawler link previews)

## 📁 Project Structure

```
chaloplan/
├── src/
│   ├── lib/              # Core business logic
│   │   ├── supabase.js   # Database client & real-time listeners
│   │   ├── ai.js         # Gemini AI wrappers
│   │   ├── decide.js     # Deterministic voting & decision algorithm
│   │   ├── settle.js     # Greedy expense settlement algorithm
│   │   ├── geo.js        # Haversine distance & central meeting point
│   │   ├── share.js      # WhatsApp, Calendar (.ics), & card generation
│   │   └── ...
│   ├── pages/
│   │   ├── Landing.jsx   # Hero + interactive ticket interface
│   │   ├── NewPlan.jsx   # 3-step creation wizard
│   │   ├── PlanPage.jsx  # Live voting + AI itinerary + tasks + expenses
│   │   ├── Share.jsx     # QR code + WhatsApp sharing + story card
│   │   ├── Stats.jsx     # Viral K-factor & growth analytics
│   │   └── Dashboard.jsx # "My Plans" + lazy 3D globe (this device's plans)
│   └── components/       # Design system components
├── api/
│   └── og.js             # Serverless Open Graph HTML for WhatsApp/Twitter crawlers
├── supabase/
│   ├── schema.sql        # Full database schema + Row Level Security
│   └── functions/
│       ├── ai/           # Gemini AI Edge Function
│       ├── places/       # Geocoding & Weather Edge Function
│       └── host/         # Host-authorized operations Edge Function
└── .env.production       # Live production configuration
```

## 📊 How It Works

### 1. Create (30 seconds)
The host selects plan type (Trip, Movie, Birthday, Party, Dinner, or Custom), sets 2–4 dates, destinations, and a budget band.

### 2. Share
A pre-formatted invite message and custom Social Story Card (9:16 PNG) are generated instantly with a short PNR code and QR.

### 3. Vote (10 seconds per friend)
No app install or signup required. Friends open the link on mobile or desktop, tap Yes / Maybe / No for dates, select favorite destinations, and submit their budget preference.

### 4. Deterministic Decision + AI Plan
- **Winning Date:** Highest weighted score (`Yes` = 2 points, `Maybe` = 1 point).
- **Winning Destination:** Highest positive votes (tie-breaks explained by AI).
- **Optimal Budget:** Statistical median of all participant inputs (prevents outliers from skewing the cost).
- **Gemini 2.0 Flash:** Crafts an optimized day-by-day itinerary, expense breakdown, and smart packing list.

### 5. Lock & Calendar Export
The host reviews and locks the plan. All participants receive a standard calendar invitation (`.ics` format) that syncs seamlessly with Google Calendar and Apple Calendar.

### 6. Automated Task Assignments
AI generates and distributes preparation tasks (transportation booking, snacks, packing essentials) among participants.

### 7. Expense Splitting & 1-Click Settlement
Participants log shared expenses. A greedy optimization algorithm computes the minimum number of payments required and provides direct UPI deep links.

## 🎯 Viral Growth Architecture

- **Loop 1 (Voter to Host):** 1 host invites 5–10 friends. Voters experience the smooth zero-friction flow and click "Create your own plan".
- **Loop 2 (Social Sharing):** After a plan is locked, hosts download and share aesthetic Boarding Pass / Story Cards on social media with embedded referral tags (`?ref=`).
- **Telemetry:** Real-time K-factor analytics dashboard available at `/stats`.

## 🔐 Security & Architecture

- **Stateless Device Identification:** Anonymous device IDs stored in local storage eliminate password vulnerability while preserving voter integrity.
- **Row Level Security (RLS):** Strict PostgreSQL policies ensure secure reads, voting inserts, and host modifications.
- **Serverless Edge Isolation:** API keys remain strictly on backend edge functions and are never exposed to the client.

## 🛠️ Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the two values below
npm run dev                  # http://localhost:5173
npm run build                # production build into dist/
```

### Environment variables (names only — never commit values)

Frontend (`.env.local` / Vercel project env — safe to expose, `VITE_` prefix):

| Name | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

Backend secrets (Supabase **secrets** only — **never** use a `VITE_` prefix, never in the frontend):

| Name | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini API key, read by the `ai` Edge Function |
| `GEMINI_MODEL` | Model id, e.g. `gemini-2.0-flash` |
| `SUPABASE_URL` | Auto-injected into Edge Functions by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected; used by `host`/`places` functions |

`.env`, `.env.local`, `.env.production`, `.env.secrets` are git-ignored. Only `.env.example` (placeholders, no values) is committed.

## 🚀 Deploy

1. Run `supabase/schema.sql` once in the Supabase SQL editor (safe to re-run).
2. Set the backend secrets and deploy the three Edge Functions (see **Manual steps** below).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel (Production, Preview, Development) and redeploy.
4. `vercel.json` rewrites `/p/:code` to `api/og` **only** for crawler user-agents (WhatsApp, facebookexternalhit, Twitterbot, TelegramBot, LinkedInBot, Slackbot); humans get the SPA.

## Known limitations

- **Own-vote protection is enforced in the UI** (edit/delete only when `participants.device_id` matches this browser’s `localStorage` device ID). Postgres RLS cannot see that device ID because there is no login/JWT, so a determined caller with the anon key could still patch another row. Host-only generate/lock goes through the `host` Edge Function, which *does* check `host_device_id`.
- Gemini keys live only in Supabase secrets (`GEMINI_API_KEY`, `GEMINI_MODEL`). The frontend never receives them.
- **"My Plans" / dashboard is per-device.** It lists plans whose codes are in this browser’s `localStorage` (created or opened here). Clearing site data or switching devices/browsers empties it — there is no account to sync across devices.
- **Crawler link previews are best-effort.** `api/og.js` fetches the plan with the anon key and returns Open Graph HTML; the human still lands on the SPA. Private/blocked storage or an unreachable DB falls back to generic branded meta tags.
- **Auto-decide runs on first open after the deadline.** If nobody opens the plan after the deadline, it stays in `voting` until someone does; the DB status transition (`where status='voting'`) guarantees it fires at most once.

## ✅ Manual steps for the user

Run these from the `chaloplan/` directory. Nothing interactive — safe for CI.

```bash
# 1. Set backend secrets (use a FRESH key; never commit it)
npx supabase secrets set GEMINI_API_KEY=<NEW_KEY> GEMINI_MODEL=gemini-2.0-flash

# 2. Deploy the three Edge Functions (no JWT so anon clients can call them)
npx supabase functions deploy ai --no-verify-jwt
npx supabase functions deploy places --no-verify-jwt
npx supabase functions deploy host --no-verify-jwt

# 3. Frontend env on Vercel — add for Production, Preview AND Development, then redeploy
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
# repeat the two `env add` commands with `preview` and `development`, then:
npx vercel --prod
```

(In the Vercel dashboard: Project → Settings → Environment Variables also works; tick all three environments, then redeploy.)

### 10-point live smoke test

1. **Create** — open `/new`, build a plan, confirm you land on `/p/<code>`.
2. **Share** — open `/p/<code>/share`, copy the link and the WhatsApp invite; `?ref=` is present on the referral link.
3. **Vote (device A)** — vote as the host; see live results update.
4. **Vote (device B)** — open the link on a second device/incognito, vote as a guest; host sees the new voter in realtime, guest controls are read-only.
5. **Deadline auto-decide** — set a short deadline (dev build exposes a 2-minute option), wait past it, reopen; status moves `voting → deciding → decided` exactly once with an itinerary (or an "approx" fallback).
6. **Lock** — as host, Lock the plan; tasks generate and `.ics` download works.
7. **Tasks** — tick a task; the done count updates.
8. **Expense + UPI** — add an expense, generate a settlement, open "Pay via UPI" / "Scan QR"; if the payee has no UPI id, the payee can add one on their own device.
9. **Dashboard** — open `/dashboard`; your plans appear as pins on the globe (2D card list on low-end/reduced-motion); counts for plans/voters/locked are correct; clicking a pin or card opens the plan.
10. **WhatsApp preview** — paste `/p/<code>` into WhatsApp (or `curl -A WhatsApp https://<domain>/p/<code>`); the unfurled card shows `🎒 <title> — X/Y voted, vote now`.

---

**Built with pride for HackOnVibe 2026 by Mansi Yadav.**

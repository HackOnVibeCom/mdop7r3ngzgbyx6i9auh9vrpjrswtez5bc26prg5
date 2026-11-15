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
- **Deployment:** Cloudflare Pages (Automated CI/CD via GitHub Actions)

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
│   │   └── Stats.jsx     # Viral K-factor & growth analytics
│   └── components/       # Design system components
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

---

**Built with pride for HackOnVibe 2026 by Mansi Yadav.**

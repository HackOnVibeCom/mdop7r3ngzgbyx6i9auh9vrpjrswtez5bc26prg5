# ChaloPlan — Group Planning, Ek Link Mein 🎒

**HackOnVibe Nov 2026** | **Solo by Mansi Yadav**

> Ek link mein poora group plan: "chalo kahin chalte hain" se lekar trip ki memories tak. Friends ko signup nahi karna, aur har plan 5-10 naye log laata hai.

## 🌟 The Pitch

**Problem:** WhatsApp group mein "kab chalein? kahan chalein?" pe 200 messages aate hain aur zyaadatar plans kabhi hote hi nahi. Date, jagah, budget, kaun kya laayega, sab alag-alag jagah bikhra rehta hai.

**Solution:** Ek banda plan banata hai aur link group mein daalta hai. Sab bina signup ke date, jagah aur budget pe vote karte hain. AI final plan + itinerary banata hai, kaam baant deta hai, aur trip ke baad memory card banata hai.

**One-liner:** "Group plans WhatsApp mein marte hain. ChaloPlan unhe ek link mein zinda rakhta hai, aur har plan apne aap naye groups tak pahunchta hai."

## ✨ Key Features

- **Zero Signup** - Ek link, bas naam daalo aur vote karo
- **AI-Powered** - Gemini se itinerary, tasks, aur recap
- **Real-time Voting** - Supabase Realtime se live updates
- **Fair Decisions** - Code se best date/place/budget (AI sirf likhta hai)
- **Expense Settlement** - Greedy algorithm se minimum transactions
- **Viral Loop** - Har plan `?ref=` se naye hosts laata hai

## 🚀 Tech Stack

- **Frontend:** Vite + React + Tailwind CSS + Framer Motion
- **Backend:** Supabase (Postgres + Realtime + Storage + Edge Functions)
- **AI:** Google Gemini 2.0 Flash (free tier)
- **Data:** OpenStreetMap (Nominatim + Overpass) + Open-Meteo
- **Deploy:** Cloudflare Pages (auto from GitHub)

## 📁 Project Structure

```
chaloplan/
├── src/
│   ├── lib/              # Core logic
│   │   ├── supabase.js   # DB client
│   │   ├── ai.js         # AI wrappers
│   │   ├── decide.js     # Voting algorithm
│   │   ├── settle.js     # Expense settlement
│   │   ├── geo.js        # Haversine, meeting point
│   │   ├── share.js      # WhatsApp, .ics, cards
│   │   └── ...
│   ├── pages/
│   │   ├── Landing.jsx   # Hero + floating tickets
│   │   ├── NewPlan.jsx   # 3-step wizard
│   │   ├── PlanPage.jsx  # Vote + AI reveal + details
│   │   ├── Share.jsx     # QR + WhatsApp share
│   │   └── Stats.jsx     # K-factor analytics
│   └── components/       # Reusable UI
├── supabase/
│   ├── schema.sql        # Full schema + RLS
│   └── functions/
│       ├── ai/           # Gemini prompts
│       ├── places/       # Nominatim + Overpass + Weather
│       └── host/         # Host-only operations
└── .env.local            # Your keys here
```

## 🔧 Setup Guide

### Prerequisites
- Node.js 20+
- Supabase account (free)
- Gemini API key (free from aistudio.google.com)

### Step 1: Clone & Install
```bash
git clone <your-repo-url> chaloplan
cd chaloplan
npm install
```

### Step 2: Environment Variables
Create `.env.local`:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Deploy Schema
1. Supabase Dashboard → SQL Editor
2. Paste `supabase/schema.sql`
3. Run

### Step 4: Deploy Edge Functions
```bash
npx supabase login
npx supabase link --project-ref your-ref
npx supabase secrets set GEMINI_API_KEY=your-key
npx supabase secrets set GEMINI_MODEL=gemini-2.0-flash-exp
npx supabase functions deploy ai
npx supabase functions deploy places
npx supabase functions deploy host
```

### Step 5: Run Locally
```bash
npm run dev
```
Visit `http://localhost:5173`

### Step 6: Deploy to Production
```bash
git add .
git commit -m "chore: setup complete"
git push
```
Cloudflare Pages auto-deploys from `main` branch.

## 📊 How It Works

### 1. Create (30 seconds)
Host picks type (Trip/Movie/Birthday/Party), enters 2-4 date options, 2-4 places, budget range.

### 2. Share (WhatsApp)
Pre-filled message: "Mansi ne 'Rishikesh weekend' plan kiya hai 🎒. Date, jagah, budget pe 10 sec mein vote karo 👉 link"

### 3. Vote (10 seconds per friend)
No signup. Enter name, tap Yes/Maybe/No on dates, select place, slide budget. Submit. Live results show who voted.

### 4. AI Plan (auto or host-triggered)
**Decision algorithm (code):**
- Best date = highest score (Yes = 2pts, Maybe = 1pt)
- Best place = most Yes votes (tie = AI picks with reason)
- Best budget = median of all votes

**AI writes (Gemini):**
- Day-by-day itinerary
- Cost breakdown
- Packing list
- Reason ("6/8 log Saturday free hain")

### 5. Lock
Host edits and locks. Everyone gets calendar .ics file + "LOCKED" stamp animation.

### 6. Tasks
AI auto-assigns: "Cab book karo", "Snacks lekar aao", "First-aid kit". Anyone can swap or "I'll do it".

### 7. Expenses (Optional)
Log kharcha → app calculates "kaun kisko kitna" → settle with UPI links (app never touches money).

### 8. Memories (Post-trip)
Upload 1-3 photos → AI recap ("8 dost, 2 din, 1 Maggi point") → shareable Memory Card for Instagram.

## 🎯 Viral Loop

**Loop 1 (Invite):** 1 host → 5-10 friends vote → some click "Plan your own" → new hosts

**Loop 2 (Show-off):** Locked plan → share card on WhatsApp status → their followers see `?ref=` link

**Tracking:** Every plan saves `ref_plan_id`. Stats page shows K-factor.

## 🔐 Security & Privacy

- **No passwords:** Device ID + localStorage for identity
- **No payment:** App never handles money, just UPI deep links
- **RLS:** Supabase Row Level Security (anon can read/insert, host function verifies `host_device_id`)
- **Rate limits:** `place_cache` table prevents Overpass spam

## 📈 Metrics (Target for Demo)

- **15+ real plans** created
- **80+ unique voters**
- **5+ avg voters per plan**
- **K-factor > 0.15** (viral coefficient)

## 🚨 Known Limitations

1. **No live prices** - All costs are AI estimates ("approx" label everywhere)
2. **No auth** - Anyone with link can edit their name/votes (hackathon OK, production needs OTP)
3. **Gemini rate limits** - Free tier has limits; cached fallbacks for demo
4. **Manual booking** - App shows booking links (IRCTC, MakeMyTrip, etc.) but doesn't book

## 🏆 Why This Wins

✅ **Solves a real problem** - Every college group faces this weekly  
✅ **Viral by design** - Each plan brings 5-10 new users  
✅ **AI that matters** - Not just chatbot, actual trip planning  
✅ **Zero friction** - No signup, works on any phone browser  
✅ **Beautiful UI** - Boarding pass theme, smooth animations  
✅ **Complete journey** - Idea → Vote → Plan → Tasks → Settle → Memories

## 🎨 Design System

**Theme:** Boarding pass / travel ticket  
**Colors:** Warm cream paper, bold ink borders, hard shadows, pastel highlights  
**Fonts:** Bricolage Grotesque (display), Inter (body), Caveat (handwritten)  
**Animation:** Framer Motion for page transitions, ticket flips, confetti

## 📜 License

Built for **HackOnVibe Nov 2026**. Open source after the hackathon.

---

**Made with ❤️ and ☕ by Mansi Yadav**

*"Ek link mein saare jhagde khatam"*

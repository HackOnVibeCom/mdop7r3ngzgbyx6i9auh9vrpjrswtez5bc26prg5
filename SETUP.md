# ChaloPlan - Quick Setup Guide 🚀

Step-by-step guide to get ChaloPlan running for HackOnVibe demo.

## ⚡ TL;DR - Do This Now

```bash
# 1. Install dependencies (already done if package.json exists)
npm install

# 2. Fill .env.local with your Supabase keys
# (see below for where to get them)

# 3. Deploy schema to Supabase
# (copy supabase/schema.sql → Supabase SQL Editor → Run)

# 4. Set Gemini secrets and deploy functions
npx supabase secrets set GEMINI_API_KEY=your-key
npx supabase functions deploy ai
npx supabase functions deploy places
npx supabase functions deploy host

# 5. Test locally
npm run dev

# 6. Push to deploy
git push
```

---

## 📋 Detailed Steps

### **Step 1: Get Supabase Keys** (5 min)

1. Go to [supabase.com](https://supabase.com)
2. Sign in / Create account
3. Click "New project"
   - **Name:** chaloplan
   - **Database Password:** (strong password, save it!)
   - **Region:** Mumbai (ap-south-1)
   - **Pricing Plan:** Free
4. Wait ~2 minutes for project to provision
5. Go to **Settings** → **API**
6. Copy these values:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJh.....
service_role key: eyJh..... (click "Reveal" to see)
```

### **Step 2: Fill `.env.local`** (1 min)

Open `.env.local` in the project root and paste:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh.....your-anon-key.....
```

**⚠️ Important:** 
- Never commit this file to git (it's already in `.gitignore`)
- Only `VITE_*` variables are exposed to the browser
- Service role key is ONLY for Edge Functions (set via `supabase secrets`)

### **Step 3: Deploy Database Schema** (2 min)

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open `supabase/schema.sql` in your code editor
4. Copy the ENTIRE file (it's ~300 lines)
5. Paste in SQL Editor
6. Click **Run** (bottom right)
7. You should see "Success. No rows returned."

**Verify:**
- Go to **Table Editor** (left sidebar)
- You should see tables: `plans`, `options`, `participants`, `votes`, `tasks`, `expenses`, etc.

### **Step 4: Get Gemini API Key** (2 min)

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google account
3. Click **"Get API key"** (top right)
4. Click **"Create API key"**
5. Select a Google Cloud project (or create new)
6. Copy the API key (starts with `AIza...`)

**⚠️ Security:** This key will be stored in Supabase secrets, NOT in your code.

### **Step 5: Deploy Edge Functions** (5 min)

**First time setup:**

```bash
# Install Supabase CLI (if not already installed)
npx supabase --version

# Login to Supabase
npx supabase login

# Link your project
# Get project-ref from your Supabase URL: https://[THIS-PART].supabase.co
npx supabase link --project-ref xxxxxxxxxxxxx
```

**Set secrets:**

```bash
# Your Gemini API key
npx supabase secrets set GEMINI_API_KEY=AIza...your-key

# Gemini model name
npx supabase secrets set GEMINI_MODEL=gemini-2.0-flash-exp
```

**Deploy functions:**

```bash
npx supabase functions deploy ai
npx supabase functions deploy places
npx supabase functions deploy host
```

**Verify:**
- Go to **Edge Functions** in Supabase Dashboard
- You should see 3 functions: `ai`, `places`, `host`
- All should have status "Healthy" or "Active"

### **Step 6: Test Locally** (2 min)

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

**Test checklist:**
- ✅ Landing page loads with floating tickets
- ✅ Click "Chalo!" → NewPlan wizard opens
- ✅ Fill Step 1 (type, title, name)
- ✅ Fill Step 2 (dates, places)
- ✅ Fill Step 3 (budget)
- ✅ Click "Plan banao" → redirects to Share page
- ✅ Click "WhatsApp pe bhejo" → pre-filled message

If ANY step fails, check browser console for errors.

### **Step 7: Deploy to Production** (1 min)

```bash
git add .
git commit -m "feat: complete ChaloPlan setup"
git push
```

**What happens:**
1. GitHub workflow triggers (see `.github/workflows/deploy.yml`)
2. Builds your Vite app
3. Cloudflare Pages publishes it
4. Your live URL: `mdop7r3ngzgbyx6i9auh9vrpjrswtez5bc26prg5.hackonvibe.com`

Check **Actions** tab in GitHub to see build progress.

---

## 🐛 Troubleshooting

### "Supabase keys set nahi hain"
- Check `.env.local` exists and has correct keys
- Restart dev server: `Ctrl+C` then `npm run dev`

### "AI function failed"
- Check Gemini API key: `npx supabase secrets list`
- Check Edge Function logs in Supabase Dashboard → Edge Functions → [function] → Logs

### "Could not geocode: [place]"
- Nominatim rate limit hit (1 req/sec)
- Try a more specific place name: "Rishikesh, Uttarakhand" instead of just "Rishikesh"
- Or wait 10 seconds and try again

### "Plan ban nahi paaya"
- Check browser console for errors
- Check Supabase table editor: do `plans` and `options` tables exist?
- Check RLS policies: `supabase/schema.sql` should have created them

### Build fails on Cloudflare Pages
- Check **Actions** tab in GitHub for error logs
- Most common: Tailwind config or import error
- Fix locally first, then push again

---

## 📊 Test with Real Users

### Create a Test Plan

1. Go to `/new`
2. **Type:** Trip
3. **Title:** "Rishikesh test"
4. **Name:** Your name
5. **From:** Your city
6. **Days:** 2
7. **Dates:** This weekend + next weekend
8. **Places:** "Rishikesh", "Mussoorie"
9. **Budget:** ₹1500 - ₹5000
10. Click "Plan banao"

### Share in WhatsApp Group

1. Copy the link from Share page
2. Paste in a friend group
3. Ask 3-4 friends to vote
4. Watch votes appear live!

### Generate AI Plan

1. After 3+ votes, go back to plan page
2. Click "Generate Plan" (if you're host)
3. Wait ~10 seconds for AI
4. See full itinerary, cost breakdown, packing list

### Lock & Share

1. Edit itinerary if needed
2. Click "Lock Plan"
3. Download calendar .ics file
4. Share locked card on WhatsApp status

---

## 📈 Demo Day Checklist

Before submission:

- [ ] 10+ real plans created
- [ ] 50+ votes from actual people
- [ ] At least 1 plan fully locked with tasks
- [ ] Stats page shows K-factor > 0.1
- [ ] Demo video recorded (screen + voiceover)
- [ ] README updated with screenshots
- [ ] Live URL working (test in incognito)
- [ ] GitHub repo public and clean

---

## 🆘 Need Help?

Check these in order:

1. **Browser Console** (F12) - most errors show here
2. **Supabase Logs** - Database → Logs or Edge Functions → [function] → Logs
3. **GitHub Actions** - See build errors
4. **Master Prompt** - Re-read the original build plan for context

---

Good luck with your demo! 🚀

**Remember:** Judges care about:
1. Does it work? (demo live)
2. Does it solve a real problem? (yes, group planning chaos)
3. Is it viral? (show K-factor stats)
4. Is it impressive? (AI + realtime + beautiful UI)

You've got all four. Just get it running! 💪

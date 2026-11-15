import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function originFromReq(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'chaloplan.vercel.app'
  return `${proto}://${host}`
}

export default async function handler(req, res) {
  const code = String(req.query.code || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12)
  const origin = originFromReq(req)
  const spaUrl = `${origin}/p/${code}`
  const image = `${origin}/og-card.svg`

  if (!code) {
    res.status(400).send('Missing plan code')
    return
  }

  let title = '🎒 ChaloPlan — vote now'
  let description = 'Group plans die in chats. Vote in 10 seconds on this ChaloPlan link.'

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data: plan } = await supabase
        .from('plans')
        .select('id, title, emoji, host_name')
        .eq('code', code)
        .maybeSingle()

      if (plan) {
        const { data: participants } = await supabase
          .from('participants')
          .select('id, has_voted')
          .eq('plan_id', plan.id)
        const total = participants?.length || 0
        const voted = (participants || []).filter((p) => p.has_voted).length
        title = `${plan.emoji || '🎒'} ${plan.title} — ${voted}/${total} voted, vote now`
        description = `${plan.host_name} created a plan. Cast your vote in 10 seconds.`
      }
    } catch {
      /* still return shareable HTML so crawlers are not empty */
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:url" content="${escapeHtml(spaUrl)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}">
  <script>location.replace(${JSON.stringify(spaUrl)})</script>
</head>
<body>
  <p>Opening <a href="${escapeHtml(spaUrl)}">${escapeHtml(title)}</a>…</p>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
  res.status(200).send(html)
}

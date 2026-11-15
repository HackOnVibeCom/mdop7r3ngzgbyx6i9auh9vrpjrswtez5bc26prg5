import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, Copy, Download, ImageDown, MessageCircle } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import BoardingPass from '../components/BoardingPass'
import StatusCard from '../components/StatusCard'
import Button from '../components/Button'
import HandNote from '../components/HandNote'
import JourneyRail, { JOURNEY_STAGES } from '../components/JourneyRail'
import Logo from '../components/Logo'
import ViralFooter from '../components/ViralFooter'
import { TicketSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { fetchPlanByCode, optionsOfKind, isHost } from '../lib/plans'
import { copyText, downloadCard, inviteText, planUrl, whatsappLink } from '../lib/share'
import { deadlineLabel } from '../lib/dates'
import { track } from '../lib/events'
import { isSupabaseConfigured } from '../lib/supabase'

/** Invite screen: the host's one job is to get this link into the group. */
export default function Share() {
  const { code = '' } = useParams()
  const clean = code.toLowerCase()
  const toast = useToast()
  const cardRef = useRef(null)

  const [state, setState] = useState({ loading: true, plan: null, options: [], error: '' })
  const [copied, setCopied] = useState(false)
  const [cardBusy, setCardBusy] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setState({ loading: false, plan: null, options: [], error: 'Supabase keys set nahi hain' })
      return
    }
    setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const result = await fetchPlanByCode(clean)
      if (!result) {
        setState({ loading: false, plan: null, options: [], error: 'Yeh plan nahi mila' })
        return
      }
      setState({ loading: false, plan: result.plan, options: result.options, error: '' })
    } catch (err) {
      setState({ loading: false, plan: null, options: [], error: err.message || 'Load nahi hua' })
    }
  }, [clean])

  useEffect(() => {
    load()
  }, [load])

  const { loading, plan, options, error } = state
  const dateOptions = optionsOfKind(options, 'date')
  const placeOptions = optionsOfKind(options, 'place')
  const link = planUrl(clean)

  const message = plan
    ? inviteText({ hostName: plan.host_name, title: plan.title, emoji: plan.emoji, code: plan.code })
    : ''

  async function onCopy() {
    const ok = await copyText(link)
    if (ok) {
      setCopied(true)
      track('share_click', plan ? plan.id : null)
      setTimeout(() => setCopied(false), 1800)
    } else {
      toast.error('Copy nahi hua — link manually select kar lo')
    }
  }

  async function onCard() {
    setCardBusy(true)
    try {
      const result = await downloadCard(cardRef.current, `chaloplan-${clean}.png`)
      track('card_download', plan ? plan.id : null)
      if (result === 'downloaded') toast.ok('Card download ho gaya — status pe daal do')
      if (result === 'shared') toast.ok('Bhej diya!')
    } catch {
      toast.error('Card ban nahi paaya, phir try karo')
    } finally {
      setCardBusy(false)
    }
  }

  if (loading) {
    return (
      <PageTransition className="px-4 pt-6">
        <TicketSkeleton lines={4} />
      </PageTransition>
    )
  }

  if (error || !plan) {
    return (
      <PageTransition className="px-4 pb-16 pt-6">
        <Logo size="sm" />
        <div className="mt-8 rounded-card border-2 border-ink bg-paper p-5 text-center shadow-riso">
          <p className="font-hand text-h2 text-rani">Arre!</p>
          <h1 className="mt-1 text-h2 font-black">{error || 'Plan nahi mila'}</h1>
          <p className="mt-2 text-small text-ink/70">Code dobara check karo, ya naya plan bana lo.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Button type="button" tone="peacock" block onClick={load}>
              Phir try karo
            </Button>
            <Button as={Link} to="/new" tone="paper" block>
              Naya plan banao
            </Button>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="pb-10">
      <header className="flex items-center justify-between px-4 pt-5">
        <Logo size="sm" />
        <Link
          to={`/p/${clean}`}
          className="rounded-[10px] border-2 border-ink bg-paper-dark px-2.5 py-1 text-micro font-bold uppercase"
        >
          Plan dekho
        </Link>
      </header>

      <div className="px-4 pt-4">
        <h1 className="text-h1 font-black">Link ban gaya! 🎟️</h1>
        <p className="mt-1 text-small text-ink/70">
          {isHost(plan) ? 'Tum host ho.' : 'Host ne banaya hai.'} Ab group mein daalo —{' '}
          {deadlineLabel(plan.deadline)}.
        </p>
      </div>

      <div className="mt-4 px-4">
        <BoardingPass plan={plan} dateOptions={dateOptions} placeOptions={placeOptions} />
      </div>

      <div className="mt-4 px-4">
        <div className="rounded-card border-2 border-ink bg-paper-dark p-3">
          <JourneyRail stages={JOURNEY_STAGES} current={1} compact />
        </div>
      </div>

      {/* actions */}
      <section className="mt-5 space-y-2 px-4">
        <Button
          as="a"
          href={whatsappLink(message)}
          target="_blank"
          rel="noreferrer"
          tone="peacock"
          size="lg"
          block
          onClick={() => track('share_click', plan.id)}
        >
          <MessageCircle size={20} strokeWidth={2.5} /> WhatsApp pe bhejo
        </Button>

        <div className="flex gap-2">
          <Button type="button" tone="paper" size="md" block onClick={onCopy}>
            {copied ? <Check size={18} strokeWidth={2.5} /> : <Copy size={18} strokeWidth={2.5} />}
            {copied ? 'Copy ho gaya' : 'Link copy'}
          </Button>
          <Button type="button" tone="haldi" size="md" block loading={cardBusy} onClick={onCard}>
            <ImageDown size={18} strokeWidth={2.5} /> Status card
          </Button>
        </div>

        <div className="rounded-input border-2 border-dashed border-ink/40 bg-paper p-3">
          <p className="font-mono text-micro uppercase tracking-widest text-ink/50">link</p>
          <p className="mt-0.5 break-all font-mono text-small font-bold">{link}</p>
        </div>

        <HandNote dir="left">Group mein daalo, phir maza aayega</HandNote>
      </section>

      {/* message preview */}
      <section className="mt-6 px-4">
        <h2 className="text-h3 font-black">Jo message jayega</h2>
        <div className="mt-2 rounded-card border-2 border-ink bg-[#DCF8C6] p-3 shadow-riso-sm">
          <p className="whitespace-pre-line text-small">{message}</p>
        </div>
      </section>

      {/* status card preview */}
      <section className="mt-6 px-4">
        <h2 className="text-h3 font-black">Status card</h2>
        <p className="mt-1 text-small text-ink/70">Yeh image WhatsApp status pe daal do, log khud aayenge.</p>
        {/* The card is exported at its true 360x640 size, so it is only visually scaled here. */}
        <div className="mt-3 h-[500px] overflow-hidden sm:h-[660px]">
          <div className="origin-top scale-[0.78] sm:scale-100" style={{ width: 360 }}>
            <StatusCard ref={cardRef} plan={plan} dateOptions={dateOptions} placeOptions={placeOptions} />
          </div>
        </div>
        <Button type="button" tone="paper" size="md" block loading={cardBusy} onClick={onCard}>
          <Download size={18} strokeWidth={2.5} /> Card download karo
        </Button>
      </section>

      <ViralFooter refCode={plan.code} planId={plan.id} />
    </PageTransition>
  )
}

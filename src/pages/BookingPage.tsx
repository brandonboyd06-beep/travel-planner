import { useMemo, useState, type CSSProperties } from 'react'
import {
  Bus,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  Info,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { PageHeader, SectionHeading } from '../components/AppShell'
import { AlertBanner, Button } from '../components/ui'
import { bookingItems, bookingSources, type BookingItem } from '../data/bookings'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getSupabaseClient } from '../lib/supabase'

type LiveStatus = 'open' | 'limited' | 'sold_out' | 'not_open' | 'verify'

interface LiveItem {
  id: string
  status: LiveStatus
  headline: string
  detail: string
}

interface LiveCheck {
  checkedAt: string
  overall: string
  items: LiveItem[]
  searchedWeb: boolean
}

const statusLabels: Record<LiveStatus, string> = {
  open: 'Booking open',
  limited: 'Limited',
  sold_out: 'Sold out',
  not_open: 'Not open',
  verify: 'Check calendar',
}

const priorityLabels = {
  'book-now': 'Book now',
  'plan-soon': 'Plan soon',
  'verify-later': 'Verify later',
}

function formatCheckedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recently'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date)
}

function BookingRow({
  item,
  done,
  live,
  onToggle,
}: {
  item: BookingItem
  done: boolean
  live?: LiveItem
  onToggle: () => void
}) {
  return (
    <article className={`booking-row ${done ? 'complete' : ''}`}>
      <button className="booking-check" type="button" onClick={onToggle} aria-label={`${done ? 'Mark not booked' : 'Mark booked'}: ${item.title}`}>
        {done ? <CheckCircle2 /> : <Circle />}
      </button>
      <div className="booking-main">
        <div className="booking-title-line">
          <div>
            <span>{item.category}</span>
            <h3>{item.title}</h3>
          </div>
          <span className={`booking-priority ${item.priority}`}>{done ? 'Booked' : priorityLabels[item.priority]}</span>
        </div>
        <div className="booking-timing">
          <span><CalendarCheck2 />{item.tripDate}</span>
          <strong><Clock3 />{item.deadline}</strong>
        </div>
        {item.fallback ? <p className="booking-fallback"><ShieldCheck />{item.fallback}</p> : null}
        <p className="booking-summary">{item.summary}</p>
        <ol className="booking-instructions">
          {item.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
        </ol>
        {live ? (
          <div className={`booking-live-result ${live.status}`}>
            <span>{statusLabels[live.status]}</span>
            <div><strong>{live.headline}</strong><p>{live.detail}</p></div>
          </div>
        ) : null}
      </div>
      <aside className="booking-actions">
        <a className="button primary" href={item.bookingUrl} target="_blank" rel="noopener noreferrer">{item.bookingLabel}<ExternalLink /></a>
        <a href={item.infoUrl} target="_blank" rel="noopener noreferrer">Read {item.sourceLabel} details<ExternalLink /></a>
        <button type="button" className="booking-done-button" onClick={onToggle}>{done ? <><Check />Booked</> : 'Mark as booked'}</button>
      </aside>
    </article>
  )
}

export function BookingPage() {
  const [completed, setCompleted] = useLocalStorage<string[]>('booking-progress', [])
  const [liveCheck, setLiveCheck] = useLocalStorage<LiveCheck | null>('booking-live-check', null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const shuttleDone = completed.includes('parks-lakes-shuttle') || completed.includes('roam-super-pass')
  const completedActions = (shuttleDone ? 1 : 0) + bookingItems.slice(2).filter((item) => completed.includes(item.id)).length
  const nextItem = bookingItems.find((item) => {
    if (item.id === 'parks-lakes-shuttle' || item.id === 'roam-super-pass') return !shuttleDone
    return !completed.includes(item.id)
  })
  const liveById = useMemo(() => new Map(liveCheck?.items.map((item) => [item.id, item]) ?? []), [liveCheck])

  const toggle = (id: string) => setCompleted((current) => current.includes(id)
    ? current.filter((entry) => entry !== id)
    : [...current, id])

  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    setError('')
    try {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Live checks need the Supabase project settings on this deployment.')
      const { data, error: functionError } = await client.functions.invoke('booking-readiness', {
        body: { force: true },
      })
      if (functionError) {
        const context = (functionError as { context?: Response }).context
        const result = context ? await context.clone().json().catch(() => ({})) as { error?: string } : {}
        throw new Error(result.error || functionError.message || 'The live booking check failed.')
      }
      if (!data || typeof data.checkedAt !== 'string' || !Array.isArray(data.items)) {
        throw new Error('The live booking check returned an incomplete result.')
      }
      setLiveCheck(data as LiveCheck)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The live booking check failed.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Book & Reserve"
        subtitle="One place to see what needs action, when to do it, and where to book"
        actions={<Button className="primary" onClick={() => void refresh()} disabled={refreshing}><RefreshCw className={refreshing ? 'spin' : ''} />{refreshing ? 'Checking official sites…' : 'Refresh live guidance'}</Button>}
      />

      <section className="booking-command panel">
        <div className="booking-progress-ring" style={{ '--progress': `${completedActions / 5 * 360}deg` } as CSSProperties}>
          <span><strong>{completedActions}</strong>/5</span>
        </div>
        <div className="booking-command-copy">
          <span className="booking-eyebrow"><Sparkles />What to do next</span>
          <h2>{nextItem ? (shuttleDone ? nextItem.title : 'Reserve one lake-shuttle option') : 'The booking plan is handled'}</h2>
          <p>{nextItem
            ? (shuttleDone ? nextItem.deadline : 'Start with Roam from Banff; use Parks Canada Park & Ride as the alternative.')
            : 'Everything in the action center has been marked complete.'}</p>
        </div>
        <div className="booking-command-status">
          {liveCheck ? <><span><i />Official guidance checked</span><strong>{formatCheckedAt(liveCheck.checkedAt)}</strong></> : <><span><i className="idle" />Live guidance not checked</span><strong>Use Refresh before booking</strong></>}
        </div>
      </section>

      {liveCheck ? <AlertBanner tone="info"><strong>Latest live guidance:</strong><span> {liveCheck.overall} Date-specific seat inventory may only appear inside the provider’s booking calendar.</span></AlertBanner> : null}
      {error ? <div className="booking-error" role="alert"><Info /><span>{error} The direct official booking buttons still work.</span><button type="button" onClick={() => setError('')}>Dismiss</button></div> : null}

      <section className="booking-section">
        <div className="booking-section-heading">
          <span>1</span>
          <div><h2>Choose one lake-shuttle plan</h2><p>This is the only transportation reservation the itinerary truly depends on.</p></div>
          <span className={`booking-choice-state ${shuttleDone ? 'done' : ''}`}>{shuttleDone ? <Check /> : <Bus />}{shuttleDone ? 'Selected' : 'Choose one'}</span>
        </div>
        <div className="booking-list">
          {bookingItems.slice(0, 2).map((item) => <BookingRow key={item.id} item={item} done={completed.includes(item.id)} live={liveById.get(item.id)} onToggle={() => toggle(item.id)} />)}
        </div>
      </section>

      <section className="booking-section">
        <div className="booking-section-heading">
          <span>2</span>
          <div><h2>Lock the timed experiences</h2><p>These are optional. Decide first, then use the direct provider button.</p></div>
          <span className="booking-choice-state"><Route />In trip order</span>
        </div>
        <div className="booking-list">
          {bookingItems.slice(2).map((item) => <BookingRow key={item.id} item={item} done={completed.includes(item.id)} live={liveById.get(item.id)} onToggle={() => toggle(item.id)} />)}
        </div>
      </section>

      <section className="panel booking-source-panel">
        <SectionHeading title="Official sources used for this plan" />
        <p>The deadline recommendations combine official 2026 operating rules with a practical buffer for a group of four.</p>
        <div>{bookingSources.map((source) => <a href={source.href} target="_blank" rel="noopener noreferrer" key={source.href}>{source.label}<ExternalLink /></a>)}</div>
      </section>
    </>
  )
}

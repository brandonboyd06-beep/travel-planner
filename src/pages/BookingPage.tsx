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
import { AppLink } from '../components/AppLink'
import { AlertBanner, Button } from '../components/ui'
import { useCollaboration } from '../context/collaboration'
import { useItinerary } from '../context/itinerary'
import { bookingItems, bookingSources } from '../data/bookings'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { isShuttleBooking, reconcileBookingItems, selectExclusiveShuttle, type ReconciledBookingItem } from '../lib/bookingPlan'
import { getTransportationResearchGap, hasLodgingResearchGap, summarizeItinerary } from '../lib/itinerarySummary'
import { getSupabaseClient } from '../lib/supabase'
import '../reconciliation.css'

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
  scheduleKey: string
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

function storedLiveCheck(value: unknown, scheduleKey: string): LiveCheck | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Partial<LiveCheck>
  const validStatuses = new Set<LiveStatus>(['open', 'limited', 'sold_out', 'not_open', 'verify'])
  if (
    candidate.scheduleKey !== scheduleKey
    || typeof candidate.checkedAt !== 'string'
    || typeof candidate.overall !== 'string'
    || typeof candidate.searchedWeb !== 'boolean'
    || !Array.isArray(candidate.items)
    || candidate.items.some((item) => !item || typeof item !== 'object'
      || typeof item.id !== 'string' || !validStatuses.has(item.status)
      || typeof item.headline !== 'string' || typeof item.detail !== 'string')
  ) return null
  return candidate as LiveCheck
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
  canEdit,
  onToggle,
}: {
  item: ReconciledBookingItem
  done: boolean
  live?: LiveItem
  canEdit: boolean
  onToggle: () => void
}) {
  const canToggle = canEdit && (item.inCurrentPlan || done)
  const planStatus = done ? 'Review or cancel' : 'Not in itinerary'
  return (
    <article className={`booking-row ${done ? 'complete' : ''} ${item.inCurrentPlan ? '' : 'not-in-plan'}`}>
      <button className="booking-check" type="button" onClick={onToggle} disabled={!canToggle} aria-label={`${done ? 'Mark no longer booked' : 'Mark booked'}: ${item.title}`}>
        {done ? <CheckCircle2 /> : <Circle />}
      </button>
      <div className="booking-main">
        <div className="booking-title-line">
          <div>
            <span>{item.category}</span>
            <h3>{item.title}</h3>
          </div>
          <span className={`booking-priority ${item.inCurrentPlan ? item.priority : 'removed'}`}>{item.inCurrentPlan ? (done ? 'Booked' : priorityLabels[item.priority]) : planStatus}</span>
        </div>
        {item.inCurrentPlan ? <div className="booking-timing">
          <span><CalendarCheck2 />{item.tripDate}</span>
          <strong><Clock3 />{item.deadline}</strong>
        </div> : <div className="booking-timing removed"><span><ShieldCheck />Research only · no booking action until this is added back</span></div>}
        {!item.inCurrentPlan ? (
          <div className={`booking-plan-warning ${done ? 'booked' : ''}`} role="status">
            <ShieldCheck />
            <div><strong>{done ? 'This was marked booked, but it is no longer in the itinerary.' : 'Do not book this unless you add it back to the itinerary.'}</strong><p>{done ? 'Open the provider page to review or cancel it, then mark it resolved here.' : 'The official links remain available for research only.'}</p></div>
          </div>
        ) : null}
        {item.inCurrentPlan && item.fallback ? <p className="booking-fallback"><ShieldCheck />{item.fallback}</p> : null}
        <p className="booking-summary">{item.summary}</p>
        {item.inCurrentPlan ? <ol className="booking-instructions">
          {item.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
        </ol> : null}
        {item.inCurrentPlan && live ? (
          <div className={`booking-live-result ${live.status}`}>
            <span>{statusLabels[live.status]}</span>
            <div><strong>{live.headline}</strong><p>{live.detail}</p></div>
          </div>
        ) : null}
      </div>
      <aside className="booking-actions">
        <a className={`button ${item.inCurrentPlan ? 'primary' : 'secondary'}`} href={item.bookingUrl} target="_blank" rel="noopener noreferrer">{done && !item.inCurrentPlan ? 'Manage or review booking' : item.bookingLabel}<ExternalLink /></a>
        <a href={item.infoUrl} target="_blank" rel="noopener noreferrer">Read {item.sourceLabel} details<ExternalLink /></a>
        {!item.inCurrentPlan && !done ? <AppLink className="booking-add-back" href="/itinerary">Add it back first</AppLink> : <button type="button" className="booking-done-button" onClick={onToggle} disabled={!canEdit}>{done ? <><Check />{item.inCurrentPlan ? 'Booked' : 'Mark resolved'}</> : 'Mark as booked'}</button>}
      </aside>
    </article>
  )
}

export function BookingPage() {
  const { trip } = useCollaboration()
  const { plan } = useItinerary()
  const canEdit = trip?.role !== 'viewer'
  const [completed, setCompleted] = useLocalStorage<string[]>('booking-progress', [])
  const [liveCheck, setLiveCheck] = useLocalStorage<unknown>('booking-live-check', null)
  const [reviewedPlanIdentity, setReviewedPlanIdentity] = useLocalStorage<string | number>('booking-reviewed-revision', '')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const reconciledItems = useMemo(() => reconcileBookingItems(plan, bookingItems), [plan])
  const scheduledItems = reconciledItems.filter((item) => item.inCurrentPlan)
  const requestedItems = useMemo(() => scheduledItems.map((item) => ({ id: item.id, title: item.title, date: `${item.tripDate}, 2026` })), [scheduledItems])
  const scheduleKey = useMemo(() => JSON.stringify(requestedItems), [requestedItems])
  const itinerarySummary = useMemo(() => summarizeItinerary(plan), [plan])
  const bookingResearchGap = hasLodgingResearchGap(plan) || getTransportationResearchGap(plan).changed
  const scheduledShuttles = scheduledItems.filter(isShuttleBooking)
  const scheduledExperiences = scheduledItems.filter((item) => !isShuttleBooking(item))
  const completedShuttleId = [...completed].reverse().find((id) => isShuttleBooking({ id }))
  const isCompleted = (item: { id: string }) => isShuttleBooking(item) ? item.id === completedShuttleId : completed.includes(item.id)
  const shuttleDone = scheduledShuttles.some((item) => isCompleted(item))
  const shuttleNeedsAction = scheduledShuttles.length > 0 && !shuttleDone
  const totalActions = (scheduledShuttles.length > 0 ? 1 : 0) + scheduledExperiences.length
  const completedActions = (shuttleDone ? 1 : 0) + scheduledExperiences.filter(isCompleted).length
  const nextItem = shuttleNeedsAction ? scheduledShuttles[0] : scheduledExperiences.find((item) => !isCompleted(item))
  const missingItems = reconciledItems.filter((item) => !item.inCurrentPlan)
  const needsRevisionReview = plan.revision > 0 && reviewedPlanIdentity !== plan.updatedAt
  const activeLiveCheck = storedLiveCheck(liveCheck, scheduleKey)
  const liveById = useMemo(() => new Map(activeLiveCheck?.items.map((item) => [item.id, item]) ?? []), [activeLiveCheck])

  const toggle = (id: string) => {
    if (!canEdit) return
    setCompleted((current) => isShuttleBooking({ id })
    ? selectExclusiveShuttle(current, id)
    : current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id])
  }

  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    setError('')
    try {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Live booking checks are not connected on this deployment yet.')
      const { data, error: functionError } = await client.functions.invoke('booking-readiness', {
        body: { items: requestedItems },
      })
      if (functionError) {
        const context = (functionError as { context?: Response }).context
        const result = context ? await context.clone().json().catch(() => ({})) as { error?: string } : {}
        throw new Error(result.error || functionError.message || 'The live booking check failed.')
      }
      const requestedIds = new Set(requestedItems.map((item) => item.id))
      const validStatuses = new Set<LiveStatus>(['open', 'limited', 'sold_out', 'not_open', 'verify'])
      const responseItems = Array.isArray(data?.items) ? data.items as Array<Record<string, unknown>> : []
      const returnedIds = new Set(responseItems.map((item) => item.id))
      if (
        !data || typeof data.checkedAt !== 'string' || typeof data.overall !== 'string'
        || typeof data.searchedWeb !== 'boolean' || responseItems.length !== requestedItems.length
        || returnedIds.size !== requestedIds.size || [...returnedIds].some((id) => typeof id !== 'string' || !requestedIds.has(id))
        || responseItems.some((item) => typeof item.id !== 'string' || !validStatuses.has(item.status as LiveStatus) || typeof item.headline !== 'string' || typeof item.detail !== 'string')
      ) {
        throw new Error('The live booking check returned an incomplete result.')
      }
      setLiveCheck({ ...data, items: responseItems as unknown as LiveItem[], scheduleKey } as LiveCheck)
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
        subtitle={`Matched to itinerary Revision ${plan.revision} · dates update when the plan changes`}
        actions={<Button className="primary" onClick={() => void refresh()} disabled={refreshing}><RefreshCw className={refreshing ? 'spin' : ''} />{refreshing ? 'Checking official sites…' : 'Refresh live guidance'}</Button>}
      />

      {needsRevisionReview ? (
        <section className="reconciliation-banner" role="status" aria-live="polite">
          <div className="reconciliation-icon"><ShieldCheck /></div>
          <div><span>Itinerary Revision {plan.revision}</span><h2>Review reservation changes before anyone books</h2><p>Dates below now come from the current itinerary. {missingItems.length} {missingItems.length === 1 ? 'item is' : 'items are'} no longer in the plan and {missingItems.some(isCompleted) ? 'at least one existing booking needs review or cancellation.' : 'should not be booked unless added back.'}</p></div>
          <Button className="primary" disabled={!canEdit} onClick={() => setReviewedPlanIdentity(plan.updatedAt)}><Check />{canEdit ? 'I reviewed this revision' : 'Editor review needed'}</Button>
        </section>
      ) : plan.revision > 0 ? <div className="reconciliation-reviewed"><CheckCircle2 />Reservation guide reviewed for itinerary Revision {plan.revision}</div> : null}

      {bookingResearchGap ? <AlertBanner><strong>New route research is still needed.</strong><span> Revision {plan.revision} now uses {itinerarySummary.baseSummary}. This action center safely rematches known providers, but new lodging, transportation, and destination reservations still need a fresh Miller Time review before the group treats the trip as fully booked. </span><AppLink className="text-link" href="/itinerary">Review with Miller Time</AppLink></AlertBanner> : null}

      <section className="booking-command panel">
        <div className="booking-progress-ring" style={{ '--progress': `${totalActions > 0 ? completedActions / totalActions * 360 : 0}deg` } as CSSProperties}>
          <span><strong>{completedActions}</strong>/{totalActions}</span>
        </div>
        <div className="booking-command-copy">
          <span className="booking-eyebrow"><Sparkles />What to do next</span>
          <h2>{nextItem ? (shuttleNeedsAction ? 'Reserve one lake-shuttle option' : nextItem.title) : bookingResearchGap ? 'Known bookings are handled — new route research remains' : totalActions > 0 ? 'The current booking plan is handled' : 'No listed reservations are required by the current itinerary'}</h2>
          <p>{nextItem
            ? (shuttleNeedsAction ? `Choose one official option for ${nextItem.tripDate}. Selecting one automatically clears the other.` : nextItem.deadline)
            : bookingResearchGap ? 'Ask Miller Time to identify any new lodging, transportation, and timed-entry bookings for the revised route.' : totalActions > 0 ? 'Everything currently scheduled in the action center has been marked complete.' : 'The provider links below remain available for research, but do not book missing items unless you add them back.'}</p>
        </div>
        <div className="booking-command-status">
          {activeLiveCheck ? <><span><i className={activeLiveCheck.searchedWeb ? '' : 'idle'} />{activeLiveCheck.searchedWeb ? 'Official guidance checked' : 'Saved guidance loaded'}</span><strong>{formatCheckedAt(activeLiveCheck.checkedAt)}</strong></> : <><span><i className="idle" />Live guidance not checked</span><strong>Use Refresh before booking</strong></>}
        </div>
      </section>

      {activeLiveCheck ? <AlertBanner tone="info"><strong>{activeLiveCheck.searchedWeb ? 'Latest official-source guidance:' : 'Latest saved guidance:'}</strong><span> {activeLiveCheck.overall} Date-specific seat inventory may only appear inside the provider’s booking calendar.</span></AlertBanner> : null}
      {error ? <div className="booking-error" role="alert"><Info /><span>{error} The direct official booking buttons still work.</span><button type="button" onClick={() => setError('')}>Dismiss</button></div> : null}

      <section className="booking-section">
        <div className="booking-section-heading">
          <span>1</span>
          <div><h2>Choose one lake-shuttle plan</h2><p>{scheduledShuttles.length > 0 ? `Required by the current Moraine Lake day on ${scheduledShuttles[0]?.tripDate}.` : 'Moraine Lake is not in the current itinerary, so neither option should be booked.'}</p></div>
          <span className={`booking-choice-state ${shuttleDone ? 'done' : ''}`}>{shuttleDone ? <Check /> : <Bus />}{shuttleDone ? 'Selected' : scheduledShuttles.length > 0 ? 'Choose one' : 'Not needed'}</span>
        </div>
        <div className="booking-list">
          {reconciledItems.filter(isShuttleBooking).map((item) => <BookingRow key={item.id} item={item} done={isCompleted(item)} live={liveById.get(item.id)} canEdit={canEdit} onToggle={() => toggle(item.id)} />)}
        </div>
      </section>

      <section className="booking-section">
        <div className="booking-section-heading">
          <span>2</span>
          <div><h2>Lock the timed experiences</h2><p>Only items matched to the current itinerary should be booked. Removed ideas stay visible for review.</p></div>
          <span className="booking-choice-state"><Route />In trip order</span>
        </div>
        <div className="booking-list">
          {reconciledItems.filter((item) => !isShuttleBooking(item)).map((item) => <BookingRow key={item.id} item={item} done={isCompleted(item)} live={liveById.get(item.id)} canEdit={canEdit} onToggle={() => toggle(item.id)} />)}
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

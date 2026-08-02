import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, BedDouble, Check, Copy, GitCompareArrows, Share2, X } from 'lucide-react'
import { previewProposal, proposalAffectedDayIds } from '../lib/itineraryPlan'
import { lodgingOptionsForSegment, lodgingSegmentsForItinerary } from '../lib/lodgingPlan'
import type { ItineraryDay, ItineraryPlan, ItineraryProposal, ItineraryStop } from '../types'
import { AppLink } from './AppLink'
import { Button } from './ui'

interface ItineraryComparisonModalProps {
  proposal: ItineraryProposal
  currentPlan: ItineraryPlan
  canApply: boolean
  applied?: boolean
  onApply: () => void
  onClose: () => void
}

type PreviewResult = {
  plan: ItineraryPlan | null
  error: string
}

function normalizedName(value: string) {
  return value.toLocaleLowerCase('en-CA').replace(/[^a-z0-9]+/g, ' ').trim()
}

function changedStops(day: ItineraryDay | undefined, comparisonDay: ItineraryDay | undefined) {
  if (!day) return []
  if (!comparisonDay) return day.stops.map(() => true)
  const available = comparisonDay.stops.map((stop) => ({ stop, used: false }))

  return day.stops.map((stop, index) => {
    const matchIndex = available.findIndex((candidate) => !candidate.used && (
      candidate.stop.id === stop.id
      || normalizedName(candidate.stop.name) === normalizedName(stop.name)
    ))
    if (matchIndex < 0) return true
    const match = available[matchIndex]
    match.used = true
    return (
      (day.stops.length === comparisonDay.stops.length && matchIndex !== index)
      || match.stop.name !== stop.name
      || match.stop.kind !== stop.kind
      || match.stop.priority !== stop.priority
      || match.stop.note !== stop.note
      || match.stop.mapsQuery !== stop.mapsQuery
      || JSON.stringify(match.stop.coordinates) !== JSON.stringify(stop.coordinates)
    )
  })
}

function priorityLabel(stop: ItineraryStop) {
  if (stop.priority === 'fixed') return 'Fixed logistics'
  if (stop.priority === 'optional') return 'Optional'
  return 'Core plan'
}

function DaySnapshot({
  day,
  changed,
  changeLabel,
  side,
}: {
  day?: ItineraryDay
  changed: boolean[]
  changeLabel: 'Added' | 'Removed'
  side: 'Original' | 'Proposed'
}) {
  if (!day) {
    return <article className="itinerary-comparison-snapshot empty" aria-label={`${side} day not present`}><p>This day is not present in the {side.toLocaleLowerCase()} plan.</p></article>
  }

  return (
    <article className={`itinerary-comparison-snapshot ${side.toLocaleLowerCase()}`} aria-label={`${side}: ${day.day}, ${day.month} ${day.date}`}>
      <span className="itinerary-comparison-mobile-label">{side}</span>
      <header>
        <div><span>{day.day} · {day.month} {day.date}</span><h4>{day.title}</h4></div>
        <small>{day.location}</small>
      </header>
      {day.label ? <p className="itinerary-comparison-day-label">{day.label}</p> : null}
      <ol className="itinerary-comparison-stops">
        {day.stops.map((stop, index) => (
          <li className={changed[index] ? changeLabel.toLocaleLowerCase() : ''} key={stop.id}>
            <span className="itinerary-comparison-stop-order">{index + 1}</span>
            <span><strong>{stop.name}</strong><small>{priorityLabel(stop)}{stop.note ? ` · ${stop.note}` : ''}</small></span>
            {changed[index] ? <em>{changeLabel}</em> : null}
          </li>
        ))}
      </ol>
      <details>
        <summary>Day details</summary>
        <dl>
          <div><dt>Logistics</dt><dd>{day.logistics}</dd></div>
          <div><dt>Weather backup</dt><dd>{day.backup}</dd></div>
          <div><dt>Optional ideas</dt><dd>{day.optional.length ? day.optional.join(' · ') : 'None listed'}</dd></div>
          <div><dt>Dining</dt><dd>{day.dining.length ? day.dining.join(' · ') : 'None listed'}</dd></div>
        </dl>
      </details>
    </article>
  )
}

function comparisonText(
  proposal: ItineraryProposal,
  currentPlan: ItineraryPlan,
  proposedPlan: ItineraryPlan,
  affectedDayIds: string[],
) {
  const stopText = (stop: ItineraryStop) => `${stop.name}${stop.note ? ` (${stop.note})` : ''}`
  const currentDays = new Map(currentPlan.days.map((day) => [day.id, day]))
  const proposedDays = new Map(proposedPlan.days.map((day) => [day.id, day]))
  const lines = [
    'Miller Time itinerary comparison',
    proposal.summary,
    proposal.rationale,
  ]
  if (proposal.warnings.length) lines.push('', 'Heads-up:', ...proposal.warnings.map((warning) => `- ${warning}`))

  const originalStays = lodgingSegmentsForItinerary(currentPlan)
  const proposedStays = lodgingSegmentsForItinerary(proposedPlan)
  if (JSON.stringify(originalStays.map((stay) => [stay.baseKey, stay.nights])) !== JSON.stringify(proposedStays.map((stay) => [stay.baseKey, stay.nights]))) {
    lines.push(
      '',
      'Lodging impact:',
      `Original stays: ${originalStays.map((stay) => `${stay.baseName} (${stay.nights} ${stay.nights === 1 ? 'night' : 'nights'})`).join(' → ')}`,
      `Proposed stays: ${proposedStays.map((stay) => `${stay.baseName} (${stay.nights} ${stay.nights === 1 ? 'night' : 'nights'})`).join(' → ')}`,
      'After this itinerary is applied, the Lodging page will automatically rebuild the stay-by-stay choices. No hotel is selected or booked automatically.',
    )
  }

  for (const dayId of affectedDayIds) {
    const current = currentDays.get(dayId)
    const proposed = proposedDays.get(dayId)
    const day = proposed ?? current
    if (!day) continue
    lines.push(
      '',
      `${day.day}, ${day.month} ${day.date}`,
      `Original: ${current ? `${current.title} · Stay: ${current.location}\n${current.stops.map(stopText).join(' → ')}\nLogistics: ${current.logistics}\nBackup: ${current.backup}\nOptional: ${current.optional.join(' · ') || 'None'}\nDining: ${current.dining.join(' · ') || 'None'}` : 'Not in plan'}`,
      `Proposed: ${proposed ? `${proposed.title} · Stay: ${proposed.location}\n${proposed.stops.map(stopText).join(' → ')}\nLogistics: ${proposed.logistics}\nBackup: ${proposed.backup}\nOptional: ${proposed.optional.join(' · ') || 'None'}\nDining: ${proposed.dining.join(' · ') || 'None'}` : 'Not in plan'}`,
    )
  }
  if (proposal.sources.length) lines.push('', 'Sources:', ...proposal.sources.map((source) => `- ${source.title}: ${source.url}`))
  return lines.join('\n')
}

function copyWithFallback(text: string) {
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  const copied = document.execCommand('copy')
  field.remove()
  return copied
}

export function ItineraryComparisonModal({ proposal, currentPlan, canApply, applied = false, onApply, onClose }: ItineraryComparisonModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const [showAllDays, setShowAllDays] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const affectedDayIds = useMemo(
    () => [...new Set(proposalAffectedDayIds(proposal))],
    [proposal],
  )
  const affectedDayIdSet = useMemo(() => new Set(affectedDayIds), [affectedDayIds])
  const preview = useMemo<PreviewResult>(() => {
    try {
      return { plan: previewProposal(currentPlan, proposal), error: '' }
    } catch (error) {
      return {
        plan: null,
        error: error instanceof Error ? error.message : 'This comparison could not be prepared safely.',
      }
    }
  }, [currentPlan, proposal])
  const currentDays = useMemo(() => new Map(currentPlan.days.map((day) => [day.id, day])), [currentPlan])
  const proposedDays = useMemo(() => new Map(preview.plan?.days.map((day) => [day.id, day]) ?? []), [preview.plan])
  const allDayIds = useMemo(() => [
    ...currentPlan.days.map((day) => day.id),
    ...(preview.plan?.days ?? []).map((day) => day.id).filter((id) => !currentDays.has(id)),
  ], [currentDays, currentPlan.days, preview.plan])
  const visibleDayIds = showAllDays ? allDayIds : affectedDayIds
  const replacedDayCount = useMemo(() => new Set(proposal.operations.flatMap((operation) => (
    operation.type === 'replace_days' ? operation.days.map((day) => day.dayId) : []
  ))).size, [proposal.operations])
  const currentLodgingSegments = useMemo(() => lodgingSegmentsForItinerary(currentPlan), [currentPlan])
  const proposedLodgingSegments = useMemo(() => preview.plan ? lodgingSegmentsForItinerary(preview.plan) : [], [preview.plan])
  const lodgingChanged = useMemo(() => (
    JSON.stringify(currentLodgingSegments.map((segment) => [segment.baseKey, segment.nights]))
    !== JSON.stringify(proposedLodgingSegments.map((segment) => [segment.baseKey, segment.nights]))
  ), [currentLodgingSegments, proposedLodgingSegments])
  const proposedLodgingOptionCount = useMemo(() => proposedLodgingSegments.reduce((total, segment) => (
    total + lodgingOptionsForSegment(segment).length
  ), 0), [proposedLodgingSegments])
  const stale = proposal.baseRevision !== currentPlan.revision
  const applyLabel = replacedDayCount > 1
    ? `Apply ${replacedDayCount}-day itinerary`
    : affectedDayIds.length > 1 ? `Apply changes to ${affectedDayIds.length} days` : 'Apply itinerary change'

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  const copyComparisonText = async (text = preview.plan ? comparisonText(proposal, currentPlan, preview.plan, affectedDayIds) : '') => {
    if (!text) return
    try {
      let copied = false
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text)
          copied = true
        } catch {
          copied = false
        }
      }
      if (!copied && !copyWithFallback(text)) throw new Error('Copy failed')
      setShareStatus('Comparison copied to your clipboard.')
    } catch {
      setShareStatus('Could not copy automatically. Try again from a secure browser window.')
    }
  }

  const shareComparison = async () => {
    if (!preview.plan) return
    const text = comparisonText(proposal, currentPlan, preview.plan, affectedDayIds)
    setShareStatus('')

    if (typeof navigator.share === 'function') {
      try {
        setShareStatus('Opening your device’s share options…')
        await navigator.share({ title: `Banff itinerary · ${proposal.summary}`, text })
        setShareStatus('Comparison shared.')
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await copyComparisonText(text)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="itinerary-comparison-layer">
      <button className="itinerary-comparison-scrim" type="button" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <section
        ref={dialogRef}
        className="itinerary-comparison-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <header className="itinerary-comparison-header">
          <span className="itinerary-comparison-icon" aria-hidden="true"><GitCompareArrows /></span>
          <div><h2 id={titleId}>Review Miller Time’s itinerary</h2><p id={descriptionId}>Compare every affected day before anything changes.</p></div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close itinerary comparison"><X /></button>
        </header>

        <div className="itinerary-comparison-body">
          <section className="itinerary-comparison-summary" aria-label="Change summary">
            <div><h3>{proposal.summary}</h3><p>{proposal.rationale}</p></div>
            {proposal.warnings.length ? <div className="itinerary-comparison-warnings"><AlertTriangle aria-hidden="true" /><div><strong>Before you apply</strong><ul>{proposal.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div></div> : null}
          </section>

          {preview.plan && lodgingChanged ? (
            <section className="itinerary-lodging-impact" aria-label="Lodging impact">
              <span><BedDouble /></span>
              <div><strong>Lodging changes with this route</strong><p>The Lodging page will rebuild these stays after you apply. It will suggest matching options, but it will not choose or book a property for you.</p></div>
              <dl>
                <div><dt>Original</dt><dd>{currentLodgingSegments.map((segment) => `${segment.baseName} · ${segment.nights}n`).join(' → ')}</dd></div>
                <div><dt>Proposed</dt><dd>{proposedLodgingSegments.map((segment) => `${segment.baseName} · ${segment.nights}n`).join(' → ')}</dd></div>
              </dl>
              <b>{proposedLodgingOptionCount ? `${proposedLodgingOptionCount} researched stay matches ready to compare` : 'A new lodging research gap will be flagged'}</b>
            </section>
          ) : null}

          <div className="itinerary-comparison-toolbar">
            <div className="itinerary-comparison-toggle" role="group" aria-label="Days shown">
              <button type="button" className={!showAllDays ? 'active' : ''} aria-pressed={!showAllDays} onClick={() => setShowAllDays(false)}>Affected days ({affectedDayIds.length})</button>
              <button type="button" className={showAllDays ? 'active' : ''} aria-pressed={showAllDays} onClick={() => setShowAllDays(true)}>All days ({allDayIds.length})</button>
            </div>
            <div className="itinerary-comparison-share">
              <Button className="secondary" type="button" onClick={() => { void shareComparison() }} disabled={!preview.plan}><Share2 />Share comparison</Button>
              <Button className="secondary" type="button" onClick={() => { void copyComparisonText() }} disabled={!preview.plan}><Copy />Copy</Button>
              <span role="status" aria-live="polite">{shareStatus}</span>
            </div>
          </div>

          {preview.error ? <div className="itinerary-comparison-error" role="alert"><AlertTriangle /><div><strong>Comparison unavailable</strong><p>{preview.error}</p></div></div> : (
            <div className="itinerary-comparison-grid">
              <div className="itinerary-comparison-column-headings" aria-hidden="true"><span>Original plan</span><span>Proposed plan</span></div>
              {visibleDayIds.map((dayId) => {
                const current = currentDays.get(dayId)
                const proposed = proposedDays.get(dayId)
                const headingDay = proposed ?? current
                if (!headingDay) return null
                const removed = changedStops(current, proposed)
                const added = changedStops(proposed, current)
                return (
                  <section className={`itinerary-comparison-day${affectedDayIdSet.has(dayId) ? ' affected' : ''}`} key={dayId} aria-labelledby={`comparison-day-${dayId}`}>
                    <h3 id={`comparison-day-${dayId}`}>{headingDay.day}, {headingDay.month} {headingDay.date}{affectedDayIdSet.has(dayId) ? <span>Changed</span> : <span>Unchanged</span>}</h3>
                    <div>
                      <DaySnapshot day={current} changed={removed} changeLabel="Removed" side="Original" />
                      <DaySnapshot day={proposed} changed={added} changeLabel="Added" side="Proposed" />
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>

        <footer className="itinerary-comparison-footer">
          <div>
            <strong>{applied ? 'This change was applied.' : stale ? 'This review is out of date.' : 'Nothing changes until you apply.'}</strong>
            <span>{applied ? 'You can still share this before-and-after comparison during this session.' : stale ? 'Ask Miller Time to refresh it against the latest itinerary.' : canApply ? 'You can undo the change from the itinerary after applying.' : 'You have view-only access to this trip.'}</span>
          </div>
          <Button className="secondary" type="button" onClick={onClose}>{applied ? 'Close comparison' : 'Keep current plan'}</Button>
          {applied && lodgingChanged ? <AppLink className="button secondary" href="/lodging" onClick={onClose}><BedDouble />Compare stays</AppLink> : null}
          <Button className="success" type="button" onClick={onApply} disabled={applied || !canApply || stale || Boolean(preview.error)}><Check />{applied ? 'Already applied' : applyLabel}</Button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}

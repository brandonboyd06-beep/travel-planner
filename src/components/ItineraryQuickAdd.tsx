import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, ExternalLink, LoaderCircle, Pencil, Sparkles, Undo2, X } from 'lucide-react'
import { useItinerary } from '../context/itinerary'
import { compactItinerary } from '../lib/itineraryPlan'
import { getSupabaseClient } from '../lib/supabase'
import type { ItineraryOperation, ItineraryProposal, ItineraryStopKind, ItineraryStopPriority } from '../types'
import { Button } from './ui'

interface SourceLink {
  title: string
  url: string
}

interface ItineraryQuickAddProps {
  onManual: (name: string) => void
}

const kinds = new Set<ItineraryStopKind>(['travel', 'activity', 'scenic', 'meal', 'lodging', 'other'])
const priorities = new Set<ItineraryStopPriority>(['fixed', 'core', 'optional'])

function sourceLinks(value: unknown): SourceLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const item = entry as Record<string, unknown>
    if (typeof item.title !== 'string' || typeof item.url !== 'string') return []
    try {
      const url = new URL(item.url)
      return ['https:', 'http:'].includes(url.protocol) ? [{ title: item.title.slice(0, 120), url: url.toString() }] : []
    } catch {
      return []
    }
  }).slice(0, 6)
}

function coordinates(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2 || value.some((item) => typeof item !== 'number' || !Number.isFinite(item))) return undefined
  const [latitude, longitude] = value as [number, number]
  if (latitude < 49 || latitude > 54 || longitude < -119 || longitude > -113) return undefined
  return [latitude, longitude]
}

function parseOperation(value: unknown): ItineraryOperation | null {
  if (!value || typeof value !== 'object') return null
  const operation = value as Record<string, unknown>
  const type = operation.type
  if (type === 'add_stop' && typeof operation.dayId === 'string' && operation.stop && typeof operation.stop === 'object') {
    const rawStop = operation.stop as Record<string, unknown>
    if (typeof rawStop.name !== 'string' || !rawStop.name.trim()) return null
    const kind = kinds.has(rawStop.kind as ItineraryStopKind) ? rawStop.kind as ItineraryStopKind : 'other'
    const priority = priorities.has(rawStop.priority as ItineraryStopPriority) ? rawStop.priority as ItineraryStopPriority : 'core'
    return {
      type,
      dayId: operation.dayId,
      afterStopId: typeof operation.afterStopId === 'string' ? operation.afterStopId : undefined,
      stop: {
        name: rawStop.name.trim().slice(0, 120),
        kind,
        priority,
        mapsQuery: typeof rawStop.mapsQuery === 'string' ? rawStop.mapsQuery.trim().slice(0, 180) : rawStop.name.trim().slice(0, 180),
        coordinates: coordinates(rawStop.coordinates),
        note: typeof rawStop.note === 'string' ? rawStop.note.trim().slice(0, 300) : undefined,
        sourceUrl: sourceLinks([{ title: 'Source', url: rawStop.sourceUrl }])[0]?.url,
      },
    }
  }
  if (type === 'move_stop' && typeof operation.stopId === 'string' && typeof operation.fromDayId === 'string' && typeof operation.toDayId === 'string') {
    return { type, stopId: operation.stopId, fromDayId: operation.fromDayId, toDayId: operation.toDayId, afterStopId: typeof operation.afterStopId === 'string' ? operation.afterStopId : undefined }
  }
  if (type === 'remove_stop' && typeof operation.dayId === 'string' && typeof operation.stopId === 'string') {
    return { type, dayId: operation.dayId, stopId: operation.stopId }
  }
  if (type === 'update_stop' && typeof operation.dayId === 'string' && typeof operation.stopId === 'string' && operation.patch && typeof operation.patch === 'object') {
    const rawPatch = operation.patch as Record<string, unknown>
    const patch: Extract<ItineraryOperation, { type: 'update_stop' }>['patch'] = {}
    if (typeof rawPatch.name === 'string') patch.name = rawPatch.name.trim().slice(0, 120)
    if (typeof rawPatch.mapsQuery === 'string') patch.mapsQuery = rawPatch.mapsQuery.trim().slice(0, 180)
    if (kinds.has(rawPatch.kind as ItineraryStopKind)) patch.kind = rawPatch.kind as ItineraryStopKind
    if (priorities.has(rawPatch.priority as ItineraryStopPriority)) patch.priority = rawPatch.priority as ItineraryStopPriority
    if (coordinates(rawPatch.coordinates)) patch.coordinates = coordinates(rawPatch.coordinates)
    if (typeof rawPatch.note === 'string') patch.note = rawPatch.note.trim().slice(0, 300)
    return { type, dayId: operation.dayId, stopId: operation.stopId, patch }
  }
  return null
}

function parseProposal(value: unknown, fallbackRevision: number, sources: SourceLink[]): ItineraryProposal | null {
  if (!value || typeof value !== 'object') return null
  const proposal = value as Record<string, unknown>
  const operations = Array.isArray(proposal.operations) ? proposal.operations.map(parseOperation).filter((item): item is ItineraryOperation => Boolean(item)).slice(0, 4) : []
  if (!operations.length || typeof proposal.summary !== 'string' || typeof proposal.rationale !== 'string') return null
  return {
    id: typeof proposal.id === 'string' && proposal.id ? proposal.id.slice(0, 120) : `miller-${Date.now()}`,
    baseRevision: fallbackRevision,
    summary: proposal.summary.trim().slice(0, 220),
    rationale: proposal.rationale.trim().slice(0, 700),
    operations,
    warnings: Array.isArray(proposal.warnings) ? proposal.warnings.filter((item): item is string => typeof item === 'string').map((item) => item.slice(0, 240)).slice(0, 4) : [],
    sources,
  }
}

export function ItineraryQuickAdd({ onManual }: ItineraryQuickAddProps) {
  const { plan, canEdit, canUndo, applyAiProposal, lastChange, undo, clearLastChange } = useItinerary()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [answer, setAnswer] = useState('')
  const [proposal, setProposal] = useState<ItineraryProposal | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const queued = window.sessionStorage.getItem('banff-2026:itinerary-idea')
    if (!queued) return
    window.sessionStorage.removeItem('banff-2026:itinerary-idea')
    setDraft(queued)
    inputRef.current?.focus()
  }, [])

  const askMiller = async () => {
    const changeRequest = draft.trim()
    if (!changeRequest || pending || !canEdit) return
    const requestedRevision = plan.revision
    setPending(true)
    setError('')
    setAnswer('')
    setProposal(null)

    try {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Miller Time AI is not connected on this deployment.')
      const { data, error: functionError } = await client.functions.invoke('miller-time-ai', {
        body: {
          action: 'propose_change',
          changeRequest,
          baseRevision: requestedRevision,
          itinerary: compactItinerary(plan),
        },
      })
      if (functionError) {
        const context = (functionError as { context?: Response }).context
        const details = context ? await context.clone().json().catch(() => ({})) as { error?: string } : {}
        throw new Error(details.error || functionError.message || 'Miller Time could not plan that change.')
      }
      const sources = sourceLinks(data?.sources)
      const nextProposal = parseProposal(data?.proposal, requestedRevision, sources)
      setAnswer(typeof data?.answer === 'string' ? data.answer : nextProposal?.summary ?? '')
      setProposal(nextProposal)
      if (data?.resolution === 'proposal' && !nextProposal) throw new Error('Miller Time returned a plan I could not safely validate. Try wording the change more specifically.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Miller Time could not plan that change.')
    } finally {
      setPending(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void askMiller()
  }

  const apply = () => {
    if (!proposal) return
    try {
      applyAiProposal(proposal)
      const affectedDay = proposal.operations[0]?.type === 'move_stop'
        ? proposal.operations[0].toDayId
        : 'dayId' in proposal.operations[0] ? proposal.operations[0].dayId : ''
      setProposal(null)
      setAnswer('')
      setDraft('')
      if (affectedDay) window.setTimeout(() => document.getElementById(`itinerary-${affectedDay}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That suggestion could not be applied.')
    }
  }

  return (
    <section className="itinerary-change-center" aria-labelledby="change-trip-heading">
      <div className="change-center-copy"><span className="change-center-icon"><Sparkles /></span><div><h2 id="change-trip-heading">Change my trip</h2><p>Add a stop, move a day, or let Miller Time choose where it fits best.</p></div></div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="itinerary-change-input">What should we change?</label>
        <input ref={inputRef} id="itinerary-change-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Try: Add the Plain of Six Glaciers Tea House where it makes sense" maxLength={600} />
        <Button className="miller-plan-button" type="submit" disabled={!draft.trim() || pending || !canEdit}>{pending ? <LoaderCircle className="spin" /> : <Sparkles />}{pending ? 'Miller Time is planning…' : 'Plan it with Miller Time'}</Button>
        <Button className="secondary" type="button" onClick={() => onManual(draft)} disabled={!canEdit}><Pencil />Edit manually</Button>
      </form>
      <div className="change-center-hint"><span>Fast ideas:</span>{['Add a brewery after our Canmore day', 'Move the Gondola to the best weather day', 'Fit in a different tea house'].map((idea) => <button type="button" key={idea} onClick={() => { setDraft(idea); inputRef.current?.focus() }}>{idea}</button>)}</div>

      {proposal ? <article className="miller-proposal" aria-live="polite">
        <img src="/brand/mt-travel-logo-320.jpg" alt="" />
        <div><span>Miller Time found the best fit</span><h3>{proposal.summary}</h3><p>{proposal.rationale}</p>{proposal.warnings.length ? <ul>{proposal.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}{proposal.sources.length ? <div className="proposal-sources">{proposal.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title}<ExternalLink /></a>)}</div> : null}</div>
        <div className="proposal-actions"><Button className="success" type="button" onClick={apply}><Check />Apply change</Button><Button className="secondary" type="button" onClick={() => onManual(draft)}>Adjust plan</Button><button type="button" onClick={() => { setProposal(null); setAnswer('') }}><X />Not now</button></div>
      </article> : answer ? <div className="miller-quick-answer"><Sparkles /><p>{answer}</p><button type="button" onClick={() => setAnswer('')} aria-label="Dismiss Miller Time response"><X /></button></div> : null}
      {error ? <div className="miller-quick-error" role="alert"><p>{error}</p><button type="button" onClick={() => setError('')}>Dismiss</button></div> : null}
      {lastChange ? <div className="itinerary-undo" role="status"><Check /><span>{lastChange}</span>{canUndo ? <button type="button" onClick={undo}><Undo2 />Undo</button> : null}<button type="button" onClick={clearLastChange} aria-label="Dismiss change confirmation"><X /></button></div> : null}
      {!canEdit ? <p className="viewer-note">You have view-only access. Ask the trip owner to make itinerary changes.</p> : null}
    </section>
  )
}

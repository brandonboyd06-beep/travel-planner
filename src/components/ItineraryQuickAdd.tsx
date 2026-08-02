import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, LoaderCircle, Pencil, Sparkles, Undo2, X } from 'lucide-react'
import { useItinerary } from '../context/itinerary'
import { compactItinerary, proposalAffectedDayIds } from '../lib/itineraryPlan'
import { parseItineraryProposal, parseProposalSources } from '../lib/itineraryProposal'
import { getSupabaseClient } from '../lib/supabase'
import type { ItineraryPlan, ItineraryProposal } from '../types'
import { ItineraryComparisonModal } from './ItineraryComparisonModal'
import { MillerProposalCard } from './MillerProposalCard'
import { Button } from './ui'

interface ItineraryQuickAddProps {
  onManual: (name: string) => void
}

export function ItineraryQuickAdd({ onManual }: ItineraryQuickAddProps) {
  const { plan, canEdit, canUndo, applyAiProposal, lastChange, undo, clearLastChange } = useItinerary()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [answer, setAnswer] = useState('')
  const [proposal, setProposal] = useState<ItineraryProposal | null>(null)
  const [proposalRequest, setProposalRequest] = useState('')
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [comparisonBase, setComparisonBase] = useState<ItineraryPlan | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    const queued = window.sessionStorage.getItem('banff-2026:itinerary-idea')
    if (!queued) return
    window.sessionStorage.removeItem('banff-2026:itinerary-idea')
    setDraft(queued)
    inputRef.current?.focus()
  }, [])

  const askMiller = async (request = draft) => {
    const changeRequest = request.trim()
    if (!changeRequest || pendingRef.current || !canEdit) return
    pendingRef.current = true
    const requestedPlan = plan
    const requestedRevision = requestedPlan.revision
    setPending(true)
    setError('')
    setAnswer('')
    setProposal(null)
    setComparisonBase(null)

    try {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Miller Time AI is not connected on this deployment.')
      const { data, error: functionError } = await client.functions.invoke('miller-time-ai', {
        body: {
          action: 'propose_change',
          changeRequest,
          baseRevision: requestedRevision,
          itinerary: compactItinerary(requestedPlan),
        },
      })
      if (functionError) {
        const context = (functionError as { context?: Response }).context
        const details = context ? await context.clone().json().catch(() => ({})) as { error?: string } : {}
        throw new Error(details.error || functionError.message || 'Miller Time could not plan that change.')
      }
      const sources = parseProposalSources(data?.sources)
      const nextProposal = parseItineraryProposal(data?.proposal, requestedRevision, sources)
      setAnswer(typeof data?.answer === 'string' ? data.answer : nextProposal?.summary ?? '')
      setProposal(nextProposal)
      setComparisonBase(nextProposal ? requestedPlan : null)
      setComparisonOpen(false)
      setProposalRequest(nextProposal ? changeRequest : '')
      if (data?.resolution === 'proposal' && !nextProposal) throw new Error('Miller Time returned a plan I could not safely validate. Try wording the change more specifically.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Miller Time could not plan that change.')
    } finally {
      pendingRef.current = false
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
      const affectedDay = proposalAffectedDayIds(proposal)[0] ?? ''
      setComparisonOpen(false)
      setAnswer('')
      setDraft('')
      if (affectedDay) window.setTimeout(() => document.getElementById(`itinerary-${affectedDay}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That suggestion could not be applied.')
    }
  }

  const proposalState = proposal && plan.appliedProposalIds.includes(proposal.id)
    ? 'applied'
    : proposal && proposal.baseRevision !== plan.revision ? 'stale' : 'pending'

  const tweakProposal = () => {
    if (!proposal) return
    setDraft(`Tweak this itinerary suggestion: ${proposal.summary}. `)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <>
    <section className="itinerary-change-center" aria-labelledby="change-trip-heading">
      <div className="change-center-copy"><span className="change-center-icon"><Sparkles /></span><div><h2 id="change-trip-heading">Change my trip</h2><p>Add a stop, move a day, or let Miller Time choose where it fits best.</p></div></div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="itinerary-change-input">What should we change?</label>
        <input ref={inputRef} id="itinerary-change-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Try: Add the Plain of Six Glaciers Tea House where it makes sense" maxLength={600} />
        <Button className="miller-plan-button" type="submit" disabled={!draft.trim() || pending || !canEdit}>{pending ? <LoaderCircle className="spin" /> : <Sparkles />}{pending ? 'Miller Time is planning…' : 'Plan it with Miller Time'}</Button>
        <Button className="secondary" type="button" onClick={() => onManual(draft)} disabled={!canEdit}><Pencil />Edit manually</Button>
      </form>
      <div className="change-center-hint"><span>Fast ideas:</span>{['Add a brewery after our Canmore day', 'Move the Gondola to the best weather day', 'Fit in a different tea house'].map((idea) => <button type="button" key={idea} onClick={() => { setDraft(idea); inputRef.current?.focus() }}>{idea}</button>)}</div>

      {proposal ? <MillerProposalCard
        proposal={proposal}
        state={proposalState}
        canApply={canEdit}
        onReview={() => setComparisonOpen(true)}
        onAdjust={proposalState === 'stale' ? () => { void askMiller(proposalRequest || draft) } : tweakProposal}
        onDismiss={() => { setProposal(null); setComparisonBase(null); setProposalRequest(''); setAnswer(''); setComparisonOpen(false) }}
      /> : answer ? <div className="miller-quick-answer"><Sparkles /><p>{answer}</p><button type="button" onClick={() => setAnswer('')} aria-label="Dismiss Miller Time response"><X /></button></div> : null}
      {error ? <div className="miller-quick-error" role="alert"><p>{error}</p><button type="button" onClick={() => setError('')}>Dismiss</button></div> : null}
      {lastChange ? <div className="itinerary-undo" role="status"><Check /><span>{lastChange}</span>{canUndo ? <button type="button" onClick={undo}><Undo2 />Undo</button> : null}<button type="button" onClick={clearLastChange} aria-label="Dismiss change confirmation"><X /></button></div> : null}
      {!canEdit ? <p className="viewer-note">You have view-only access. Ask the trip owner to make itinerary changes.</p> : null}
    </section>
    {proposal && comparisonOpen ? <ItineraryComparisonModal
      proposal={proposal}
      currentPlan={proposalState === 'applied' && comparisonBase ? comparisonBase : plan}
      canApply={canEdit}
      applied={proposalState === 'applied'}
      onApply={apply}
      onClose={() => setComparisonOpen(false)}
    /> : null}
    </>
  )
}

import { Check, ExternalLink, Eye, RefreshCw, Sparkles, X } from 'lucide-react'
import type { ItineraryProposal } from '../types'
import { Button } from './ui'

export type MillerProposalState = 'pending' | 'applied' | 'dismissed' | 'stale'

interface MillerProposalCardProps {
  proposal: ItineraryProposal
  state?: MillerProposalState
  compact?: boolean
  canApply?: boolean
  showSources?: boolean
  error?: string
  onApply?: () => void
  onAdjust?: () => void
  onDismiss?: () => void
  onViewItinerary?: () => void
}

export function MillerProposalCard({
  proposal,
  state = 'pending',
  compact = false,
  canApply = true,
  showSources = true,
  error,
  onApply,
  onAdjust,
  onDismiss,
  onViewItinerary,
}: MillerProposalCardProps) {
  if (state === 'dismissed') return null

  const applied = state === 'applied'
  const stale = state === 'stale'
  const eyebrow = applied ? 'Change applied' : stale ? 'Plan needs a refresh' : 'Miller Time found the best fit'

  return (
    <article className={`miller-proposal${compact ? ' compact' : ''}${applied ? ' applied' : ''}${stale ? ' stale' : ''}`} aria-live={compact ? undefined : 'polite'}>
      <img src="/brand/mt-travel-logo-320.jpg" alt="" />
      <div className="proposal-copy">
        <span>{eyebrow}</span>
        <h3>{proposal.summary}</h3>
        <p>{proposal.rationale}</p>
        {proposal.warnings.length ? <ul>{proposal.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
        {showSources && proposal.sources.length ? (
          <div className="proposal-sources">
            {proposal.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title}<ExternalLink /></a>)}
          </div>
        ) : null}
        {error ? <div className="proposal-error" role="alert">{error}</div> : null}
        {!canApply && !applied ? <small className="proposal-viewer-note">You can review this idea, but only a trip editor can apply it.</small> : null}
      </div>
      <div className="proposal-actions">
        {applied ? (
          <>
            <span className="proposal-applied"><Check />Itinerary updated</span>
            {onViewItinerary ? <Button className="secondary" type="button" onClick={onViewItinerary}><Eye />View itinerary</Button> : null}
          </>
        ) : stale ? (
          <>
            {onAdjust ? <Button className="secondary" type="button" onClick={onAdjust}><RefreshCw />Refresh with MT</Button> : null}
            {onDismiss ? <button className="proposal-dismiss" type="button" onClick={onDismiss}><X />Not now</button> : null}
          </>
        ) : (
          <>
            {onApply ? <Button className="success" type="button" onClick={onApply} disabled={!canApply}><Check />Apply change</Button> : null}
            {onAdjust ? <Button className="secondary" type="button" onClick={onAdjust}><Sparkles />Tweak it</Button> : null}
            {onDismiss ? <button className="proposal-dismiss" type="button" onClick={onDismiss}><X />Not now</button> : null}
          </>
        )}
      </div>
    </article>
  )
}

import { Fragment, useCallback, useMemo, useState } from 'react'
import { BedDouble, CalendarRange, Car, Check, CookingPot, ExternalLink, Images, MapPin, Scale, Sparkles, Users, Waves } from 'lucide-react'
import { AppLink } from '../components/AppLink'
import { PageHeader, SectionHeading } from '../components/AppShell'
import { LodgingCalculator } from '../components/LodgingCalculator'
import { LodgingCompareModal } from '../components/LodgingCompareModal'
import { AlertBanner, Button, SeeMoreButton, StatusPill } from '../components/ui'
import { lodging } from '../data/lodging'
import { lodgingScenarios } from '../data/lodgingScenarios'
import { useItinerary } from '../context/itinerary'
import { useCollaboration } from '../context/collaboration'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { hasLodgingResearchGap, summarizeItinerary } from '../lib/itinerarySummary'
import {
  estimateLodgingCost,
  lodgingCoverageForItinerary,
  lodgingSegmentsForItinerary,
  lodgingSelectionTotal,
  lodgingTownForBase,
  type LodgingSelections,
  type LodgingSegment,
} from '../lib/lodgingPlan'
import type { Lodging } from '../types'

const townTabs: Lodging['town'][] = ['Banff', 'Canmore', 'Jasper']

export function LodgingPage() {
  const { trip } = useCollaboration()
  const { plan } = useItinerary()
  const canEdit = trip?.role !== 'viewer'
  const itinerarySummary = summarizeItinerary(plan)
  const researchRouteChanged = hasLodgingResearchGap(plan)
  const segments = useMemo(() => lodgingSegmentsForItinerary(plan), [plan])
  const [selections, setSelections] = useLocalStorage<LodgingSelections>('lodging-selections-v1', {})
  const [, setLegacyPreferred] = useLocalStorage<string>('preferred-lodging', '')
  const [tab, setTab] = useState<string>('Recommended')
  const [focusedSegmentId, setFocusedSegmentId] = useState(segments[0]?.id ?? '')
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareNotice, setCompareNotice] = useState('')
  const [selectedScenarioId, setSelectedScenarioId] = useLocalStorage<string>('lodging-scenario', 'scenario-a')
  const [showAllStays, setShowAllStays] = useState(false)
  const [showScenarioDetails, setShowScenarioDetails] = useState(false)

  const focusedSegment = segments.find((segment) => segment.id === focusedSegmentId) ?? segments[0] ?? null
  const coverage = useMemo(() => lodgingCoverageForItinerary(plan, selections), [plan, selections])
  const selectedTotal = lodgingSelectionTotal(plan, selections)
  const chosenCount = coverage.filter((item) => item.status === 'chosen').length
  const unknownBases = coverage.filter((item) => item.status === 'research-needed')

  const recommended = useMemo(() => {
    const routeTowns = [...new Set(segments.map((segment) => lodgingTownForBase(segment.baseName)).filter(Boolean))]
    const targetTowns = routeTowns.length ? routeTowns : townTabs
    const results: Lodging[] = []
    targetTowns.forEach((town) => {
      const townOptions = lodging.filter((item) => item.town === town)
      const top = townOptions.filter((item) => item.recommended)
      const picks = top.length ? top : [...townOptions].sort((a, b) => b.score - a.score).slice(0, 2)
      picks.forEach((item) => {
        if (!results.some((result) => result.id === item.id)) results.push(item)
      })
    })
    return results
  }, [segments])

  const filtered = useMemo(() => {
    if (tab === 'Recommended') return recommended
    return lodging.filter((item) => item.town === tab)
  }, [recommended, tab])
  const visibleLodging = showAllStays ? filtered : filtered.slice(0, 5)
  const compareItems = compareIds.map((id) => lodging.find((item) => item.id === id)).filter((item): item is Lodging => Boolean(item))
  const selectedScenario = lodgingScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? lodgingScenarios[0]

  const focusSegment = (segment: LodgingSegment) => {
    setFocusedSegmentId(segment.id)
    setShowAllStays(false)
    setTab(lodgingTownForBase(segment.baseName) ?? 'Recommended')
    window.setTimeout(() => document.getElementById('lodging-options')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const askMillerTimeForLodging = (segment: LodgingSegment) => {
    window.dispatchEvent(new CustomEvent('miller-time:open', {
      detail: {
        draft: `Research lodging for ${segment.baseName} from ${segment.checkIn} to ${segment.checkOut} (${segment.nights} ${segment.nights === 1 ? 'night' : 'nights'}) for four adults. Compare at least three group-friendly options with estimated price, location, highlights, real photo links, and what we should verify before booking.`,
      },
    }))
  }

  const chooseLodging = (item: Lodging, segment: LodgingSegment) => {
    if (!canEdit) return
    const clearing = selections[segment.id] === item.id
    setSelections((current) => {
      if (!clearing) return { ...current, [segment.id]: item.id }
      const next = { ...current }
      delete next[segment.id]
      return next
    })
    setLegacyPreferred(clearing ? '' : item.id)
    setFocusedSegmentId(segment.id)
  }

  const clearLodging = (segment: LodgingSegment) => {
    if (!canEdit) return
    setSelections((current) => {
      const next = { ...current }
      delete next[segment.id]
      return next
    })
    setLegacyPreferred('')
  }

  const toggleCompare = (id: string) => {
    setCompareNotice('')
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      if (current.length >= 3) {
        setCompareNotice('Compare up to 3 stays at once. Remove one to add another.')
        return current
      }
      return [...current, id]
    })
  }

  const chooseScenario = (id: string) => {
    setSelectedScenarioId(id)
    setShowScenarioDetails(false)
  }

  const closeCompare = useCallback(() => setCompareOpen(false), [])

  return (
    <>
      <PageHeader title="Lodging made simple" subtitle={`Current itinerary: ${itinerarySummary.baseSummary} · Revision ${plan.revision}${canEdit ? '' : ' · view only'}`} />
      <div className="budget-hero">
        <div><span>Maximum lodging budget</span><strong>$8,000</strong><small>USD planning target · {itinerarySummary.nights} nights · {chosenCount}/{coverage.length} stays chosen</small></div>
        <div className="strategy-line">{segments.map((segment, index) => <Fragment key={segment.id}><div><b>{segment.nights}</b><span>{segment.baseName} {segment.nights === 1 ? 'night' : 'nights'}</span></div>{index < segments.length - 1 ? <i /> : null}</Fragment>)}<p>{selectedTotal ? `$${selectedTotal.toLocaleString()} chosen subtotal` : 'Choose stays below'}</p></div>
      </div>

      <section className="lodging-coverage" aria-labelledby="lodging-coverage-title">
        <div className="lodging-coverage-heading">
          <div><span>Step 1 of 2</span><h2 id="lodging-coverage-title">Choose one stay for each stop</h2><p>Your itinerary controls these dates automatically. Tap a stop to see only places that fit it.</p></div>
          <strong>{chosenCount}/{coverage.length} done</strong>
        </div>
        <div className="lodging-coverage-grid">
          {coverage.map(({ segment, options, selected, status }) => (
            <button type="button" key={segment.id} className={`${focusedSegment?.id === segment.id ? 'active' : ''} ${status}`} onClick={() => options.length ? focusSegment(segment) : askMillerTimeForLodging(segment)}>
              <span>{segment.dateLabel} · {segment.nights} {segment.nights === 1 ? 'night' : 'nights'}</span>
              <strong>{segment.baseName}</strong>
              <small>{selected ? `${selected.name} chosen` : options.length ? `${options.length} places ready to compare` : 'Miller Time needs to research this stop'}</small>
              <b>{selected ? <><Check />Chosen</> : options.length ? 'Choose a stay →' : 'Ask MT to research →'}</b>
            </button>
          ))}
        </div>
      </section>

      {researchRouteChanged ? <AlertBanner tone="info"><strong>The lodging plan updated with the itinerary.</strong><span> The old Banff/Canmore-only scenarios are hidden because they no longer match. New destinations such as Jasper now get their own options and stay choice.</span></AlertBanner> : null}
      {unknownBases.length ? <AlertBanner><strong>No saved lodging research yet for {unknownBases.map((item) => item.segment.baseName).join(', ')}.</strong><span> Ask Miller Time to research options, or change that overnight base before booking.</span></AlertBanner> : null}
      <AlertBanner><strong>Two quick checks:</strong><span> generated pictures are clearly marked as illustrative. Use “Real photos & live price” to confirm the exact property, room, taxes, and cancellation terms before paying.</span></AlertBanner>

      <div id="lodging-options" className="filter-bar lodging-tabs" role="tablist" aria-label="Lodging filters">
        {['Recommended', ...townTabs].map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setShowAllStays(false) }}>{item === 'Recommended' ? 'Best for this itinerary' : `${item} stays`}</button>)}
      </div>

      <div className="lodging-options-heading">
        <div><span>Step 2 of 2</span><h2>{tab === 'Recommended' ? 'Best starting points for this route' : `${tab} options`}</h2><p>{tab === 'Recommended' ? 'One strong starting point for each stop on the current route.' : focusedSegment && lodgingTownForBase(focusedSegment.baseName) === tab ? `Currently choosing for ${focusedSegment.dateLabel} in ${focusedSegment.baseName}.` : `Browsing ${tab} for a possible route change. A stay total appears when ${tab} is in the itinerary.`}</p></div>
        {compareNotice ? <small role="status">{compareNotice}</small> : null}
      </div>

      <section className="lodging-list" aria-live="polite">
        {visibleLodging.map((item) => {
          const matchingSegments = segments.filter((segment) => lodgingTownForBase(segment.baseName) === item.town)
          const cardSegment = focusedSegment && lodgingTownForBase(focusedSegment.baseName) === item.town ? focusedSegment : matchingSegments[0] ?? null
          const isChosen = Boolean(cardSegment && selections[cardSegment.id] === item.id)
          const isCompared = compareIds.includes(item.id)
          const estimate = cardSegment ? estimateLodgingCost(item, cardSegment.nights) : null
          return (
            <article className={`lodging-card ${isChosen ? 'selected' : ''}`} key={item.id}>
              <figure className="lodging-photo">
                <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" />
                <figcaption><Images />Illustrative preview</figcaption>
              </figure>
              <div className="lodging-main">
                <div className="property-heading"><div><span>{item.town} · {item.type}</span><h2>{item.name}</h2><p>{item.bestFor}</p></div><div className="score"><strong>{item.score}</strong><span>research score</span></div></div>
                <div className="property-price"><strong>${item.price}<small> USD / avg night</small></strong><span>{estimate === null ? 'Choose a matching route stop for a total' : `$${estimate.toLocaleString()} USD for ${cardSegment?.nights} ${cardSegment?.nights === 1 ? 'night' : 'nights'}${item.rateBasis === 'per-room-night' ? ` · ${item.roomCount} rooms` : ' · whole unit'}${item.estimatedFixedFees ? ' · fee allowance included' : ''}`}</span></div>
                <div className="amenity-row"><span><MapPin />{item.walkability}</span><span><Car />{item.parking}</span><span><CookingPot />{item.kitchen}</span><span><Waves />{item.amenities}</span></div>
                <div className="lodging-highlights"><strong>Highlights</strong>{item.highlights.map((highlight) => <span key={highlight}><Check />{highlight}</span>)}</div>
                <div className="pros-cons"><div><strong>Why it works</strong>{item.pros.map((pro) => <span key={pro}><Check />{pro}</span>)}</div><div><strong>Check first</strong>{item.cons.map((con) => <span key={con}>— {con}</span>)}</div></div>
              </div>
              <aside className="lodging-meta">
                <StatusPill tone={item.recommended ? 'green' : 'gray'}>{item.recommended ? 'Top pick' : item.transit}</StatusPill>
                <p><strong>Room setup</strong>{item.rooms}</p>
                <p><strong>Loyalty</strong>{item.loyalty}</p>
                <p><strong>Research checked</strong>{item.lastChecked}</p>
                <small>Illustration is not a property photo.</small>
                <a className="button secondary" href={item.url} target="_blank" rel="noopener noreferrer">Real photos & live price<ExternalLink /></a>
                <Button className={isCompared ? 'primary' : 'ghost'} onClick={() => toggleCompare(item.id)}><Scale />{isCompared ? 'Added to compare' : 'Add to compare'}</Button>
                {cardSegment ? <Button className={isChosen ? 'primary' : 'ghost'} disabled={!canEdit} onClick={() => chooseLodging(item, cardSegment)}>{isChosen ? <><Check />Clear this choice</> : `Choose for ${cardSegment.checkIn}`}</Button> : null}
              </aside>
            </article>
          )
        })}
      </section>
      {filtered.length > 5 ? <SeeMoreButton expanded={showAllStays} onClick={() => setShowAllStays((value) => !value)} count={filtered.length - 5} moreLabel="See every lodging option" lessLabel="See fewer lodging options" /> : null}

      {compareIds.length ? (
        <div className="lodging-compare-tray" role="status">
          <div><Scale /><span><strong>{compareIds.length} {compareIds.length === 1 ? 'stay' : 'stays'} ready</strong><small>{compareIds.length < 2 ? 'Add one more for a side-by-side view' : 'Compare price, setup, highlights, and watch-outs'}</small></span></div>
          <button type="button" onClick={() => setCompareIds([])}>Clear</button>
          <Button className="primary" disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>Compare side by side</Button>
        </div>
      ) : null}

      <section className="current-lodging-plan">
        <SectionHeading title="Your current lodging plan" />
        <div>
          {coverage.map(({ segment, selected, options }) => (
            <article key={segment.id}>
              <span>{segment.dateLabel}</span><strong>{segment.baseName} · {segment.nights} {segment.nights === 1 ? 'night' : 'nights'}</strong>
              {selected ? <><p>{selected.name}</p><b>${estimateLodgingCost(selected, segment.nights).toLocaleString()} USD estimate</b><button type="button" disabled={!canEdit} onClick={() => clearLodging(segment)}>Clear choice</button></> : <><p>No stay chosen yet</p><button type="button" onClick={() => options.length ? focusSegment(segment) : askMillerTimeForLodging(segment)}>{options.length ? `Compare ${options.length} options →` : 'Ask MT to research →'}</button></>}
            </article>
          ))}
        </div>
        <footer><span>Chosen subtotal</span><strong>{selectedTotal ? `$${selectedTotal.toLocaleString()} USD` : '$0 USD'}</strong><small>Includes listed rental fee allowances. Taxes, unlisted fees, and unchosen stays are not included.</small></footer>
      </section>

      {!researchRouteChanged ? (
        <section className="scenario-section">
          <SectionHeading title="Original Banff + Canmore route ideas" />
          <p className="section-intro">These compare full-route setups for the original itinerary. Clicking one changes the preview only; it does not pick a hotel or book anything.</p>
          <div className="scenario-grid" role="radiogroup" aria-label="Lodging scenarios">
            {lodgingScenarios.map((scenario) => (
              <button type="button" role="radio" aria-checked={selectedScenario.id === scenario.id} className={`scenario-tile ${selectedScenario.id === scenario.id ? 'selected' : ''}`} key={scenario.id} onClick={() => chooseScenario(scenario.id)}>
                <span>{scenario.eyebrow}</span><strong>${scenario.total.toLocaleString()}</strong><p>{scenario.description}</p><div><StatusPill tone={scenario.tone}>{scenario.status}</StatusPill><b>{selectedScenario.id === scenario.id ? 'Viewing plan' : 'View plan'}</b></div>
              </button>
            ))}
          </div>
          <article className="scenario-detail" aria-live="polite">
            <header><div><span className="scenario-kicker"><Sparkles />Selected original-route idea</span><h2>{selectedScenario.title}</h2><p>{selectedScenario.description}</p></div><StatusPill tone={selectedScenario.tone}>{selectedScenario.status}</StatusPill></header>
            <div className="scenario-summary"><div><CalendarRange /><span>Trip stay<strong>7 nights</strong></span></div><div><Users /><span>Group total<strong>${selectedScenario.total.toLocaleString()}</strong></span></div><div><BedDouble /><span>Per traveler<strong>${selectedScenario.perPerson.toLocaleString()}</strong></span></div><div><Check /><span>Budget buffer<strong>${selectedScenario.buffer.toLocaleString()}</strong></span></div></div>
            <div className="scenario-stays">{selectedScenario.segments.map((segment, index) => <div className="scenario-stay" key={`${selectedScenario.id}-${segment.dates}`}><span className="stay-number">{index + 1}</span><div><small>{segment.dates} · {segment.town}</small><strong>{segment.property}</strong><p>{segment.setup} · {segment.note}</p></div><b>${segment.estimate.toLocaleString()}</b></div>)}</div>
            <SeeMoreButton expanded={showScenarioDetails} onClick={() => setShowScenarioDetails((value) => !value)} moreLabel="See full costs and trade-offs" lessLabel="Hide full costs and trade-offs" />
            {showScenarioDetails ? <div className="scenario-expanded"><div className="scenario-costs"><h3>Working estimate</h3>{selectedScenario.costLines.map((line) => <div key={line.label}><span>{line.label}</span><strong>${line.amount.toLocaleString()}</strong></div>)}<div className="scenario-total"><span>Estimated total</span><strong>${selectedScenario.total.toLocaleString()}</strong></div></div><div><h3>Why choose it</h3><ul>{selectedScenario.highlights.map((item) => <li key={item}><Check />{item}</li>)}</ul></div><div><h3>Watch-outs</h3><ul>{selectedScenario.tradeoffs.map((item) => <li key={item}>— {item}</li>)}</ul></div></div> : null}
            <footer>Planning estimate only · verify rates, taxes, room layouts, and cancellation terms directly.</footer>
          </article>
        </section>
      ) : null}
      {!researchRouteChanged ? <LodgingCalculator /> : <AlertBanner tone="info"><strong>Need a different route?</strong><span> Ask Miller Time to change the itinerary first. This page will rebuild its overnight stops and totals automatically.</span> <AppLink className="text-link" href="/itinerary">Open itinerary</AppLink></AlertBanner>}

      {compareOpen && compareItems.length >= 2 ? <LodgingCompareModal items={compareItems} segments={segments} focusedSegment={focusedSegment} selectedBySegment={selections} canEdit={canEdit} onChoose={chooseLodging} onClose={closeCompare} /> : null}
    </>
  )
}

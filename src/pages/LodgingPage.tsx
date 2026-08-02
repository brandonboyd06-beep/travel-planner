import { Fragment, useMemo, useState } from 'react'
import { BedDouble, CalendarRange, Car, Check, CookingPot, ExternalLink, Heart, MapPin, Sparkles, Users, Waves } from 'lucide-react'
import { AppLink } from '../components/AppLink'
import { PageHeader, SectionHeading } from '../components/AppShell'
import { LodgingCalculator } from '../components/LodgingCalculator'
import { AlertBanner, Button, SeeMoreButton, StatusPill } from '../components/ui'
import { lodging } from '../data/lodging'
import { lodgingScenarios } from '../data/lodgingScenarios'
import { useItinerary } from '../context/itinerary'
import { useCollaboration } from '../context/collaboration'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { hasLodgingResearchGap, summarizeItinerary } from '../lib/itinerarySummary'

const tabs = ['Recommended', 'Banff hotels', 'Banff rentals', 'Canmore hotels', 'Canmore rentals', 'Split-stay scenarios']

export function LodgingPage() {
  const { trip } = useCollaboration()
  const { plan } = useItinerary()
  const canEdit = trip?.role !== 'viewer'
  const itinerarySummary = summarizeItinerary(plan)
  const researchIsIncomplete = hasLodgingResearchGap(plan)
  const [tab, setTab] = useState('Recommended')
  const [preferred, setPreferred] = useLocalStorage<string>('preferred-lodging', '')
  const [selectedScenarioId, setSelectedScenarioId] = useLocalStorage<string>('lodging-scenario', 'scenario-a')
  const [showAllStays, setShowAllStays] = useState(false)
  const [showScenarioDetails, setShowScenarioDetails] = useState(false)
  const filtered = useMemo(() => {
    if (tab === 'Recommended') return lodging.filter((item) => item.recommended)
    if (tab === 'Split-stay scenarios') return lodging.filter((item) => item.recommended)
    const [town, type] = tab.split(' ')
    return lodging.filter((item) => item.town === town && (type === 'hotels' ? item.type === 'Hotel' : item.type === 'Condo / rental'))
  }, [tab])
  const visibleLodging = showAllStays ? filtered : filtered.slice(0, 4)
  const selectedScenario = lodgingScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? lodgingScenarios[0]
  const chooseScenario = (id: string) => {
    setSelectedScenarioId(id)
    setShowScenarioDetails(false)
  }
  return (
    <>
      <PageHeader title="Lodging comparison" subtitle={`Current itinerary: ${itinerarySummary.baseSummary} · Revision ${plan.revision}${canEdit ? '' : ' · view only'}`} />
      <div className="budget-hero"><div><span>Maximum lodging budget</span><strong>$8,000</strong><small>$2,000 per traveler · {itinerarySummary.nights} nights</small></div><div className="strategy-line">{itinerarySummary.bases.map((base, index) => <Fragment key={base.key}><div><b>{base.nights} {base.nights === 1 ? 'night' : 'nights'}</b><span>{base.name}</span></div>{index < itinerarySummary.bases.length - 1 ? <i /> : null}</Fragment>)}<p>{itinerarySummary.baseChanges} {itinerarySummary.baseChanges === 1 ? 'base change' : 'base changes'}</p></div></div>
      {researchIsIncomplete ? <AlertBanner><strong>The current itinerary changed the overnight plan.</strong><span> It now uses {itinerarySummary.baseSummary}. The hotel cards and scenarios below are still Banff/Canmore research, so do not book them until each night has been matched to Revision {plan.revision}. </span><AppLink className="text-link" href="/itinerary">Review the itinerary</AppLink></AlertBanner> : null}
      <AlertBanner><strong>Research snapshot only.</strong><span> Rates, taxes, fees, and inventory are not guaranteed. Use “Verify direct price” before booking.</span></AlertBanner>
      <div className="filter-bar" role="tablist" aria-label="Lodging filters">{tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>
      <section className="lodging-list">
        {visibleLodging.map((item) => (
          <article className={`lodging-card ${preferred === item.id ? 'selected' : ''}`} key={item.id}>
            <div className="lodging-main"><div className="property-heading"><div><span>{item.town} · {item.type}</span><h2>{item.name}</h2></div><div className="score"><strong>{item.score}</strong><span>review score</span></div></div><div className="property-price"><strong>${item.price}<small>/ avg night</small></strong><span>${item.total.toLocaleString()} estimated segment</span></div><div className="amenity-row"><span><MapPin />{item.walkability}</span><span><Car />{item.parking}</span><span><CookingPot />{item.kitchen}</span><span><Waves />{item.amenities}</span></div><div className="pros-cons"><div><strong>Why it works</strong>{item.pros.map((pro) => <span key={pro}><Check />{pro}</span>)}</div><div><strong>Watch-outs</strong>{item.cons.map((con) => <span key={con}>— {con}</span>)}</div></div></div>
            <aside className="lodging-meta"><StatusPill tone={item.recommended ? 'green' : 'gray'}>{item.recommended ? 'Recommended' : item.transit}</StatusPill><p><strong>Loyalty</strong>{item.loyalty}</p><p><strong>Configuration</strong>{item.rooms}</p><p><strong>Last checked</strong>{item.lastChecked}</p><small>Taxes and fees: verify directly</small><a className="button secondary" href={item.url} target="_blank" rel="noopener noreferrer">Verify direct price<ExternalLink size={14} /></a><Button className={preferred === item.id ? 'primary' : 'ghost'} disabled={!canEdit} onClick={() => setPreferred(preferred === item.id ? '' : item.id)}><Heart size={15} fill={preferred === item.id ? 'currentColor' : 'none'} />{canEdit ? preferred === item.id ? 'Preferred stay' : 'Mark preferred' : 'View only'}</Button></aside>
          </article>
        ))}
      </section>
      {filtered.length > 4 ? <SeeMoreButton expanded={showAllStays} onClick={() => setShowAllStays((value) => !value)} count={filtered.length - 4} moreLabel="See more lodging options" lessLabel="See fewer lodging options" /> : null}
      <section className="scenario-section">
        <SectionHeading title="Compare Banff + Canmore research scenarios" />
        <p className="section-intro">Clicking a scenario changes this preview only. It does not change the current itinerary or reserve a room.</p>
        <div className="scenario-grid" role="radiogroup" aria-label="Lodging scenarios">
          {lodgingScenarios.map((scenario) => (
            <button
              type="button"
              role="radio"
              aria-checked={selectedScenario.id === scenario.id}
              className={`scenario-tile ${selectedScenario.id === scenario.id ? 'selected' : ''}`}
              key={scenario.id}
              onClick={() => chooseScenario(scenario.id)}
            >
              <span>{scenario.eyebrow}</span>
              <strong>${scenario.total.toLocaleString()}</strong>
              <p>{scenario.description}</p>
              <div><StatusPill tone={scenario.tone}>{scenario.status}</StatusPill><b>{selectedScenario.id === scenario.id ? 'Viewing plan' : 'View plan'}</b></div>
            </button>
          ))}
        </div>

        <article className="scenario-detail" aria-live="polite">
          <header>
            <div><span className="scenario-kicker"><Sparkles size={14} />Selected plan</span><h2>{selectedScenario.title}</h2><p>{selectedScenario.description}</p></div>
            <StatusPill tone={selectedScenario.tone}>{selectedScenario.status}</StatusPill>
          </header>
          <div className="scenario-summary">
            <div><CalendarRange /><span>Trip stay<strong>7 nights</strong></span></div>
            <div><Users /><span>Group total<strong>${selectedScenario.total.toLocaleString()}</strong></span></div>
            <div><BedDouble /><span>Per traveler<strong>${selectedScenario.perPerson.toLocaleString()}</strong></span></div>
            <div><Check /><span>Budget buffer<strong>${selectedScenario.buffer.toLocaleString()}</strong></span></div>
          </div>
          <div className="scenario-stays">
            {selectedScenario.segments.map((segment, index) => (
              <div className="scenario-stay" key={`${selectedScenario.id}-${segment.dates}`}>
                <span className="stay-number">{index + 1}</span>
                <div><small>{segment.dates} · {segment.town}</small><strong>{segment.property}</strong><p>{segment.setup} · {segment.note}</p></div>
                <b>${segment.estimate.toLocaleString()}</b>
              </div>
            ))}
          </div>
          <SeeMoreButton expanded={showScenarioDetails} onClick={() => setShowScenarioDetails((value) => !value)} moreLabel="See full costs and trade-offs" lessLabel="Hide full costs and trade-offs" />
          {showScenarioDetails ? (
            <div className="scenario-expanded">
              <div className="scenario-costs"><h3>Working estimate</h3>{selectedScenario.costLines.map((line) => <div key={line.label}><span>{line.label}</span><strong>${line.amount.toLocaleString()}</strong></div>)}<div className="scenario-total"><span>Estimated total</span><strong>${selectedScenario.total.toLocaleString()}</strong></div></div>
              <div><h3>Why choose it</h3><ul>{selectedScenario.highlights.map((item) => <li key={item}><Check />{item}</li>)}</ul></div>
              <div><h3>Watch-outs</h3><ul>{selectedScenario.tradeoffs.map((item) => <li key={item}>— {item}</li>)}</ul></div>
            </div>
          ) : null}
          <footer>Planning estimate only · verify rates, taxes, room layouts, and cancellation terms directly.</footer>
        </article>
      </section>
      <LodgingCalculator />
    </>
  )
}

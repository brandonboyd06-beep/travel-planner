import { useState } from 'react'
import { BedDouble, Bus, CalendarCheck2, Car, Check, CloudSun, DollarSign, MapPinned, Users } from 'lucide-react'
import { PageHeader, SectionHeading } from '../components/AppShell'
import { AlertBanner, Button, StatusPill, SummaryCard } from '../components/ui'
import { bookingChecklist, trip } from '../data/trip'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { AppLink } from '../components/AppLink'
import { RoutePreviewMap } from '../components/RoutePreviewMap'
import { RouteExplorerModal } from '../components/RouteExplorerModal'
import { useItinerary } from '../context/itinerary'
import { routePointsForPlan } from '../lib/itineraryPlan'

export function OverviewPage() {
  const { plan } = useItinerary()
  const [checked, setChecked] = useLocalStorage<string[]>('overview-checklist', [])
  const [copied, setCopied] = useState(false)
  const [routeOpen, setRouteOpen] = useState(false)
  const routePoints = routePointsForPlan(plan)
  const share = async () => {
    const data = { title: 'Banff 2026', text: 'Banff & the Canadian Rockies · Oct 3–10, 2026', url: window.location.href }
    if (navigator.share) await navigator.share(data)
    else { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  }
  return (
    <>
      <PageHeader title={trip.title} subtitle={`${trip.dates} · ${trip.travelers.length} Travelers`} actions={<><Button className="secondary" onClick={share}>{copied ? <Check size={16} /> : null}{copied ? 'Copied' : 'Share trip'}</Button><AppLink className="button primary" href="/book">Book & reserve</AppLink></>} />
      <div className="summary-grid six">
        <SummaryCard label="Trip dates" value="Oct 3 – Oct 10" />
        <SummaryCard label="Nights" value="7 nights" />
        <SummaryCard label="Destination" value="Banff, Alberta" />
        <SummaryCard label="Travelers" value="4 adults" />
        <SummaryCard label="Lodging budget" value="$8,000 USD" />
        <SummaryCard label="Rental car" value="Avis · President’s Club" />
      </div>
      <div className="overview-grid">
        <div className="overview-primary">
          <AlertBanner><strong>Moraine Lake requires advance planning.</strong><span> Normal personal vehicle access is not allowed. Reserve shuttle transportation in advance.</span></AlertBanner>
          <section className="panel route-panel">
            <SectionHeading title="Trip route" link={{ label: 'Open interactive map', to: '/map' }} />
            <div className="route-visual">
              <RoutePreviewMap points={routePoints} onOpen={() => setRouteOpen(true)} label="Explore the whole trip" height={245} />
              <div className="route-stops"><span><i />Calgary Airport</span><span><i />Banff · 4 nights</span><span><i />Lake Louise + Moraine</span><span><i />Icefields Parkway</span><span><i />Johnston Canyon</span><span><i />Canmore · 3 nights</span><button type="button" onClick={() => setRouteOpen(true)}><MapPinned />Choose stops & open Google Maps</button></div>
            </div>
          </section>
          <section className="overview-change-cta"><div><strong>Someone just suggested another stop?</strong><span>Tell Miller Time what to add and she’ll place it on the day that makes the most sense.</span></div><AppLink className="button primary" href="/itinerary">Change the itinerary</AppLink></section>
          <section>
            <SectionHeading title="Trip highlights" link={{ label: 'See all activities', to: '/activities' }} />
            <div className="highlight-strip">
              {plan.days.slice(1, 5).map((day) => <AppLink href={`/itinerary#itinerary-${day.id}`} key={day.id} className="highlight-card"><img src={day.image} alt="" /><div><span>{day.day} · OCT {day.date}</span><strong>{day.title}</strong></div></AppLink>)}
            </div>
          </section>
        </div>
        <aside className="utility-rail">
          <section className="panel logistics-card">
            <SectionHeading title="Logistics" />
            <div className="logistics-row"><Car /><div><strong>Rental car</strong><span>Avis President’s Club</span><small>YYC pickup · Oct 3</small></div></div>
            <div className="logistics-row"><BedDouble /><div><strong>Recommended split</strong><span>4 nights Banff · 3 Canmore</span><small>One hotel change</small></div></div>
            <div className="logistics-row"><DollarSign /><div><strong>Lodging budget</strong><span>$0 confirmed of $8,000</span><small>Verify rates before booking</small></div></div>
          </section>
          <section className="panel weather-card">
            <div className="weather-title"><CloudSun /><div><strong>October conditions</strong><span>Forecast available closer to departure</span></div></div>
            <p>Cool days, freezing nights, and rapid changes are normal. Lake Louise is generally colder.</p>
            <StatusPill tone="amber">Keep one day flexible</StatusPill>
          </section>
          <section className="panel checklist-card">
            <SectionHeading title="Reservation checklist" />
            {bookingChecklist.slice(0, 6).map((item) => {
              const done = checked.includes(item)
              return <label key={item}><input type="checkbox" checked={done} onChange={() => setChecked((current) => done ? current.filter((entry) => entry !== item) : [...current, item])} /><span>{item}</span></label>
            })}
            <AppLink className="text-link" href="/book">Open booking center</AppLink>
          </section>
        </aside>
      </div>
      <div className="quick-links" aria-label="Trip quick links">
        <AppLink href="/book"><CalendarCheck2 />Book & reserve</AppLink><AppLink href="/lodging"><BedDouble />Compare stays</AppLink><AppLink href="/transportation"><Bus />Shuttles</AppLink><AppLink href="/map"><MapPinned />Trip map</AppLink><AppLink href="/notes"><Users />Group lists</AppLink>
      </div>
      <RouteExplorerModal open={routeOpen} title="The complete Banff trip map" description="Every unique itinerary stop is included. Choose any or all, then open the labeled route parts in Google Maps." points={routePoints} onClose={() => setRouteOpen(false)} />
    </>
  )
}

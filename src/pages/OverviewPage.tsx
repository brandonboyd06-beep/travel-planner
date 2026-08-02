import { useState } from 'react'
import { BedDouble, Bus, CalendarCheck2, Car, Check, CheckCircle2, Circle, CloudSun, DollarSign, MapPinned, Users } from 'lucide-react'
import { PageHeader, SectionHeading } from '../components/AppShell'
import { AlertBanner, Button, StatusPill, SummaryCard } from '../components/ui'
import { bookingItems } from '../data/bookings'
import { trip } from '../data/trip'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { AppLink } from '../components/AppLink'
import { RoutePreviewMap } from '../components/RoutePreviewMap'
import { RouteExplorerModal } from '../components/RouteExplorerModal'
import { useItinerary } from '../context/itinerary'
import { routePointsForPlan } from '../lib/itineraryPlan'
import { itineraryIncludes, summarizeItinerary } from '../lib/itinerarySummary'
import { isShuttleBooking, reconcileBookingItems } from '../lib/bookingPlan'
import { resolveItineraryDayVisual } from '../lib/placeVisuals'

export function OverviewPage() {
  const { plan } = useItinerary()
  const summary = summarizeItinerary(plan)
  const visitsMoraineLake = itineraryIncludes(plan, ['Moraine Lake'])
  const currentBookings = reconcileBookingItems(plan, bookingItems).filter((item) => item.inCurrentPlan)
  const currentShuttles = currentBookings.filter(isShuttleBooking)
  const [bookingProgress] = useLocalStorage<string[]>('booking-progress', [])
  const bookingSnapshot = [
    ...(currentShuttles.length > 0 ? [{
      id: 'lake-shuttle-choice',
      title: 'Choose one lake-shuttle option',
      date: currentShuttles[0].tripDate,
      done: currentShuttles.some((item) => bookingProgress.includes(item.id)),
    }] : []),
    ...currentBookings.filter((item) => !isShuttleBooking(item)).map((item) => ({
      id: item.id,
      title: item.title,
      date: item.tripDate,
      done: bookingProgress.includes(item.id),
    })),
  ]
  const handledBookings = bookingSnapshot.filter((item) => item.done).length
  const [copied, setCopied] = useState(false)
  const [routeOpen, setRouteOpen] = useState(false)
  const routePoints = routePointsForPlan(plan)
  const share = async () => {
    const data = { title: `${summary.destinationLabel} 2026`, text: `${summary.destinationLabel} · ${trip.dates} · Revision ${plan.revision}`, url: window.location.href }
    if (navigator.share) await navigator.share(data)
    else { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  }
  return (
    <>
      <PageHeader title={plan.revision === 0 ? trip.title : `${summary.destinationLabel} · Canadian Rockies`} subtitle={`${trip.dates} · ${trip.travelers.length} Travelers · Revision ${plan.revision}`} actions={<><Button className="secondary" onClick={share}>{copied ? <Check size={16} /> : null}{copied ? 'Copied' : 'Share trip'}</Button><AppLink className="button primary" href="/book">Book & reserve</AppLink></>} />
      <div className="summary-grid six">
        <SummaryCard label="Trip dates" value="Oct 3 – Oct 10" />
        <SummaryCard label="Nights" value={`${summary.nights} ${summary.nights === 1 ? 'night' : 'nights'}`} />
        <SummaryCard label="Overnight bases" value={summary.destinationLabel} detail={summary.baseSummary} />
        <SummaryCard label="Travelers" value="4 adults" />
        <SummaryCard label="Lodging budget" value="$8,000 USD" />
        <SummaryCard label="Rental car" value="Avis · President’s Club" />
      </div>
      <div className="overview-grid">
        <div className="overview-primary">
          {visitsMoraineLake ? <AlertBanner><strong>Moraine Lake requires advance planning.</strong><span> Normal personal vehicle access is not allowed. Reserve shuttle transportation in advance.</span></AlertBanner> : null}
          <section className="panel route-panel">
            <SectionHeading title="Trip route" link={{ label: 'Open interactive map', to: '/map' }} />
            <div className="route-visual">
              <RoutePreviewMap points={routePoints} onOpen={() => setRouteOpen(true)} label="Explore the whole trip" height={245} />
              <div className="route-stops">{summary.routeLabels.map((route) => <span key={route.id}><i />{route.label}</span>)}<button type="button" onClick={() => setRouteOpen(true)}><MapPinned />Choose stops & open Google Maps</button></div>
            </div>
          </section>
          <section className="overview-change-cta"><div><strong>Someone just suggested another stop?</strong><span>Tell Miller Time what to add and she’ll place it on the day that makes the most sense.</span></div><AppLink className="button primary" href="/itinerary">Change the itinerary</AppLink></section>
          <section>
            <SectionHeading title="Trip highlights" link={{ label: 'See all activities', to: '/activities' }} />
            <div className="highlight-strip">
              {plan.days.slice(1, 5).map((day) => {
                const visual = resolveItineraryDayVisual(day)
                return <AppLink href={`/itinerary#itinerary-${day.id}`} key={day.id} className="highlight-card"><img src={visual.image} alt={visual.imageAlt} loading="lazy" decoding="async" /><div><span>{day.day} · OCT {day.date}</span><strong>{day.title}</strong></div></AppLink>
              })}
            </div>
          </section>
        </div>
        <aside className="utility-rail">
          <section className="panel logistics-card">
            <SectionHeading title="Logistics" />
            <div className="logistics-row"><Car /><div><strong>Rental car</strong><span>Avis President’s Club</span><small>YYC pickup · Oct 3</small></div></div>
            <div className="logistics-row"><BedDouble /><div><strong>Current overnight plan</strong><span>{summary.baseSummary}</span><small>{summary.baseChanges} {summary.baseChanges === 1 ? 'base change' : 'base changes'} · Revision {plan.revision}</small></div></div>
            <div className="logistics-row"><DollarSign /><div><strong>Lodging budget</strong><span>$0 confirmed of $8,000</span><small>Verify rates before booking</small></div></div>
          </section>
          <section className="panel weather-card">
            <div className="weather-title"><CloudSun /><div><strong>October conditions</strong><span>Forecast available closer to departure</span></div></div>
            <p>Cool days, freezing nights, and rapid changes are normal. Lake Louise is generally colder.</p>
            <StatusPill tone="amber">Keep one day flexible</StatusPill>
          </section>
          <section className="panel checklist-card">
            <SectionHeading title="Booking center snapshot" />
            <p className="booking-snapshot-summary">{handledBookings} of {bookingSnapshot.length} current actions handled</p>
            {bookingSnapshot.map((item) => <div className={`booking-snapshot-row ${item.done ? 'done' : ''}`} key={item.id}>{item.done ? <CheckCircle2 /> : <Circle />}<span><strong>{item.title}</strong><small>{item.date}</small></span></div>)}
            <AppLink className="text-link" href="/book">Review or update bookings</AppLink>
          </section>
        </aside>
      </div>
      <div className="quick-links" aria-label="Trip quick links">
        <AppLink href="/book"><CalendarCheck2 />Book & reserve</AppLink><AppLink href="/lodging"><BedDouble />Compare stays</AppLink><AppLink href="/transportation"><Bus />Shuttles</AppLink><AppLink href="/map"><MapPinned />Trip map</AppLink><AppLink href="/notes"><Users />Group lists</AppLink>
      </div>
      <RouteExplorerModal open={routeOpen} title={`The complete ${summary.destinationLabel} trip map`} description={`Every unique stop in itinerary Revision ${plan.revision} is included. Choose any or all, then open the labeled route parts in Google Maps.`} points={routePoints} onClose={() => setRouteOpen(false)} />
    </>
  )
}

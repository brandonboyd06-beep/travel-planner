import { CalendarDays, Download, ListFilter, Printer } from 'lucide-react'
import { PageHeader } from '../components/AppShell'
import { ItineraryDayCard } from '../components/ItineraryDayCard'
import { AlertBanner, Button, StatusPill } from '../components/ui'
import { itinerary } from '../data/itinerary'
import { trip } from '../data/trip'
import { useLocalStorage } from '../hooks/useLocalStorage'

export function ItineraryPage() {
  const [optionalDays, setOptionalDays] = useLocalStorage<number[]>('optional-days', [7])
  return (
    <>
      <PageHeader title="Day-by-day itinerary" subtitle={`${trip.dates} · 7 nights · Banff and Canmore`} actions={<><Button className="secondary" onClick={() => window.print()}><Printer size={16} />Print</Button><Button className="primary" onClick={() => window.print()}><Download size={16} />Export</Button></>} />
      <div className="itinerary-toolbar"><div><StatusPill tone="green">Core plan</StatusPill><StatusPill tone="amber">Weather-flexible</StatusPill></div><div><button className="segmented active"><CalendarDays size={15} />Day view</button><button className="segmented"><ListFilter size={15} />All 8 days</button></div></div>
      <AlertBanner tone="info"><strong>October-first planning:</strong><span> Lake Louise and Moraine Lake are early in the trip for retry flexibility. Use October 6 only if the Icefields Parkway road-weather window is good.</span></AlertBanner>
      <section className="itinerary-list" aria-label="Eight-day itinerary">
        {itinerary.map((day) => <ItineraryDayCard key={day.date} item={day} optionalOn={optionalDays.includes(day.date)} onToggle={() => setOptionalDays((current) => current.includes(day.date) ? current.filter((date) => date !== day.date) : [...current, day.date])} />)}
      </section>
    </>
  )
}

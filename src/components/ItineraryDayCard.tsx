import { CheckCircle2, Circle, CloudRain, LockKeyhole, MapPin, Navigation, Pencil, Plus } from 'lucide-react'
import { routePointsForDay } from '../lib/itineraryPlan'
import { resolveItineraryDayVisual } from '../lib/placeVisuals'
import type { ItineraryDay } from '../types'
import { RoutePreviewMap } from './RoutePreviewMap'
import { StatusPill } from './ui'

interface ItineraryDayCardProps {
  item: ItineraryDay
  optionalOn: boolean
  onToggle: () => void
  onOpenRoute: () => void
  onAddStop: () => void
  onEditDay: () => void
  canEdit: boolean
}

export function ItineraryDayCard({ item, optionalOn, onToggle, onOpenRoute, onAddStop, onEditDay, canEdit }: ItineraryDayCardProps) {
  const routePoints = routePointsForDay(item)
  const visual = resolveItineraryDayVisual(item)

  return (
    <article className="itinerary-day-card" id={`itinerary-${item.id}`}>
      <div className="day-date"><span>{item.day}</span><strong>{item.date}</strong><small>{item.month}</small></div>
      <div className="day-plan">
        <div className="day-title-row">
          <div><h3>{item.title}</h3>{item.label ? <StatusPill tone={item.tone}>{item.label}</StatusPill> : null}</div>
          <div className="day-edit-actions">
            <button type="button" onClick={onAddStop} disabled={!canEdit}><Plus />Add stop</button>
            <button type="button" onClick={onEditDay} disabled={!canEdit}><Pencil />Edit day</button>
          </div>
        </div>
        <ol className="compact-list">
          {item.stops.map((stop, index) => (
            <li key={stop.id} className={stop.priority === 'optional' ? 'optional-stop' : ''}>
              <span className="stop-sequence">{index + 1}</span>
              <span className="stop-copy"><strong>{stop.name}</strong>{stop.note ? <small>{stop.note}</small> : null}</span>
              {stop.priority === 'fixed' ? <LockKeyhole aria-label="Fixed logistics" /> : stop.priority === 'optional' ? <Circle aria-label="Optional stop" /> : <CheckCircle2 aria-label="Core stop" />}
            </li>
          ))}
        </ol>
        <button className="optional-toggle" type="button" onClick={onToggle} aria-expanded={optionalOn}><Circle />{optionalOn ? 'Hide extra ideas' : `More ideas for this day (${item.optional.length})`}</button>
        {optionalOn ? <ul className="optional-list">{item.optional.map((idea) => <li key={idea}>{idea}</li>)}</ul> : null}
        <div className="stay-line"><MapPin />Stay: {item.location}</div>
      </div>
      <img className="day-photo" src={visual.image} alt={visual.imageAlt} loading="lazy" decoding="async" />
      <div className="day-map">
        <RoutePreviewMap points={routePoints} onOpen={onOpenRoute} label="Explore route" height="100%" />
      </div>
      <details className="day-details">
        <summary>Logistics, weather backup, and dining</summary>
        <div><p><strong>Logistics:</strong> {item.logistics}</p><p><CloudRain /><strong>Weather backup:</strong> {item.backup}</p><p><strong>Dining:</strong> {item.dining.join(' · ')}</p></div>
      </details>
      <button className="day-route-mobile" type="button" onClick={onOpenRoute}><Navigation />Open this day’s map</button>
    </article>
  )
}

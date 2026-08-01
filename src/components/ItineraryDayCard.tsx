import { CheckCircle2, Circle, CloudRain, MapPin, Navigation } from 'lucide-react'
import type { ItineraryDay } from '../types'
import { EmptyMapGraphic, StatusPill } from './ui'

export function ItineraryDayCard({ item, optionalOn, onToggle }: { item: ItineraryDay; optionalOn: boolean; onToggle: () => void }) {
  return (
    <article className="itinerary-day-card">
      <div className="day-date"><span>{item.day}</span><strong>{item.date}</strong><small>{item.month}</small></div>
      <div className="day-plan">
        <div className="day-title-row"><h3>{item.title}</h3>{item.label ? <StatusPill tone={item.tone}>{item.label}</StatusPill> : null}</div>
        <ul className="compact-list">
          {item.core.slice(0, 5).map((step, index) => <li key={step}>{index === item.core.length - 1 ? <CheckCircle2 className="success-icon" /> : <Circle className="dot-icon" />}<span>{step}</span></li>)}
        </ul>
        <button className="optional-toggle" type="button" onClick={onToggle} aria-expanded={optionalOn}><Circle size={13} />{optionalOn ? 'Hide optional ideas' : `${item.optional.length} optional ideas`}</button>
        {optionalOn ? <ul className="optional-list">{item.optional.map((idea) => <li key={idea}>{idea}</li>)}</ul> : null}
        <div className="stay-line"><MapPin size={13} />Stay: {item.location}</div>
      </div>
      <img className="day-photo" src={item.image} alt={item.imageAlt} loading="lazy" />
      <div className="day-map"><EmptyMapGraphic points={3} /><span><Navigation size={12} />Route preview</span></div>
      <details className="day-details"><summary>Day details</summary><div><p><strong>Logistics:</strong> {item.logistics}</p><p><CloudRain size={14} /><strong>Weather backup:</strong> {item.backup}</p><p><strong>Dining:</strong> {item.dining.join(' · ')}</p></div></details>
    </article>
  )
}

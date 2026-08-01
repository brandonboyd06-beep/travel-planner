import { useMemo, useState } from 'react'
import { CalendarDays, ExternalLink, MapPin, Utensils } from 'lucide-react'
import { PageHeader } from '../components/AppShell'
import { SeeMoreButton, StatusPill } from '../components/ui'
import { restaurants } from '../data/restaurants'

const towns = ['All', 'Banff', 'Canmore', 'Lake Louise'] as const

export function DiningPage() {
  const [town, setTown] = useState<(typeof towns)[number]>('All')
  const [showAll, setShowAll] = useState(false)
  const visible = useMemo(() => town === 'All' ? restaurants : restaurants.filter((item) => item.town === town), [town])
  const displayed = showAll ? visible : visible.slice(0, 6)
  return (
    <>
      <PageHeader title="Dining & drinks" subtitle="Casual breweries, destination dinners, cocktails, and flexible backups" />
      <div className="filter-bar compact" role="tablist" aria-label="Restaurant town">{towns.map((item) => <button role="tab" aria-selected={town === item} className={town === item ? 'active' : ''} key={item} onClick={() => { setTown(item); setShowAll(false) }}>{item}</button>)}</div>
      <div className="dining-feature"><img src="/images/banff-avenue.jpg" alt="Banff Avenue in autumn" /><div><span>Planning approach</span><h2>Reserve a few anchors. Keep the rest relaxed.</h2><p>Book the small, special, or view-driven meals early. Leave the Icefields evening flexible and keep a brewery fallback for changing weather.</p><div><StatusPill tone="green">4 priority reservations</StatusPill><StatusPill tone="amber">Day 4 flexible</StatusPill></div></div></div>
      <section className="restaurant-grid" aria-live="polite">
        {displayed.map((item) => <article className="restaurant-card" key={item.name}><div className="restaurant-top"><div className="restaurant-icon"><Utensils /></div><div><span>{item.cuisine}</span><h2>{item.name}</h2></div><b>{item.price}</b></div><p>{item.atmosphere}</p><dl><div><dt>Best for</dt><dd>{item.bestFor}</dd></div><div><dt><CalendarDays />Suggested</dt><dd>{item.day}</dd></div><div><dt><MapPin />Town</dt><dd>{item.town}</dd></div></dl><div className="restaurant-footer"><StatusPill tone={item.reserve ? 'amber' : 'gray'}>{item.reserve ? 'Reserve' : 'Walk-in friendly'}</StatusPill><a href={item.url} target="_blank" rel="noopener noreferrer">Website / menu<ExternalLink size={14} /></a></div></article>)}
      </section>
      {visible.length > 6 ? <SeeMoreButton expanded={showAll} onClick={() => setShowAll((value) => !value)} count={visible.length - 6} moreLabel="See more dining options" lessLabel="See fewer dining options" /> : null}
    </>
  )
}

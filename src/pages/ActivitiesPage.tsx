import { useMemo, useState } from 'react'
import { CloudRain, Mountain, Plus, SlidersHorizontal } from 'lucide-react'
import { PageHeader } from '../components/AppShell'
import { AlertBanner, SeeMoreButton, StatusPill } from '../components/ui'
import { useItinerary } from '../context/itinerary'
import { activities, activityFilters } from '../data/activities'
import { navigate } from '../components/AppLink'
import { hasLodgingResearchGap } from '../lib/itinerarySummary'

export function ActivitiesPage() {
  const { plan } = useItinerary()
  const [filter, setFilter] = useState('All')
  const [showAll, setShowAll] = useState(false)
  const visible = useMemo(() => activities.filter((item) => filter === 'All' || item.tags.includes(filter) || item.area === filter || item.cost === filter || (filter === 'Moderate' && item.difficulty.includes('moderate'))), [filter])
  const displayed = showAll ? visible : visible.slice(0, 6)
  const addToItinerary = (name: string) => {
    window.sessionStorage.setItem('banff-2026:itinerary-idea', `Add ${name} to the itinerary on the day where it fits best`)
    navigate('/itinerary')
  }
  return (
    <>
      <PageHeader title="Things to do" subtitle="Easy and moderate options with weather-ready alternatives" />
      {hasLodgingResearchGap(plan) ? <AlertBanner><strong>This catalog covers the original Banff, Canmore, and Lake Louise route.</strong><span> Your current itinerary includes a different overnight plan. Ask Miller Time to research fresh, date-appropriate activities for every new destination.</span></AlertBanner> : null}
      <div className="filter-scroll" role="group" aria-label="Filter activities"><SlidersHorizontal size={16} />{activityFilters.map((item) => <button type="button" aria-pressed={filter === item} className={filter === item ? 'active' : ''} onClick={() => { setFilter(item); setShowAll(false) }} key={item}>{item}</button>)}</div>
      <section className="activity-grid" aria-live="polite">
        {displayed.map((item) => <article className="activity-card" key={item.name}><img src={item.image} alt="" loading="lazy" decoding="async" /><div className="activity-card-body"><div className="activity-meta"><span>{item.area}</span><StatusPill tone={item.cost === 'Free' ? 'green' : 'blue'}>{item.cost}</StatusPill></div><h2>{item.name}</h2><p>{item.note}</p><div className="activity-footer"><span><Mountain />{item.difficulty}</span>{item.tags.includes('Bad weather') ? <span><CloudRain />Bad-weather option</span> : null}<button type="button" onClick={() => addToItinerary(item.name)}><Plus />Ask MT to add</button></div></div></article>)}
      </section>
      {visible.length > 6 ? <SeeMoreButton expanded={showAll} onClick={() => setShowAll((value) => !value)} count={visible.length - 6} moreLabel="See more activity options" lessLabel="See fewer activity options" /> : null}
      {visible.length === 0 ? <div className="empty-state"><Mountain /><h2>No activities match this filter</h2><button className="button secondary" onClick={() => setFilter('All')}>Show all activities</button></div> : null}
    </>
  )
}

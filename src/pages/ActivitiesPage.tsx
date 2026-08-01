import { useMemo, useState } from 'react'
import { ArrowUpRight, CloudRain, Mountain, SlidersHorizontal } from 'lucide-react'
import { PageHeader } from '../components/AppShell'
import { StatusPill } from '../components/ui'
import { activities, activityFilters } from '../data/activities'

export function ActivitiesPage() {
  const [filter, setFilter] = useState('All')
  const visible = useMemo(() => activities.filter((item) => filter === 'All' || item.tags.includes(filter) || item.area === filter || item.cost === filter || (filter === 'Moderate' && item.difficulty.includes('moderate'))), [filter])
  return (
    <>
      <PageHeader title="Things to do" subtitle="Easy and moderate options with weather-ready alternatives" />
      <div className="filter-scroll"><SlidersHorizontal size={16} />{activityFilters.map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
      <section className="activity-grid" aria-live="polite">
        {visible.map((item) => <article className="activity-card" key={item.name}><img src={item.image} alt="" loading="lazy" /><div className="activity-card-body"><div className="activity-meta"><span>{item.area}</span><StatusPill tone={item.cost === 'Free' ? 'green' : 'blue'}>{item.cost}</StatusPill></div><h2>{item.name}</h2><p>{item.note}</p><div className="activity-footer"><span><Mountain />{item.difficulty}</span>{item.tags.includes('Bad weather') ? <span><CloudRain />Bad-weather option</span> : null}<ArrowUpRight /></div></div></article>)}
      </section>
      {visible.length === 0 ? <div className="empty-state"><Mountain /><h2>No activities match this filter</h2><button className="button secondary" onClick={() => setFilter('All')}>Show all activities</button></div> : null}
    </>
  )
}

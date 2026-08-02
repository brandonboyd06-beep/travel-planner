import { useMemo, useState } from 'react'
import { Clock3, ExternalLink, MapPin, Mountain, Plus, SlidersHorizontal, Sun } from 'lucide-react'
import { PageHeader } from '../components/AppShell'
import { AlertBanner, SeeMoreButton, StatusPill } from '../components/ui'
import { useItinerary } from '../context/itinerary'
import { activities, activityFilters } from '../data/activities'
import { navigate } from '../components/AppLink'
import { buildGoogleMapsSearchUrl } from '../lib/maps'

function itineraryIncludesJasper(searchablePlan: string) {
  return /\bjasper\b|athabasca falls|pyramid (lake|island)|maligne lake/i.test(searchablePlan)
}

export function ActivitiesPage() {
  const { plan } = useItinerary()
  const [filter, setFilter] = useState('All')
  const [showAll, setShowAll] = useState(false)

  const includesJasper = useMemo(() => itineraryIncludesJasper(plan.days.map((day) => [
    day.title,
    day.location,
    day.logistics,
    ...day.stops.flatMap((stop) => [stop.name, stop.mapsQuery]),
  ].join(' ')).join(' ')), [plan.days])

  const filters = useMemo(() => includesJasper ? [...activityFilters, 'Jasper'] : activityFilters, [includesJasper])
  const activeFilter = filters.includes(filter) ? filter : 'All'
  const availableActivities = useMemo(
    () => includesJasper ? activities : activities.filter((item) => item.area !== 'Jasper'),
    [includesJasper],
  )
  const visible = useMemo(() => availableActivities.filter((item) => {
    if (activeFilter === 'All') return true
    if (item.tags.includes(activeFilter) || item.area === activeFilter || item.cost === activeFilter) return true
    return activeFilter === 'Moderate' && item.difficulty.toLowerCase().includes('moderate')
  }), [activeFilter, availableActivities])
  const displayed = showAll ? visible : visible.slice(0, 6)

  const addToItinerary = (name: string) => {
    window.sessionStorage.setItem('banff-2026:itinerary-idea', `Add ${name} to the itinerary on the day where it fits best`)
    navigate('/itinerary')
  }

  return (
    <>
      <PageHeader title="Things to do" subtitle="Location-inspired previews, quick highlights, and weather-ready alternatives" />
      {includesJasper ? (
        <AlertBanner tone="info">
          <strong>Jasper ideas are included for your current route.</strong>
          <span> Maligne Canyon and Mount Edith Cavell are intentionally left out because of 2026 closures. Re-check Parks Canada before the trip.</span>
        </AlertBanner>
      ) : null}
      <div className="filter-scroll" role="group" aria-label="Filter activities">
        <SlidersHorizontal size={16} />
        {filters.map((item) => (
          <button
            type="button"
            aria-pressed={activeFilter === item}
            className={activeFilter === item ? 'active' : ''}
            onClick={() => {
              setFilter(item)
              setShowAll(false)
            }}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <section className="activity-grid" aria-live="polite" aria-label={`${activeFilter} activity options`}>
        {displayed.map((item) => {
          const mapUrl = buildGoogleMapsSearchUrl({ id: item.id, name: item.name, mapsQuery: item.mapsQuery })
          return (
            <article className="activity-card" key={item.id}>
              <figure className="activity-image">
                <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" />
                <figcaption>Illustrative location preview</figcaption>
              </figure>
              <div className="activity-card-body">
                <div className="activity-meta">
                  <span>{item.area}</span>
                  <StatusPill tone={item.cost === 'Free' ? 'green' : 'blue'}>{item.cost}</StatusPill>
                </div>
                <h2>{item.name}</h2>
                <p><strong>Why go:</strong> {item.whyGo}</p>
                <div className="activity-meta"><span>Highlights</span></div>
                <p>{item.highlights.join(' · ')}</p>
                <div className="activity-meta"><span>Best time · {item.bestTime}</span></div>
                <p>{item.note}</p>
                <div className="activity-footer" aria-label="Activity details">
                  <span><Mountain aria-hidden="true" />{item.difficulty}</span>
                  <span><Clock3 aria-hidden="true" />{item.timeNeeded}</span>
                  <span><Sun aria-hidden="true" />{item.bestTime}</span>
                </div>
                <div className="restaurant-footer">
                  {item.officialUrl ? (
                    <a href={item.officialUrl} target="_blank" rel="noopener noreferrer">
                      Official info<ExternalLink aria-hidden="true" />
                    </a>
                  ) : <StatusPill tone="gray">Verify conditions</StatusPill>}
                  <div>
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.name} in Google Maps`}>
                      <MapPin aria-hidden="true" />Map
                    </a>
                    <button type="button" onClick={() => addToItinerary(item.name)}>
                      <Plus aria-hidden="true" />Ask MT to add
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </section>
      {visible.length > 6 ? (
        <SeeMoreButton
          expanded={showAll}
          onClick={() => setShowAll((value) => !value)}
          count={visible.length - 6}
          moreLabel="See more activity options"
          lessLabel="See fewer activity options"
        />
      ) : null}
      {visible.length === 0 ? (
        <div className="empty-state">
          <Mountain />
          <h2>No activities match this filter</h2>
          <button className="button secondary" onClick={() => setFilter('All')}>Show all activities</button>
        </div>
      ) : null}
    </>
  )
}

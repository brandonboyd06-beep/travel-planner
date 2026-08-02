import { useCallback, useMemo, useState } from 'react'
import { ExternalLink, LocateFixed, MapPin } from 'lucide-react'
import { AppLink } from '../components/AppLink'
import { PageHeader } from '../components/AppShell'
import { FullMap } from '../components/FullMap'
import { AlertBanner, StatusPill } from '../components/ui'
import { useItinerary } from '../context/itinerary'
import { mapDataForItinerary } from '../lib/itinerarySummary'
import type { MapLocation } from '../types'

type MapCategory = 'All' | MapLocation['category']

export function MapPage() {
  const { plan } = useItinerary()
  const mapData = useMemo(() => mapDataForItinerary(plan), [plan])
  const categories = useMemo<MapCategory[]>(() => ['All', ...mapData.categories], [mapData.categories])
  const [category, setCategory] = useState<MapCategory>('All')
  const [selectedId, setSelectedId] = useState(() => mapData.locations[0]?.id ?? '')
  const activeCategory = category === 'All' || mapData.categories.includes(category) ? category : 'All'
  const visible = useMemo(
    () => activeCategory === 'All' ? mapData.locations : mapData.locations.filter((item) => item.category === activeCategory),
    [activeCategory, mapData.locations],
  )
  const selected = visible.find((location) => location.id === selectedId) ?? visible[0] ?? null
  const select = useCallback((location: MapLocation) => setSelectedId(location.id), [])
  const selectCategory = useCallback((nextCategory: MapCategory) => {
    const nextVisible = nextCategory === 'All' ? mapData.locations : mapData.locations.filter((item) => item.category === nextCategory)
    setCategory(nextCategory)
    setSelectedId((currentId) => nextVisible.some((location) => location.id === currentId) ? currentId : (nextVisible[0]?.id ?? ''))
  }, [mapData.locations])
  const googleMapsUrl = selected
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.coordinates.join(','))}`
    : ''
  return (
    <>
      <PageHeader title="Trip map" subtitle={`Every pinned stop in the current itinerary · Revision ${plan.revision}`} />
      {mapData.unpinnedStops > 0 ? (
        <AlertBanner tone="info"><strong>{mapData.unpinnedStops} current itinerary {mapData.unpinnedStops === 1 ? 'stop uses' : 'stops use'} a search-only location.</strong><span> It remains in the itinerary but cannot receive an exact pin here. Use the day map to open it in Google Maps. </span><AppLink className="text-link" href="/itinerary">Open itinerary</AppLink></AlertBanner>
      ) : null}
      <div className="map-layout">
        <aside className="map-sidebar"><div className="map-filter"><span>Current itinerary</span>{categories.map((item) => <button type="button" aria-pressed={activeCategory === item} key={item} className={activeCategory === item ? 'active' : ''} onClick={() => selectCategory(item)}><i />{item}<b>{item === 'All' ? mapData.locations.length : mapData.locations.filter((location) => location.category === item).length}</b></button>)}</div><div className="map-location-list">{visible.map((item) => <button type="button" aria-pressed={selected?.id === item.id} key={item.id} className={selected?.id === item.id ? 'active' : ''} onClick={() => select(item)}><MapPin /><span><strong>{item.name}</strong><small>{item.day} · {item.note}</small></span></button>)}</div></aside>
        <div className="map-canvas"><FullMap locations={visible} onSelect={select} selectedId={selected?.id} />{selected ? <article className="map-detail"><div className="map-detail-icon"><LocateFixed /></div><div><StatusPill tone="blue">{selected.category}</StatusPill><h2>{selected.name}</h2><p>{selected.note} · {selected.day}</p></div><a className="button secondary" href={googleMapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps<ExternalLink size={14} /></a></article> : null}</div>
      </div>
    </>
  )
}

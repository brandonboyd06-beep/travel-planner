import { useCallback, useMemo, useState } from 'react'
import { ExternalLink, LocateFixed, MapPin } from 'lucide-react'
import { PageHeader } from '../components/AppShell'
import { FullMap } from '../components/FullMap'
import { StatusPill } from '../components/ui'
import { mapLocations } from '../data/mapLocations'
import type { MapLocation } from '../types'

const categories = ['All', 'Lodging', 'Dining', 'Activities', 'Shuttle pickup', 'Scenic stops', 'Airport', 'Visitor centers'] as const

export function MapPage() {
  const [category, setCategory] = useState<(typeof categories)[number]>('All')
  const [selectedId, setSelectedId] = useState(mapLocations[1]?.id ?? mapLocations[0]?.id ?? '')
  const visible = useMemo(() => category === 'All' ? mapLocations : mapLocations.filter((item) => item.category === category), [category])
  const selected = visible.find((location) => location.id === selectedId) ?? visible[0] ?? null
  const select = useCallback((location: MapLocation) => setSelectedId(location.id), [])
  const selectCategory = useCallback((nextCategory: (typeof categories)[number]) => {
    const nextVisible = nextCategory === 'All' ? mapLocations : mapLocations.filter((item) => item.category === nextCategory)
    setCategory(nextCategory)
    setSelectedId((currentId) => nextVisible.some((location) => location.id === currentId) ? currentId : (nextVisible[0]?.id ?? ''))
  }, [])
  const googleMapsUrl = selected
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.coordinates.join(','))}`
    : ''
  return (
    <>
      <PageHeader title="Trip map" subtitle="Lodging, dining, activities, shuttles, scenic stops, and the airport" />
      <div className="map-layout">
        <aside className="map-sidebar"><div className="map-filter"><span>Show on map</span>{categories.map((item) => <button type="button" aria-pressed={category === item} key={item} className={category === item ? 'active' : ''} onClick={() => selectCategory(item)}><i />{item}<b>{item === 'All' ? mapLocations.length : mapLocations.filter((location) => location.category === item).length}</b></button>)}</div><div className="map-location-list">{visible.map((item) => <button type="button" aria-pressed={selected?.id === item.id} key={item.id} className={selected?.id === item.id ? 'active' : ''} onClick={() => select(item)}><MapPin /><span><strong>{item.name}</strong><small>{item.day} · {item.note}</small></span></button>)}</div></aside>
        <div className="map-canvas"><FullMap locations={visible} onSelect={select} selectedId={selected?.id} />{selected ? <article className="map-detail"><div className="map-detail-icon"><LocateFixed /></div><div><StatusPill tone="blue">{selected.category}</StatusPill><h2>{selected.name}</h2><p>{selected.note} · {selected.day}</p></div><a className="button secondary" href={googleMapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps<ExternalLink size={14} /></a></article> : null}</div>
      </div>
    </>
  )
}

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
  const [selected, setSelected] = useState<MapLocation>(mapLocations[1])
  const visible = useMemo(() => category === 'All' ? mapLocations : mapLocations.filter((item) => item.category === category), [category])
  const select = useCallback((location: MapLocation) => setSelected(location), [])
  const directions = `https://www.google.com/maps/search/?api=1&query=${selected.coordinates.join(',')}`
  return (
    <>
      <PageHeader title="Trip map" subtitle="Lodging, dining, activities, shuttles, scenic stops, and the airport" />
      <div className="map-layout">
        <aside className="map-sidebar"><div className="map-filter"><span>Show on map</span>{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}><i />{item}<b>{item === 'All' ? mapLocations.length : mapLocations.filter((location) => location.category === item).length}</b></button>)}</div><div className="map-location-list">{visible.map((item) => <button key={item.id} className={selected.id === item.id ? 'active' : ''} onClick={() => setSelected(item)}><MapPin /><span><strong>{item.name}</strong><small>{item.day} · {item.note}</small></span></button>)}</div></aside>
        <div className="map-canvas"><FullMap locations={visible} onSelect={select} /><article className="map-detail"><div className="map-detail-icon"><LocateFixed /></div><div><StatusPill tone="blue">{selected.category}</StatusPill><h2>{selected.name}</h2><p>{selected.note} · {selected.day}</p></div><a className="button secondary" href={directions} target="_blank" rel="noopener noreferrer">Open directions<ExternalLink size={14} /></a></article></div>
      </div>
    </>
  )
}

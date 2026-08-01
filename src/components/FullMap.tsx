import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, LayerGroup } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapLocation } from '../types'

const colors: Record<MapLocation['category'], string> = {
  Lodging: '#1261c9', Dining: '#d97706', Activities: '#168a63', 'Shuttle pickup': '#7c3aed',
  'Scenic stops': '#0e7490', Airport: '#334155', 'Visitor centers': '#b45309',
}

const googleMapsUrl = ([latitude, longitude]: [number, number]) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`

export function FullMap({ locations, onSelect }: { locations: MapLocation[]; onSelect: (location: MapLocation) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    async function setup() {
      const L = await import('leaflet')
      if (!active || !containerRef.current || mapRef.current) return
      const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false }).setView([51.48, -115.9], 8)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      setReady(true)
      window.setTimeout(() => map.invalidateSize(), 50)
    }
    void setup()
    return () => {
      active = false
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function update() {
      const L = await import('leaflet')
      if (!active || !ready || !mapRef.current || !layerRef.current) return
      layerRef.current.clearLayers()
      locations.forEach((location) => {
        const marker = L.marker(location.coordinates, {
          icon: L.divIcon({ className: 'custom-map-marker', html: `<span style="background:${colors[location.category]}"></span>`, iconSize: [24, 24], iconAnchor: [12, 12] }),
        })
        marker.bindPopup(`<strong>${location.name}</strong><small>${location.category} · ${location.day}</small><p>${location.note}</p><a class="google-maps-link" href="${googleMapsUrl(location.coordinates)}" target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a>`)
        marker.on('click', () => onSelect(location))
        marker.addTo(layerRef.current!)
      })
      if (locations.length) mapRef.current.fitBounds(L.latLngBounds(locations.map((location) => location.coordinates)), { padding: [38, 38], maxZoom: 10 })
    }
    void update()
    return () => { active = false }
  }, [locations, onSelect, ready])

  return <div className="full-map" ref={containerRef} aria-label="Interactive trip map" />
}

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, LayerGroup, Marker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapLocation } from '../types'

const colors: Record<MapLocation['category'], string> = {
  Lodging: '#1261c9', Dining: '#d97706', Activities: '#168a63', 'Shuttle pickup': '#7c3aed',
  'Scenic stops': '#0e7490', Airport: '#334155', 'Visitor centers': '#b45309',
}

const googleMapsUrl = ([latitude, longitude]: [number, number]) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`

function popupContent(location: MapLocation) {
  const content = document.createElement('div')
  const title = document.createElement('strong')
  const metadata = document.createElement('small')
  const note = document.createElement('p')
  const googleLink = document.createElement('a')

  content.style.display = 'grid'
  content.style.gap = '4px'
  title.textContent = location.name
  metadata.textContent = `${location.category} · ${location.day}`
  note.textContent = location.note
  googleLink.className = 'google-maps-link'
  googleLink.href = googleMapsUrl(location.coordinates)
  googleLink.target = '_blank'
  googleLink.rel = 'noopener noreferrer'
  googleLink.textContent = 'Open in Google Maps ↗'
  content.append(title, metadata, note, googleLink)

  return content
}

export function FullMap({ locations, onSelect, selectedId }: {
  locations: MapLocation[]
  onSelect: (location: MapLocation) => void
  selectedId?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const markerRefs = useRef(new Map<string, Marker>())
  const selectedIdRef = useRef(selectedId)
  const [ready, setReady] = useState(false)
  selectedIdRef.current = selectedId

  useEffect(() => {
    let active = true
    const markers = markerRefs.current
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
      markers.clear()
      setReady(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function update() {
      const L = await import('leaflet')
      if (!active || !ready || !mapRef.current || !layerRef.current) return
      layerRef.current.clearLayers()
      markerRefs.current.clear()
      locations.forEach((location) => {
        const markerDot = document.createElement('span')
        markerDot.style.background = colors[location.category]
        const marker = L.marker(location.coordinates, {
          alt: `${location.name} map marker`,
          icon: L.divIcon({ className: 'custom-map-marker', html: markerDot, iconSize: [24, 24], iconAnchor: [12, 12] }),
          keyboard: true,
          riseOnHover: true,
          title: location.name,
        })
        marker.bindPopup(popupContent(location))
        marker.on('click', () => onSelect(location))
        marker.addTo(layerRef.current!)
        marker.getElement()?.setAttribute('aria-label', `${location.name}, ${location.category}, ${location.day}`)
        marker.getElement()?.setAttribute('aria-pressed', String(location.id === selectedIdRef.current))
        markerRefs.current.set(location.id, marker)
      })
      if (locations.length) mapRef.current.fitBounds(L.latLngBounds(locations.map((location) => location.coordinates)), { padding: [38, 38], maxZoom: 10 })
      const selectedMarker = selectedIdRef.current ? markerRefs.current.get(selectedIdRef.current) : undefined
      if (selectedMarker) {
        mapRef.current.panTo(selectedMarker.getLatLng(), { animate: false })
        selectedMarker.openPopup()
      }
    }
    void update()
    return () => { active = false }
  }, [locations, onSelect, ready])

  useEffect(() => {
    if (!ready || !selectedId || !mapRef.current) return
    markerRefs.current.forEach((marker, id) => {
      marker.getElement()?.setAttribute('aria-pressed', String(id === selectedId))
    })
    const marker = markerRefs.current.get(selectedId)
    if (!marker) return
    mapRef.current.panTo(marker.getLatLng(), { animate: true })
    marker.openPopup()
  }, [ready, selectedId])

  return <div className="full-map" ref={containerRef} aria-label="Interactive trip map" />
}

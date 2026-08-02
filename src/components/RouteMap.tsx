import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { LayerGroup, Map as LeafletMap, Marker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  buildGoogleMapsSearchUrl,
  hasValidCoordinates,
  type RoutePoint,
} from '../lib/maps'

export type RouteMapProps = {
  points: readonly RoutePoint[]
  interactive?: boolean
  selectedPointId?: string | null
  onSelectPoint?: (point: RoutePoint) => void
  showRoute?: boolean
  className?: string
  ariaLabel?: string
  ariaHidden?: boolean
  style?: CSSProperties
}

const DEFAULT_CENTER: [number, number] = [51.1784, -115.5708]

function markerHtml(number: number, selected: boolean) {
  const background = selected ? '#0b4d9f' : '#1261c9'
  const scale = selected ? 'scale(1.12)' : 'scale(1)'
  return `<span aria-hidden="true" style="display:grid;place-items:center;width:28px;height:28px;border:3px solid white;border-radius:999px;background:${background};color:white;font:700 12px/1 system-ui,sans-serif;box-shadow:0 3px 9px rgb(15 35 55 / 35%);transform:${scale}">${number}</span>`
}

function popupContent(point: RoutePoint) {
  const container = document.createElement('div')
  container.className = 'route-map-popup'

  const name = document.createElement('strong')
  name.textContent = point.name
  container.append(name)

  if (point.day) {
    const day = document.createElement('small')
    day.textContent = point.day
    container.append(day)
  }

  if (point.note) {
    const note = document.createElement('p')
    note.textContent = point.note
    container.append(note)
  }

  const link = document.createElement('a')
  link.href = buildGoogleMapsSearchUrl(point)
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = 'Open stop in Google Maps ↗'
  container.append(link)

  return container
}

export function RouteMap({
  points,
  interactive = true,
  selectedPointId,
  onSelectPoint,
  showRoute = true,
  className = '',
  ariaLabel = 'Trip route map',
  ariaHidden = false,
  style,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const onSelectRef = useRef(onSelectPoint)
  const [ready, setReady] = useState(false)
  const mappablePoints = useMemo(
    () => points.flatMap((point, index) => (
      hasValidCoordinates(point) ? [{ point, order: index + 1 }] : []
    )),
    [points],
  )

  useEffect(() => {
    onSelectRef.current = onSelectPoint
  }, [onSelectPoint])

  useEffect(() => {
    let active = true
    let observer: ResizeObserver | null = null

    async function setup() {
      const L = await import('leaflet')
      const container = containerRef.current
      if (!active || !container || mapRef.current) return

      const map = L.map(container, {
        // Hidden preview maps render their attribution as an accessible sibling
        // in RoutePreviewMap. This prevents Leaflet from inserting focusable
        // links inside an aria-hidden subtree while preserving attribution on
        // every interactive explorer map.
        attributionControl: !ariaHidden,
        boxZoom: interactive,
        doubleClickZoom: interactive,
        dragging: interactive,
        keyboard: interactive,
        scrollWheelZoom: interactive,
        tapHold: interactive,
        touchZoom: interactive,
        zoomControl: interactive,
      }).setView(DEFAULT_CENTER, 8)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      observer = new ResizeObserver(() => map.invalidateSize({ animate: false, pan: false }))
      observer.observe(container)
      setReady(true)
      window.setTimeout(() => map.invalidateSize({ animate: false, pan: false }), 0)
    }

    void setup()
    return () => {
      active = false
      observer?.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
      setReady(false)
    }
  }, [ariaHidden, interactive])

  useEffect(() => {
    let active = true

    async function updateLayers() {
      const L = await import('leaflet')
      const map = mapRef.current
      const layer = layerRef.current
      if (!active || !ready || !map || !layer) return

      layer.clearLayers()
      const markers = new Map<string, Marker>()

      if (showRoute && mappablePoints.length > 1) {
        L.polyline(mappablePoints.map(({ point }) => point.coordinates), {
          color: '#1261c9',
          dashArray: '8 8',
          interactive: false,
          opacity: 0.82,
          weight: 4,
        }).addTo(layer)
      }

      mappablePoints.forEach(({ point, order }) => {
        const marker = L.marker(point.coordinates, {
          icon: L.divIcon({
            className: 'route-map-marker',
            html: markerHtml(order, point.id === selectedPointId),
            iconAnchor: [14, 14],
            iconSize: [28, 28],
            popupAnchor: [0, -15],
          }),
          interactive,
          keyboard: interactive,
          title: point.name,
        })

        if (interactive) {
          marker.bindPopup(popupContent(point))
          marker.on('click', () => onSelectRef.current?.(point))
        }
        marker.addTo(layer)
        markers.set(point.id, marker)
      })

      if (mappablePoints.length === 1) {
        map.setView(mappablePoints[0].point.coordinates, 12, { animate: false })
      } else if (mappablePoints.length > 1) {
        map.fitBounds(L.latLngBounds(mappablePoints.map(({ point }) => point.coordinates)), {
          animate: false,
          maxZoom: 12,
          padding: interactive ? [46, 46] : [24, 24],
        })
      } else {
        map.setView(DEFAULT_CENTER, 8, { animate: false })
      }

      // Open after fitting the route so Leaflet can pan the popup fully inside
      // the final map viewport, especially in the narrow mobile explorer.
      if (interactive && selectedPointId) markers.get(selectedPointId)?.openPopup()
    }

    void updateLayers()
    return () => { active = false }
  }, [interactive, mappablePoints, ready, selectedPointId, showRoute])

  return (
    <div
      ref={containerRef}
      className={`route-map ${className}`.trim()}
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden ? undefined : ariaLabel}
      style={{
        background: '#e9f1ef',
        height: '100%',
        minHeight: interactive ? 300 : 160,
        overflow: 'hidden',
        width: '100%',
        ...style,
      }}
    />
  )
}

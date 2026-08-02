import { useEffect, useRef, useState } from 'react'
import { MapPinned, Maximize2 } from 'lucide-react'
import { hasValidCoordinates, type RoutePoint } from '../lib/maps'
import { RouteMap } from './RouteMap'

export type RoutePreviewMapProps = {
  points: readonly RoutePoint[]
  onOpen: () => void
  label?: string
  className?: string
  height?: number | string
}

export function RoutePreviewMap({
  points,
  onOpen,
  label = 'View route',
  className = '',
  height = 180,
}: RoutePreviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapVisible, setMapVisible] = useState(false)
  const totalStopCount = points.length
  const renderedPinCount = points.filter(hasValidCoordinates).length
  const visibleCount = renderedPinCount === totalStopCount
    ? `${totalStopCount} ${totalStopCount === 1 ? 'stop' : 'stops'}`
    : `${totalStopCount} ${totalStopCount === 1 ? 'stop' : 'stops'} · ${renderedPinCount} ${renderedPinCount === 1 ? 'map pin' : 'map pins'}`
  const accessibleLabel = totalStopCount > 0
    ? `${label}: ${totalStopCount} total route ${totalStopCount === 1 ? 'stop' : 'stops'}; ${renderedPinCount} shown as map ${renderedPinCount === 1 ? 'pin' : 'pins'}`
    : `${label}: no route stops`

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapVisible || totalStopCount === 0) return
    if (typeof IntersectionObserver === 'undefined') {
      setMapVisible(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      setMapVisible(true)
      observer.disconnect()
    }, { rootMargin: '260px 0px' })
    observer.observe(container)
    return () => observer.disconnect()
  }, [mapVisible, totalStopCount])

  const placeholder = (
    <div className="route-preview-placeholder" aria-hidden="true">
      <MapPinned />
      <span>{totalStopCount > 0 ? 'Map preview loads as you scroll' : 'No mapped stops yet'}</span>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={`route-preview-map ${className}`.trim()}
      style={{
        background: '#e9f1ef',
        height,
        minHeight: 150,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      {mapVisible && totalStopCount > 0 ? <RouteMap points={points} interactive={false} ariaHidden /> : placeholder}
      <button
        type="button"
        aria-label={accessibleLabel}
        disabled={totalStopCount === 0}
        onClick={onOpen}
        style={{
          background: 'transparent',
          border: 0,
          cursor: totalStopCount > 0 ? 'pointer' : 'default',
          inset: '0 0 22px',
          outlineOffset: -3,
          padding: 0,
          position: 'absolute',
          width: '100%',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            alignItems: 'center',
            background: 'rgb(255 255 255 / 94%)',
            border: '1px solid #d6e0e9',
            borderRadius: 7,
            bottom: 9,
            boxShadow: '0 4px 14px rgb(16 24 40 / 14%)',
            color: '#1261c9',
            display: 'inline-flex',
            fontSize: 11,
            fontWeight: 750,
            gap: 6,
            left: 10,
            padding: '7px 9px',
            position: 'absolute',
          }}
        >
          <Maximize2 size={14} />
          {label}{totalStopCount > 0 ? ` · ${visibleCount}` : ''}
        </span>
      </button>
      <small
        className="route-preview-attribution"
        style={{
          bottom: 2,
          color: '#334155',
          fontSize: 8,
          lineHeight: '16px',
          padding: '0 4px',
          position: 'absolute',
          right: 2,
          zIndex: 2,
        }}
      >
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>OpenStreetMap contributors</a>
      </small>
    </div>
  )
}

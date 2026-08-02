import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, MapPinned, X } from 'lucide-react'
import {
  buildGoogleMapsDirectionsLinks,
  type GoogleMapsTravelMode,
  type RoutePoint,
} from '../lib/maps'
import { RouteMap } from './RouteMap'

export type RouteExplorerModalProps = {
  open: boolean
  title: string
  points: readonly RoutePoint[]
  onClose: () => void
  description?: string
  initialIncludedPointIds?: readonly string[]
  travelMode?: GoogleMapsTravelMode
  onIncludedPointIdsChange?: (pointIds: string[]) => void
}

const layerStyle: CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  inset: 0,
  justifyContent: 'center',
  padding: 16,
  position: 'fixed',
  zIndex: 1700,
}

const dialogStyle: CSSProperties = {
  background: '#fff',
  border: '1px solid rgb(255 255 255 / 70%)',
  borderRadius: 14,
  boxShadow: '0 30px 90px rgb(2 12 23 / 38%)',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100dvh - 32px)',
  overflow: 'hidden',
  position: 'relative',
  width: 'min(1080px, 100%)',
}

const linkStyle: CSSProperties = {
  alignItems: 'center',
  background: '#1261c9',
  borderRadius: 8,
  color: '#fff',
  display: 'inline-flex',
  fontSize: 11,
  fontWeight: 750,
  gap: 7,
  justifyContent: 'center',
  minHeight: 40,
  padding: '0 14px',
  textDecoration: 'none',
}

function initialSelection(points: readonly RoutePoint[], initialIds?: readonly string[]) {
  const availableIds = new Set(points.map((point) => point.id))
  if (initialIds === undefined) return availableIds
  return new Set(initialIds.filter((id) => availableIds.has(id)))
}

function OpenRouteExplorerModal({
  title,
  points,
  onClose,
  description,
  initialIncludedPointIds,
  travelMode = 'driving',
  onIncludedPointIdsChange,
}: Omit<RouteExplorerModalProps, 'open'>) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const mappablePoints = useMemo(() => points.filter((point) => point.name.trim() || point.mapsQuery?.trim()), [points])
  const [includedIds, setIncludedIds] = useState(() => initialSelection(points, initialIncludedPointIds))
  const [selectedPointId, setSelectedPointId] = useState<string | null>(() => {
    return mappablePoints.find((point) => initialSelection(points, initialIncludedPointIds).has(point.id))?.id
      ?? mappablePoints[0]?.id
      ?? null
  })
  const [mode, setMode] = useState<GoogleMapsTravelMode>(travelMode)
  const includedPoints = useMemo(
    () => mappablePoints.filter((point) => includedIds.has(point.id)),
    [includedIds, mappablePoints],
  )
  const googleLinks = useMemo(
    () => buildGoogleMapsDirectionsLinks(includedPoints, mode),
    [includedPoints, mode],
  )

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('hidden'))
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  const togglePoint = (pointId: string) => {
    const next = new Set(includedIds)
    if (next.has(pointId)) next.delete(pointId)
    else next.add(pointId)
    setIncludedIds(next)
    setSelectedPointId(pointId)
    onIncludedPointIdsChange?.(mappablePoints.filter((point) => next.has(point.id)).map((point) => point.id))
  }

  return (
    <div className="route-explorer-layer" style={layerStyle}>
      <button
        type="button"
        aria-hidden="true"
        onClick={onClose}
        tabIndex={-1}
        style={{ background: 'rgb(2 12 23 / 68%)', border: 0, inset: 0, position: 'absolute' }}
      />
      <section
        ref={dialogRef}
        className="route-explorer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={dialogStyle}
      >
        <header style={{ alignItems: 'flex-start', borderBottom: '1px solid #e5e9ef', display: 'flex', gap: 12, justifyContent: 'space-between', padding: '16px 18px' }}>
          <div style={{ display: 'flex', gap: 11, minWidth: 0 }}>
            <span aria-hidden="true" style={{ background: '#eaf3ff', borderRadius: 9, color: '#1261c9', display: 'grid', flex: '0 0 auto', height: 38, placeItems: 'center', width: 38 }}><MapPinned size={20} /></span>
            <div style={{ minWidth: 0 }}>
              <h2 id={titleId} style={{ fontSize: 19, letterSpacing: '-.02em', margin: 0 }}>{title}</h2>
              <p id={descriptionId} style={{ color: '#667085', fontSize: 10, lineHeight: 1.45, margin: '4px 0 0' }}>
                {description ?? `${includedPoints.length} of ${mappablePoints.length} stops included. Select the places you want, then open the route in Google Maps.`}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close route explorer"
            onClick={onClose}
            style={{ background: '#f2f4f7', border: 0, borderRadius: 7, color: '#526173', cursor: 'pointer', display: 'grid', flex: '0 0 auto', height: 44, placeItems: 'center', width: 44 }}
          >
            <X size={18} />
          </button>
        </header>

        <div className="route-explorer-body" style={{ display: 'flex', flex: '1 1 auto', flexWrap: 'wrap', minHeight: 0, overflow: 'auto' }}>
          <aside className="route-explorer-stops" style={{ borderRight: '1px solid #e5e9ef', flex: '1 1 250px', maxHeight: 'clamp(300px, 62vh, 600px)', minWidth: 0, overflowY: 'auto', padding: 14 }}>
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend style={{ color: '#475467', fontSize: 10, fontWeight: 800, marginBottom: 9, textTransform: 'uppercase' }}>Include in route</legend>
              <ol style={{ display: 'grid', gap: 6, listStyle: 'none', margin: 0, padding: 0 }}>
                {mappablePoints.map((point, index) => {
                  const included = includedIds.has(point.id)
                  const selected = selectedPointId === point.id
                  return (
                    <li key={point.id} style={{ background: selected ? '#eef6ff' : '#fff', border: `1px solid ${selected ? '#9bc2ef' : '#e1e7ee'}`, borderRadius: 8 }}>
                      <label style={{ alignItems: 'flex-start', cursor: 'pointer', display: 'grid', gap: 9, gridTemplateColumns: '18px 24px minmax(0, 1fr)', padding: 10 }}>
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => togglePoint(point.id)}
                          onFocus={() => setSelectedPointId(point.id)}
                          style={{ accentColor: '#1261c9', margin: '3px 0 0' }}
                        />
                        <span aria-hidden="true" style={{ background: included ? '#1261c9' : '#d8dee7', borderRadius: 999, color: '#fff', display: 'grid', fontSize: 10, fontWeight: 800, height: 24, placeItems: 'center', width: 24 }}>{index + 1}</span>
                        <span style={{ display: 'grid', gap: 3, minWidth: 0 }}>
                          <strong style={{ color: '#17212f', fontSize: 11 }}>{point.name}</strong>
                          {point.day ? <small style={{ color: '#1261c9', fontSize: 9 }}>{point.day}</small> : null}
                          {point.note ? <small style={{ color: '#667085', fontSize: 9, lineHeight: 1.35 }}>{point.note}</small> : null}
                          {!point.coordinates ? <small style={{ color: '#9a5b00', fontSize: 8 }}>Google Maps search stop · no in-app pin yet</small> : null}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ol>
            </fieldset>
          </aside>

          <div className="route-explorer-map" style={{ flex: '3 1 430px', minHeight: 'clamp(320px, 62vh, 600px)', position: 'relative' }}>
            <RouteMap
              points={includedPoints}
              selectedPointId={selectedPointId}
              onSelectPoint={(point) => setSelectedPointId(point.id)}
              ariaLabel={`${title} interactive route map`}
              style={{ minHeight: 'clamp(320px, 62vh, 600px)' }}
            />
            {includedPoints.length === 0 ? (
              <p role="status" style={{ background: 'rgb(255 255 255 / 94%)', border: '1px solid #dce3eb', borderRadius: 8, color: '#526173', left: '50%', margin: 0, padding: '10px 13px', position: 'absolute', textAlign: 'center', top: '50%', transform: 'translate(-50%, -50%)', width: 'min(280px, calc(100% - 32px))' }}>
                Select at least one stop to build the map.
              </p>
            ) : null}
          </div>
        </div>

        <footer style={{ alignItems: 'center', borderTop: '1px solid #e5e9ef', display: 'flex', flexWrap: 'wrap', gap: 9, justifyContent: 'space-between', padding: '12px 18px' }}>
          <label style={{ alignItems: 'center', color: '#526173', display: 'flex', fontSize: 10, fontWeight: 700, gap: 7 }}>
            Travel mode
            <select value={mode} onChange={(event) => setMode(event.target.value as GoogleMapsTravelMode)} style={{ border: '1px solid #cfd8e4', borderRadius: 6, color: '#344054', minHeight: 34, padding: '0 8px' }}>
              <option value="driving">Driving</option>
              <option value="walking">Walking</option>
              <option value="bicycling">Bicycling</option>
              <option value="transit">Transit</option>
            </select>
          </label>
          <span className="route-line-note">Dashed line shows stop order; Google Maps calculates the road or walking route.</span>
          <div className="route-google-links" style={{ display: 'flex', flex: '1 1 auto', flexWrap: 'wrap', gap: 7, justifyContent: 'flex-end' }}>
            {googleLinks.length > 0 ? googleLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {link.label}<ExternalLink size={14} />
              </a>
            )) : <span style={{ color: '#7a8798', fontSize: 10 }}>Choose a stop to open Google Maps.</span>}
          </div>
        </footer>
      </section>
    </div>
  )
}

export function RouteExplorerModal(props: RouteExplorerModalProps) {
  if (!props.open || typeof document === 'undefined') return null

  const pointKey = props.points.map((point) => point.id).join('|')
  return createPortal(
    <OpenRouteExplorerModal key={`${props.title}:${pointKey}`} {...props} />,
    document.body,
  )
}

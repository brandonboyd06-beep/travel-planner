import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { Check, ExternalLink, MapPin, X } from 'lucide-react'
import type { Lodging } from '../types'
import type { LodgingSegment } from '../lib/lodgingPlan'
import { estimateLodgingCost, lodgingTownForBase } from '../lib/lodgingPlan'
import { Button, StatusPill } from './ui'

interface LodgingCompareModalProps {
  items: Lodging[]
  segments: LodgingSegment[]
  focusedSegment: LodgingSegment | null
  selectedBySegment: Record<string, string>
  canEdit: boolean
  onChoose: (item: Lodging, segment: LodgingSegment) => void
  onClose: () => void
}

export function LodgingCompareModal({
  items,
  segments,
  focusedSegment,
  selectedBySegment,
  canEdit,
  onChoose,
  onClose,
}: LodgingCompareModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLElement>(null)
  const comparisonRows = useMemo(() => items.map((item) => {
    const matchingSegments = segments.filter((segment) => lodgingTownForBase(segment.baseName) === item.town)
    const segment = focusedSegment && lodgingTownForBase(focusedSegment.baseName) === item.town
      ? focusedSegment
      : matchingSegments[0] ?? null
    return { item, segment }
  }), [focusedSegment, items, segments])

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !modalRef.current) return
      const focusable = [...modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) return
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
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      window.setTimeout(() => previousFocus?.focus(), 0)
    }
  }, [onClose])

  return (
    <div className="lodging-compare-layer" role="dialog" aria-modal="true" aria-labelledby="lodging-compare-title">
      <button className="lodging-compare-scrim" type="button" onClick={onClose} aria-hidden="true" tabIndex={-1} />
      <section ref={modalRef} className="lodging-compare-modal">
        <header>
          <div>
            <span>Side-by-side stay check</span>
            <h2 id="lodging-compare-title">Compare {items.length} lodging options</h2>
            <p>Prices are planning estimates in USD. Open each official site to see real property photos, live rooms, taxes, and cancellation rules.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close lodging comparison"><X /></button>
        </header>
        <div className="lodging-compare-columns" style={{ '--lodging-columns': items.length } as CSSProperties}>
          {comparisonRows.map(({ item, segment }) => {
            const estimate = segment ? estimateLodgingCost(item, segment.nights) : null
            const isChosen = Boolean(segment && selectedBySegment[segment.id] === item.id)
            return (
              <article key={item.id}>
                <div className="lodging-compare-photo">
                  <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" />
                  <span>Illustrative preview</span>
                </div>
                <div className="lodging-compare-title">
                  <small>{item.town} · {item.type}</small>
                  <h3>{item.name}</h3>
                  <StatusPill tone={item.recommended ? 'green' : 'gray'}>{item.recommended ? 'Top pick' : `${item.score} score`}</StatusPill>
                </div>
                <dl>
                  <div><dt>Fits this stay</dt><dd>{segment ? `${segment.dateLabel} · ${segment.nights} ${segment.nights === 1 ? 'night' : 'nights'}` : 'Not on the current route'}</dd></div>
                  <div><dt>Working total</dt><dd>{estimate === null ? '—' : `$${estimate.toLocaleString()} USD`}</dd></div>
                  <div><dt>Price setup</dt><dd>${item.price}/night × {item.rateBasis === 'per-room-night' ? `${item.roomCount} rooms` : '1 whole unit'}{item.estimatedFixedFees ? ` + $${item.estimatedFixedFees} fee allowance` : ''}</dd></div>
                  <div><dt>Best for</dt><dd>{item.bestFor}</dd></div>
                  <div><dt>Location</dt><dd><MapPin />{item.walkability}</dd></div>
                  <div><dt>Parking</dt><dd>{item.parking}</dd></div>
                  <div><dt>Kitchen</dt><dd>{item.kitchen}</dd></div>
                  <div><dt>Amenities</dt><dd>{item.amenities}</dd></div>
                </dl>
                <div className="lodging-compare-notes">
                  <strong>Highlights</strong>
                  {item.highlights.map((highlight) => <span key={highlight}><Check />{highlight}</span>)}
                  <strong>Check first</strong>
                  {item.cons.map((con) => <span key={con}>— {con}</span>)}
                </div>
                <footer>
                  <a className="button secondary" href={item.url} target="_blank" rel="noopener noreferrer">Real photos & live price<ExternalLink /></a>
                  {segment ? <Button className={isChosen ? 'primary' : 'ghost'} disabled={!canEdit} onClick={() => onChoose(item, segment)}>{isChosen ? <><Check />Clear this choice</> : `Choose for ${segment.checkIn}`}</Button> : null}
                </footer>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

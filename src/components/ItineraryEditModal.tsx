import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, GripVertical, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useItinerary } from '../context/itinerary'
import { findTripPlace, tripPlaces } from '../data/tripPlaces'
import { START_OF_DAY } from '../lib/itineraryPlan'
import type { ItineraryStop, ItineraryStopKind, ItineraryStopPriority } from '../types'
import { Button } from './ui'

interface ItineraryEditModalProps {
  dayId: string | null
  initialName?: string
  onClose: () => void
}

const kinds: Array<{ value: ItineraryStopKind; label: string }> = [
  { value: 'activity', label: 'Activity' },
  { value: 'scenic', label: 'Scenic stop' },
  { value: 'meal', label: 'Food or drinks' },
  { value: 'travel', label: 'Transportation' },
  { value: 'lodging', label: 'Lodging' },
  { value: 'other', label: 'Other' },
]

export function ItineraryEditModal({ dayId, initialName = '', onClose }: ItineraryEditModalProps) {
  const { plan, canEdit, addStop, updateStop, moveStop, reorderStop, removeStop } = useItinerary()
  const initialDay = plan.days.find((day) => day.id === dayId) ?? plan.days[0]
  const [targetDayId, setTargetDayId] = useState(initialDay.id)
  const [name, setName] = useState(initialName)
  const [kind, setKind] = useState<ItineraryStopKind>('activity')
  const [priority, setPriority] = useState<ItineraryStopPriority>('core')
  const [note, setNote] = useState('')
  const [afterStopId, setAfterStopId] = useState('')
  const [editing, setEditing] = useState<{ dayId: string; stop: ItineraryStop } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const planRef = useRef(plan)

  const targetDay = plan.days.find((day) => day.id === targetDayId) ?? initialDay
  const matchedPlace = useMemo(() => findTripPlace(name), [name])

  useEffect(() => {
    planRef.current = plan
  }, [plan])

  useEffect(() => {
    if (!dayId) return
    const nextDay = planRef.current.days.find((day) => day.id === dayId) ?? planRef.current.days[0]
    setTargetDayId(nextDay.id)
    setName(initialName)
    setKind('activity')
    setPriority('core')
    setNote('')
    setAfterStopId(nextDay.stops.at(-1)?.id ?? '')
    setEditing(null)
    setError('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [dayId, initialName])

  useEffect(() => {
    if (!dayId) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [dayId, onClose])

  if (!dayId) return null

  const resetForm = () => {
    setName('')
    setKind('activity')
    setPriority('core')
    setNote('')
    setEditing(null)
    setError('')
    inputRef.current?.focus()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!canEdit) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Add the place or activity name first.')
      return
    }

    try {
      if (editing) {
        updateStop(editing.dayId, editing.stop.id, {
          name: trimmed,
          kind,
          priority,
          mapsQuery: matchedPlace?.mapsQuery ?? editing.stop.mapsQuery,
          coordinates: matchedPlace?.coordinates ?? editing.stop.coordinates ?? null,
          note: note.trim() || undefined,
        })
      } else {
        const addedStopId = addStop(targetDay.id, {
          name: matchedPlace?.name ?? trimmed,
          kind,
          priority,
          mapsQuery: matchedPlace?.mapsQuery ?? trimmed,
          coordinates: matchedPlace?.coordinates,
          note: note.trim() || matchedPlace?.note,
        }, afterStopId || undefined)
        setAfterStopId(addedStopId)
      }
      resetForm()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That itinerary change could not be saved.')
    }
  }

  const startEditing = (editDayId: string, stop: ItineraryStop) => {
    setEditing({ dayId: editDayId, stop })
    setName(stop.name)
    setKind(stop.kind)
    setPriority(stop.priority)
    setNote(stop.note ?? '')
    setError('')
    inputRef.current?.focus()
  }

  return (
    <div className="itinerary-modal-layer" role="dialog" aria-modal="true" aria-labelledby="itinerary-editor-title">
      <button className="itinerary-modal-scrim" type="button" onClick={onClose} aria-label="Close itinerary editor" />
      <section ref={dialogRef} className="itinerary-editor-modal">
        <header>
          <div><span>Easy itinerary editor</span><h2 id="itinerary-editor-title">Change the trip</h2><p>Add a stop, reorder a day, or move something without rebuilding the whole plan.</p></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close itinerary editor"><X /></button>
        </header>

        <form className="itinerary-add-form" onSubmit={submit}>
          <div className="itinerary-form-heading"><Plus /><div><strong>{editing ? `Edit ${editing.stop.name}` : 'Add a stop'}</strong><span>Common Banff-area places are pinned automatically.</span></div></div>
          <label className="field wide"><span>Place or activity</span><input ref={inputRef} list="trip-place-options" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Plain of Six Glaciers Tea House" maxLength={120} /><datalist id="trip-place-options">{tripPlaces.map((place) => <option value={place.name} key={place.id} />)}</datalist></label>
          {!editing ? <label className="field"><span>Day</span><select value={targetDayId} onChange={(event) => { setTargetDayId(event.target.value); const day = plan.days.find((item) => item.id === event.target.value); setAfterStopId(day?.stops.at(-1)?.id ?? '') }}>{plan.days.map((day) => <option value={day.id} key={day.id}>{day.day}, Oct {day.date} · {day.title}</option>)}</select></label> : null}
          {!editing ? <label className="field"><span>Place after</span><select value={afterStopId} onChange={(event) => setAfterStopId(event.target.value)}><option value={START_OF_DAY}>At the start</option>{targetDay.stops.map((stop) => <option value={stop.id} key={stop.id}>{stop.name}</option>)}</select></label> : null}
          <label className="field"><span>Type</span><select value={kind} onChange={(event) => setKind(event.target.value as ItineraryStopKind)}>{kinds.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
          <label className="field"><span>Plan status</span><select value={priority} disabled={editing?.stop.priority === 'fixed' && editing.stop.source !== 'miller'} onChange={(event) => setPriority(event.target.value as ItineraryStopPriority)}><option value="core">Core plan</option><option value="optional">Optional</option>{editing?.stop.priority === 'fixed' ? <option value="fixed">Fixed</option> : null}</select></label>
          <label className="field wide"><span>Helpful note <small>optional</small></span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Timing, reservation, weather, or group note" maxLength={300} /></label>
          <div className={`place-match ${matchedPlace ? 'matched' : ''}`}><MapPin />{matchedPlace ? <span><strong>Map pin found:</strong> {matchedPlace.name}</span> : <span>Custom stops still open by name in Google Maps. Let Miller Time place it if you want a precise in-app pin.</span>}</div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="itinerary-form-actions">{editing ? <Button type="button" className="ghost" onClick={resetForm}>Cancel edit</Button> : null}<Button type="submit" className="primary" disabled={!canEdit}>{editing ? 'Save stop' : 'Add to itinerary'}</Button></div>
        </form>

        <div className="day-editor-list">
          <div className="day-editor-list-heading"><div><strong>{initialDay.day}, October {initialDay.date}</strong><span>{initialDay.title}</span></div><b>{initialDay.stops.length} stops</b></div>
          {initialDay.stops.map((stop, index) => (
            <article className="day-editor-stop" key={stop.id}>
              <GripVertical aria-hidden="true" />
              <span className="stop-order">{index + 1}</span>
              <div><strong>{stop.name}</strong><small>{stop.priority === 'fixed' ? 'Fixed logistics' : stop.priority === 'optional' ? 'Optional' : 'Core plan'}{stop.coordinates ? ' · Map ready' : ' · Google search'}</small></div>
              <label><span className="sr-only">Move {stop.name} to another day</span><select value={initialDay.id} onChange={(event) => moveStop(initialDay.id, event.target.value, stop.id)} disabled={!canEdit || (stop.priority === 'fixed' && stop.source !== 'miller')}>{plan.days.map((day) => <option value={day.id} key={day.id}>{day.day} {day.date}</option>)}</select></label>
              <div className="stop-row-actions">
                <button type="button" onClick={() => reorderStop(initialDay.id, stop.id, -1)} disabled={!canEdit || (stop.priority === 'fixed' && stop.source !== 'miller') || index === 0} aria-label={`Move ${stop.name} earlier`}><ArrowUp /></button>
                <button type="button" onClick={() => reorderStop(initialDay.id, stop.id, 1)} disabled={!canEdit || (stop.priority === 'fixed' && stop.source !== 'miller') || index === initialDay.stops.length - 1} aria-label={`Move ${stop.name} later`}><ArrowDown /></button>
                <button type="button" onClick={() => startEditing(initialDay.id, stop)} disabled={!canEdit} aria-label={`Edit ${stop.name}`}><Pencil /></button>
                <button type="button" onClick={() => { if (window.confirm(`Remove ${stop.name} from the itinerary?`)) removeStop(initialDay.id, stop.id) }} disabled={!canEdit || (stop.priority === 'fixed' && stop.source !== 'miller')} aria-label={`Remove ${stop.name}`}><Trash2 /></button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

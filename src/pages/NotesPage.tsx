import { Backpack, CheckCircle2, ClipboardList, RotateCcw, Save, ShieldAlert } from 'lucide-react'
import { PageHeader } from '../components/AppShell'
import { AppLink } from '../components/AppLink'
import { Button, StatusPill } from '../components/ui'
import { useCollaboration } from '../context/collaboration'
import { useItinerary } from '../context/itinerary'
import { bookingItems } from '../data/bookings'
import { packingGroups, reservations, safetyNotes } from '../data/packing'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { isShuttleBooking, reconcileBookingItems } from '../lib/bookingPlan'
import type { Status } from '../types'

const statuses: Status[] = ['Not started', 'Researching', 'Ready to book', 'Booked']
const bookingManagedNames = new Set(['Roam / Parks Canada lake shuttle', 'Banff Gondola', 'Sky Bistro', 'Columbia Icefield', 'Lake Minnewanka Cruise'])
const otherReservations = reservations.filter((item) => !bookingManagedNames.has(item))

export function NotesPage() {
  const { user, trip } = useCollaboration()
  const canEdit = trip?.role !== 'viewer'
  const { plan } = useItinerary()
  const [checked, setChecked] = useLocalStorage<string[]>('packing', [])
  const [notes, setNotes] = useLocalStorage('personal-notes', '')
  const [bookingProgress] = useLocalStorage<string[]>('booking-progress', [])
  const [reservationState, setReservationState] = useLocalStorage<Record<string, Status>>('reservations', Object.fromEntries(reservations.map((item) => [item, 'Not started'])) as Record<string, Status>)
  const totalPacking = Object.values(packingGroups).flat().length
  const reconciledBookings = reconcileBookingItems(plan, bookingItems)
  const shuttleBookings = reconciledBookings.filter(isShuttleBooking)
  const shuttleBooked = shuttleBookings.some((item) => bookingProgress.includes(item.id))
  const bookingSummary = [
    ...(shuttleBookings.some((item) => item.inCurrentPlan) || shuttleBooked ? [{
      label: 'Lake shuttle',
      booked: shuttleBooked,
      inCurrentPlan: shuttleBookings.some((item) => item.inCurrentPlan),
    }] : []),
    ...reconciledBookings.filter((item) => !isShuttleBooking(item) && (item.inCurrentPlan || bookingProgress.includes(item.id))).map((item) => ({
      label: item.title,
      booked: bookingProgress.includes(item.id),
      inCurrentPlan: item.inCurrentPlan,
    })),
  ]
  const resetLocalChoices = () => {
    if (!canEdit) return
    if (!window.confirm('Reset the packing list, personal notes, and the extra reservation tracker? Booking-center progress will stay intact.')) return
    setChecked([])
    setNotes('')
    setReservationState(Object.fromEntries(reservations.map((item) => [item, 'Not started'])) as Record<string, Status>)
  }
  const storageLabel = trip?.role === 'viewer' ? 'View-only shared trip' : user && trip ? 'Shared with trip members' : 'Saved only on this device'
  return (
    <>
      <PageHeader title="Notes & lists" subtitle={`Packing, safety, reservations, and notes · ${storageLabel}`} actions={<Button className="secondary" disabled={!canEdit} onClick={resetLocalChoices}><RotateCcw size={15} />Reset choices</Button>} />
      <div className="notes-layout"><div className="notes-primary"><section className="panel packing-panel"><div className="checklist-title"><div><Backpack /><div><h2>Packing checklist</h2><p>October layers and trail essentials</p></div></div><StatusPill tone="blue">{checked.length} / {totalPacking} packed</StatusPill></div><div className="packing-groups">{Object.entries(packingGroups).map(([group, items]) => <div key={group}><h3>{group}</h3>{items.map((item) => <label key={item} className={checked.includes(item) ? 'checked' : ''}><input type="checkbox" checked={checked.includes(item)} disabled={!canEdit} onChange={() => setChecked((current) => current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item])} /><span>{item}</span></label>)}</div>)}</div><p className="power-note">Canadian power outlets and voltage are the same standard used in the US.</p></section><section className="panel notes-editor"><div className="section-title-inline"><ClipboardList /><div><h2>Personal trip notes</h2><p>{storageLabel}</p></div></div><label className="sr-only" htmlFor="personal-trip-notes">Personal trip notes</label><textarea id="personal-trip-notes" value={notes} disabled={!canEdit} onChange={(event) => setNotes(event.target.value)} placeholder="Add confirmation numbers, room preferences, meal ideas, or questions for the group…" /><span><Save size={13} />{canEdit ? 'Changes save automatically' : 'An owner or editor can change these notes'}</span></section></div><aside className="notes-rail"><section className="panel safety-panel"><div className="section-title-inline"><ShieldAlert /><div><h2>Safety essentials</h2><p>Review before trail days</p></div></div>{safetyNotes.map((note) => <p key={note}><CheckCircle2 />{note}</p>)}</section><section className="panel reservations-panel"><h2>Booking-center status</h2>{bookingSummary.map((item) => { const needsReview = item.booked && !item.inCurrentPlan; return <div className="reservation-summary-row" key={item.label}><span>{item.label}</span><StatusPill tone={needsReview ? 'amber' : item.booked ? 'green' : 'gray'}>{needsReview ? 'Review' : item.booked ? 'Booked' : 'Not booked'}</StatusPill></div> })}<AppLink className="text-link" href="/book">Open Book & Reserve</AppLink></section><section className="panel reservations-panel"><h2>Other trip jobs</h2>{otherReservations.map((item) => <label key={item}><span>{item}</span><select value={reservationState[item] ?? 'Not started'} disabled={!canEdit} onChange={(event) => setReservationState((current) => ({ ...current, [item]: event.target.value as Status }))}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>)}</section></aside></div>
    </>
  )
}

import { Backpack, CheckCircle2, ClipboardList, RotateCcw, Save, ShieldAlert } from 'lucide-react'
import { PageHeader } from '../components/AppShell'
import { Button, StatusPill } from '../components/ui'
import { packingGroups, reservations, safetyNotes } from '../data/packing'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { Status } from '../types'

const statuses: Status[] = ['Not started', 'Researching', 'Ready to book', 'Booked']

export function NotesPage() {
  const [checked, setChecked] = useLocalStorage<string[]>('packing', [])
  const [notes, setNotes] = useLocalStorage('personal-notes', '')
  const [reservationState, setReservationState] = useLocalStorage<Record<string, Status>>('reservations', Object.fromEntries(reservations.map((item) => [item, 'Not started'])) as Record<string, Status>)
  const totalPacking = Object.values(packingGroups).flat().length
  const resetLocalChoices = () => {
    setChecked([])
    setNotes('')
    setReservationState(Object.fromEntries(reservations.map((item) => [item, 'Not started'])) as Record<string, Status>)
  }
  return (
    <>
      <PageHeader title="Notes & lists" subtitle="Packing, safety, reservations, and browser-local notes" actions={<Button className="secondary" onClick={resetLocalChoices}><RotateCcw size={15} />Reset local choices</Button>} />
      <div className="notes-layout"><div className="notes-primary"><section className="panel packing-panel"><div className="checklist-title"><div><Backpack /><div><h2>Packing checklist</h2><p>October layers and trail essentials</p></div></div><StatusPill tone="blue">{checked.length} / {totalPacking} packed</StatusPill></div><div className="packing-groups">{Object.entries(packingGroups).map(([group, items]) => <div key={group}><h3>{group}</h3>{items.map((item) => <label key={item} className={checked.includes(item) ? 'checked' : ''}><input type="checkbox" checked={checked.includes(item)} onChange={() => setChecked((current) => current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item])} /><span>{item}</span></label>)}</div>)}</div><p className="power-note">Canadian power outlets and voltage are the same standard used in the US.</p></section><section className="panel notes-editor"><div className="section-title-inline"><ClipboardList /><div><h2>Personal trip notes</h2><p>Saved only in this browser</p></div></div><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add confirmation numbers, room preferences, meal ideas, or questions for the group…" /><span><Save size={13} />Changes save automatically</span></section></div><aside className="notes-rail"><section className="panel safety-panel"><div className="section-title-inline"><ShieldAlert /><div><h2>Safety essentials</h2><p>Review before trail days</p></div></div>{safetyNotes.map((note) => <p key={note}><CheckCircle2 />{note}</p>)}</section><section className="panel reservations-panel"><h2>Reservation tracker</h2>{reservations.map((item) => <label key={item}><span>{item}</span><select value={reservationState[item] ?? 'Not started'} onChange={(event) => setReservationState((current) => ({ ...current, [item]: event.target.value as Status }))}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>)}</section></aside></div>
    </>
  )
}

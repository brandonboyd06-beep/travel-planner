import { useCallback, useMemo, useState } from 'react'
import { CalendarDays, Download, ListFilter, MapPinned, Pencil, Plus, Printer } from 'lucide-react'
import { PageHeader } from '../components/AppShell'
import { ItineraryDayCard } from '../components/ItineraryDayCard'
import { ItineraryEditModal } from '../components/ItineraryEditModal'
import { ItineraryQuickAdd } from '../components/ItineraryQuickAdd'
import { RouteExplorerModal } from '../components/RouteExplorerModal'
import { AlertBanner, Button, StatusPill } from '../components/ui'
import { useItinerary } from '../context/itinerary'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { itineraryAsText, routePointsForDay, routePointsForPlan } from '../lib/itineraryPlan'
import { trip } from '../data/trip'

type ItineraryView = 'cards' | 'list'

export function ItineraryPage() {
  const { plan, canEdit } = useItinerary()
  const [optionalDays, setOptionalDays] = useLocalStorage<number[]>('optional-days', [7])
  const [view, setView] = useState<ItineraryView>('cards')
  const [routeId, setRouteId] = useState<string | 'all' | null>(null)
  const [editorDayId, setEditorDayId] = useState<string | null>(null)
  const [editorDraft, setEditorDraft] = useState('')
  const routeDay = plan.days.find((day) => day.id === routeId)
  const routePoints = useMemo(() => routeId === 'all' ? routePointsForPlan(plan) : routeDay ? routePointsForDay(routeDay) : [], [plan, routeDay, routeId])

  const openEditor = (dayId: string, draft = '') => {
    setEditorDraft(draft)
    setEditorDayId(dayId)
  }

  const closeEditor = useCallback(() => {
    setEditorDayId(null)
    setEditorDraft('')
  }, [])

  const download = () => {
    const blob = new Blob([itineraryAsText(plan)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'banff-2026-itinerary.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        title="Day-by-day itinerary"
        subtitle={`${trip.dates} · 7 nights · Banff and Canmore · ${plan.revision ? `Revision ${plan.revision}` : 'Ready to personalize'}`}
        actions={<><Button className="secondary" onClick={() => window.print()}><Printer />Print</Button><Button className="primary" onClick={download}><Download />Download</Button></>}
      />

      <ItineraryQuickAdd onManual={(name) => openEditor(plan.days[1]?.id ?? plan.days[0].id, name)} />

      <div className="itinerary-toolbar">
        <div><StatusPill tone="green">Core plan</StatusPill><StatusPill tone="amber">Weather-flexible</StatusPill></div>
        <div className="itinerary-toolbar-actions">
          <Button className="secondary compact-action" type="button" onClick={() => setRouteId('all')}><MapPinned />Map every stop</Button>
          <Button className="secondary compact-action" type="button" disabled={!canEdit} onClick={() => openEditor(plan.days[0].id)}><Pencil />Edit itinerary</Button>
          <div className="view-switch" aria-label="Itinerary view">
            <button className={`segmented ${view === 'cards' ? 'active' : ''}`} type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')}><CalendarDays />Day cards</button>
            <button className={`segmented ${view === 'list' ? 'active' : ''}`} type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><ListFilter />Quick list</button>
          </div>
        </div>
      </div>

      <AlertBanner tone="info"><strong>October-first planning:</strong><span> Lake Louise and Moraine Lake are early for retry flexibility. Use October 6 only if the Icefields Parkway road-weather window is good.</span></AlertBanner>

      {view === 'cards' ? (
        <section className="itinerary-list" aria-label="Eight-day itinerary">
          {plan.days.map((day) => <ItineraryDayCard key={day.id} item={day} optionalOn={optionalDays.includes(day.date)} onToggle={() => setOptionalDays((current) => current.includes(day.date) ? current.filter((date) => date !== day.date) : [...current, day.date])} onOpenRoute={() => setRouteId(day.id)} onAddStop={() => openEditor(day.id)} onEditDay={() => openEditor(day.id)} canEdit={canEdit} />)}
        </section>
      ) : (
        <section className="itinerary-quick-list" aria-label="Quick itinerary list">
          {plan.days.map((day) => <article id={`itinerary-list-${day.id}`} key={day.id}><div className="quick-list-date"><strong>{day.day}</strong><span>Oct {day.date}</span></div><div><h2>{day.title}</h2><ol>{day.stops.map((stop) => <li key={stop.id} className={stop.priority === 'optional' ? 'optional' : ''}>{stop.name}</li>)}</ol></div><div className="quick-list-actions"><button type="button" onClick={() => setRouteId(day.id)}><MapPinned />Map</button><button type="button" onClick={() => openEditor(day.id)} disabled={!canEdit}><Plus />Change</button></div></article>)}
        </section>
      )}

      <RouteExplorerModal
        open={Boolean(routeId)}
        title={routeId === 'all' ? 'The complete Banff trip map' : `${routeDay?.day ?? ''}, October ${routeDay?.date ?? ''} route`}
        description={routeId === 'all' ? 'Every unique itinerary stop is included. Choose the ones you want; Google Maps links are divided into manageable route parts.' : 'Choose any or all stops. The in-app line shows order; Google Maps calculates the navigable route.'}
        points={routePoints}
        onClose={() => setRouteId(null)}
      />
      <ItineraryEditModal dayId={editorDayId} initialName={editorDraft} onClose={closeEditor} />
    </>
  )
}

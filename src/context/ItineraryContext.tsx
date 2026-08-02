import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { defaultItineraryPlan } from '../data/itinerary'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { applyItineraryOperations, applyProposal, getInitialItineraryPlan, isItineraryPlan } from '../lib/itineraryPlan'
import type { ItineraryPlan, ItineraryProposal, ItineraryStop, ItineraryStopPatch } from '../types'
import { useCollaboration } from './collaboration'
import { ItineraryContext, type ItineraryContextValue } from './itinerary'

export function ItineraryProvider({ children }: { children: ReactNode }) {
  const { trip } = useCollaboration()
  const [storedPlan, setStoredPlan] = useLocalStorage<unknown>('itinerary-plan-v1', defaultItineraryPlan)
  const plan = useMemo(() => getInitialItineraryPlan(storedPlan), [storedPlan])
  const undoRef = useRef<{ previous: ItineraryPlan; appliedUpdatedAt: string } | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [lastChange, setLastChange] = useState('')
  const canEdit = trip?.role !== 'viewer'

  useEffect(() => {
    if (!isItineraryPlan(storedPlan)) setStoredPlan(plan)
  }, [plan, setStoredPlan, storedPlan])

  useEffect(() => {
    const undo = undoRef.current
    if (!undo || undo.appliedUpdatedAt === plan.updatedAt) return
    undoRef.current = null
    setCanUndo(false)
    setLastChange('')
  }, [plan.updatedAt])

  const commit = useCallback((next: ItineraryPlan, message: string) => {
    if (!canEdit) throw new Error('Viewers can explore the trip but cannot change the shared itinerary.')
    undoRef.current = { previous: plan, appliedUpdatedAt: next.updatedAt }
    setCanUndo(true)
    setStoredPlan(next)
    setLastChange(message)
  }, [canEdit, plan, setStoredPlan])

  const addStop = useCallback((dayId: string, stop: Omit<ItineraryStop, 'id' | 'source'>, afterStopId?: string) => {
    const existingIds = new Set(plan.days.find((day) => day.id === dayId)?.stops.map((item) => item.id) ?? [])
    const next = applyItineraryOperations(plan, [{ type: 'add_stop', dayId, afterStopId, stop }], 'manual')
    commit(next, `${stop.name} was added to the itinerary.`)
    const addedStop = next.days.find((day) => day.id === dayId)?.stops.find((item) => !existingIds.has(item.id))
    if (!addedStop) throw new Error('The stop was saved, but its new position could not be found.')
    return addedStop.id
  }, [commit, plan])

  const updateStop = useCallback((dayId: string, stopId: string, patch: ItineraryStopPatch) => {
    const stop = plan.days.find((day) => day.id === dayId)?.stops.find((item) => item.id === stopId)
    if (stop?.priority === 'fixed') throw new Error('Fixed travel and lodging anchors must be changed with Miller Time so the whole day stays consistent.')
    const next = applyItineraryOperations(plan, [{ type: 'update_stop', dayId, stopId, patch }], 'manual')
    commit(next, 'The itinerary stop was updated.')
  }, [commit, plan])

  const moveStop = useCallback((fromDayId: string, toDayId: string, stopId: string, afterStopId?: string) => {
    const stop = plan.days.find((day) => day.id === fromDayId)?.stops.find((item) => item.id === stopId)
    if (stop?.priority === 'fixed') throw new Error('Fixed travel and lodging anchors must be changed with Miller Time so the whole day stays consistent.')
    const next = applyItineraryOperations(plan, [{ type: 'move_stop', fromDayId, toDayId, stopId, afterStopId }], 'manual')
    commit(next, 'The itinerary stop was moved.')
  }, [commit, plan])

  const reorderStop = useCallback((dayId: string, stopId: string, direction: -1 | 1) => {
    const day = plan.days.find((item) => item.id === dayId)
    const index = day?.stops.findIndex((stop) => stop.id === stopId) ?? -1
    if (!day || index < 0) return
    if (day.stops[index].priority === 'fixed') return
    if ((direction < 0 && index === 0) || (direction > 0 && index === day.stops.length - 1)) return
    const stops = [...day.stops]
    const destination = index + direction
    const [stop] = stops.splice(index, 1)
    stops.splice(destination, 0, { ...stop, source: stop.priority === 'fixed' && stop.source === 'miller' ? 'miller' : 'manual' })
    const next: ItineraryPlan = {
      ...plan,
      revision: plan.revision + 1,
      updatedAt: new Date().toISOString(),
      days: plan.days.map((item) => item.id === dayId ? { ...item, stops } : item),
    }
    commit(next, `${stop.name} was moved ${direction < 0 ? 'earlier' : 'later'} in the day.`)
  }, [commit, plan])

  const removeStop = useCallback((dayId: string, stopId: string) => {
    const day = plan.days.find((item) => item.id === dayId)
    const stop = day?.stops.find((item) => item.id === stopId)
    if (stop?.priority === 'fixed') throw new Error('Fixed travel and lodging anchors must be changed with Miller Time so the whole day stays consistent.')
    const next = applyItineraryOperations(plan, [{ type: 'remove_stop', dayId, stopId }], 'manual')
    commit(next, `${stop?.name ?? 'The stop'} was removed.`)
  }, [commit, plan])

  const applyAiProposal = useCallback((proposal: ItineraryProposal) => {
    if (!canEdit) throw new Error('Viewers can explore the trip but cannot change the shared itinerary.')
    setStoredPlan((currentValue: unknown) => {
      const currentPlan = getInitialItineraryPlan(currentValue)
      const next = applyProposal(currentPlan, proposal)
      undoRef.current = { previous: currentPlan, appliedUpdatedAt: next.updatedAt }
      setCanUndo(true)
      setLastChange(proposal.summary)
      return next
    })
  }, [canEdit, setStoredPlan])

  const undo = useCallback(() => {
    const undoState = undoRef.current
    if (!undoState || undoState.appliedUpdatedAt !== plan.updatedAt || !canEdit) return
    const restored: ItineraryPlan = {
      ...undoState.previous,
      revision: plan.revision + 1,
      updatedAt: new Date().toISOString(),
    }
    undoRef.current = null
    setCanUndo(false)
    setStoredPlan(restored)
    setLastChange('Last itinerary change undone.')
  }, [canEdit, plan.revision, plan.updatedAt, setStoredPlan])

  const clearLastChange = useCallback(() => {
    undoRef.current = null
    setCanUndo(false)
    setLastChange('')
  }, [])

  const value = useMemo<ItineraryContextValue>(() => ({
    plan,
    canEdit,
    canUndo,
    lastChange,
    addStop,
    updateStop,
    moveStop,
    reorderStop,
    removeStop,
    applyAiProposal,
    undo,
    clearLastChange,
  }), [addStop, applyAiProposal, canEdit, canUndo, clearLastChange, lastChange, moveStop, plan, removeStop, reorderStop, undo, updateStop])

  return <ItineraryContext.Provider value={value}>{children}</ItineraryContext.Provider>
}

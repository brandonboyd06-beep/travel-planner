import { createContext, useContext } from 'react'
import type { ItineraryPlan, ItineraryProposal, ItineraryStop, ItineraryStopPatch } from '../types'

export interface ItineraryContextValue {
  plan: ItineraryPlan
  canEdit: boolean
  canUndo: boolean
  lastChange: string
  addStop: (dayId: string, stop: Omit<ItineraryStop, 'id' | 'source'>, afterStopId?: string) => string
  updateStop: (dayId: string, stopId: string, patch: ItineraryStopPatch) => void
  moveStop: (fromDayId: string, toDayId: string, stopId: string, afterStopId?: string) => void
  reorderStop: (dayId: string, stopId: string, direction: -1 | 1) => void
  removeStop: (dayId: string, stopId: string) => void
  applyAiProposal: (proposal: ItineraryProposal) => void
  undo: () => void
  clearLastChange: () => void
}

export const ItineraryContext = createContext<ItineraryContextValue | null>(null)

export function useItinerary() {
  const value = useContext(ItineraryContext)
  if (!value) throw new Error('useItinerary must be used within ItineraryProvider.')
  return value
}

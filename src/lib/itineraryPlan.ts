import { defaultItineraryPlan } from '../data/itinerary'
import type {
  ItineraryOperation,
  ItineraryPlan,
  ItineraryProposal,
  ItineraryStop,
  ItineraryStopKind,
  ItineraryStopPriority,
} from '../types'
import type { RoutePoint } from './maps'

const stopKinds = new Set<ItineraryStopKind>(['travel', 'activity', 'scenic', 'meal', 'lodging', 'other'])
const priorities = new Set<ItineraryStopPriority>(['fixed', 'core', 'optional'])
export const START_OF_DAY = '__start__'

function isCoordinates(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
    && value[0] >= 49 && value[0] <= 54
    && value[1] >= -119 && value[1] <= -113
}

function safeUrl(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined
  } catch {
    return undefined
  }
}

function isStop(value: unknown): value is ItineraryStop {
  if (!value || typeof value !== 'object') return false
  const stop = value as Partial<ItineraryStop>
  return typeof stop.id === 'string'
    && typeof stop.name === 'string'
    && typeof stop.mapsQuery === 'string'
    && stopKinds.has(stop.kind as ItineraryStopKind)
    && priorities.has(stop.priority as ItineraryStopPriority)
    && (stop.coordinates === undefined || isCoordinates(stop.coordinates))
    && (stop.source === 'seed' || stop.source === 'manual' || stop.source === 'miller')
}

export function isItineraryPlan(value: unknown): value is ItineraryPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<ItineraryPlan>
  return plan.schemaVersion === 1
    && typeof plan.revision === 'number'
    && Array.isArray(plan.days)
    && plan.days.length === 8
    && plan.days.every((day) => Boolean(
      day && typeof day.id === 'string' && typeof day.title === 'string'
      && Array.isArray(day.stops) && day.stops.every(isStop),
    ))
    && Array.isArray(plan.appliedProposalIds)
}

export function getInitialItineraryPlan(value: unknown) {
  return isItineraryPlan(value) ? value : structuredClone(defaultItineraryPlan)
}

function newStopId(name: string) {
  const slug = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 36) || 'stop'
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${slug}-${suffix}`
}

function sanitizeStop(stop: Omit<ItineraryStop, 'id' | 'source'>, source: ItineraryStop['source']): ItineraryStop {
  const name = String(stop.name || '').trim().slice(0, 120)
  if (!name) throw new Error('Every itinerary stop needs a name.')
  const mapsQuery = String(stop.mapsQuery || name).trim().slice(0, 180)
  const kind = stopKinds.has(stop.kind) ? stop.kind : 'other'
  const priority = priorities.has(stop.priority) ? stop.priority : 'core'
  return {
    id: newStopId(name),
    name,
    kind,
    priority,
    mapsQuery,
    coordinates: isCoordinates(stop.coordinates) ? stop.coordinates : undefined,
    note: typeof stop.note === 'string' ? stop.note.trim().slice(0, 300) || undefined : undefined,
    source,
    sourceUrl: safeUrl(stop.sourceUrl),
  }
}

function insertionIndex(stops: ItineraryStop[], afterStopId?: string) {
  if (afterStopId === START_OF_DAY) return 0
  if (!afterStopId) return stops.length
  const index = stops.findIndex((stop) => stop.id === afterStopId)
  return index < 0 ? stops.length : index + 1
}

export function applyItineraryOperations(
  current: ItineraryPlan,
  operations: ItineraryOperation[],
  source: 'manual' | 'miller',
  proposalId?: string,
) {
  if (operations.length === 0 || operations.length > 4) throw new Error('That change is too broad. Try one or two itinerary edits at a time.')
  const days = current.days.map((day) => ({ ...day, stops: [...day.stops] }))

  for (const operation of operations) {
    if (operation.type === 'add_stop') {
      const day = days.find((item) => item.id === operation.dayId)
      if (!day) throw new Error('Miller Time picked a day that is no longer in the itinerary.')
      const duplicate = days.some((item) => item.stops.some((stop) => stop.name.toLocaleLowerCase() === operation.stop.name.trim().toLocaleLowerCase()))
      if (duplicate) throw new Error(`${operation.stop.name} is already on the itinerary.`)
      const stop = sanitizeStop(operation.stop, source)
      const index = insertionIndex(day.stops, operation.afterStopId)
      day.stops.splice(index, 0, stop)
      continue
    }

    if (operation.type === 'update_stop') {
      const day = days.find((item) => item.id === operation.dayId)
      const index = day?.stops.findIndex((stop) => stop.id === operation.stopId) ?? -1
      if (!day || index < 0) throw new Error('That stop changed before the edit could be applied.')
      const existing = day.stops[index]
      if (source === 'miller' && existing.priority === 'fixed') throw new Error('Miller Time cannot edit fixed travel or lodging logistics.')
      const coordinates = operation.patch.coordinates === undefined
        ? existing.coordinates
        : isCoordinates(operation.patch.coordinates) ? operation.patch.coordinates : undefined
      day.stops[index] = {
        ...existing,
        ...operation.patch,
        name: typeof operation.patch.name === 'string' ? operation.patch.name.trim().slice(0, 120) || existing.name : existing.name,
        mapsQuery: typeof operation.patch.mapsQuery === 'string' ? operation.patch.mapsQuery.trim().slice(0, 180) || existing.mapsQuery : existing.mapsQuery,
        coordinates,
        note: typeof operation.patch.note === 'string' ? operation.patch.note.trim().slice(0, 300) || undefined : existing.note,
        source,
        sourceUrl: operation.patch.sourceUrl === undefined ? existing.sourceUrl : safeUrl(operation.patch.sourceUrl),
      }
      continue
    }

    if (operation.type === 'move_stop') {
      const fromDay = days.find((item) => item.id === operation.fromDayId)
      const toDay = days.find((item) => item.id === operation.toDayId)
      const index = fromDay?.stops.findIndex((stop) => stop.id === operation.stopId) ?? -1
      if (!fromDay || !toDay || index < 0) throw new Error('That stop changed before it could be moved.')
      const [stop] = fromDay.stops.splice(index, 1)
      if (source === 'miller' && stop.priority === 'fixed') throw new Error('Miller Time cannot move fixed travel or lodging logistics.')
      const destination = insertionIndex(toDay.stops, operation.afterStopId)
      toDay.stops.splice(destination, 0, { ...stop, source })
      continue
    }

    const day = days.find((item) => item.id === operation.dayId)
    const index = day?.stops.findIndex((stop) => stop.id === operation.stopId) ?? -1
    if (!day || index < 0) throw new Error('That stop changed before it could be removed.')
    if (day.stops[index].priority === 'fixed') throw new Error('Fixed travel and lodging stops must be edited manually.')
    day.stops.splice(index, 1)
  }

  return {
    ...current,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    days,
    appliedProposalIds: proposalId
      ? [...current.appliedProposalIds.filter((id) => id !== proposalId), proposalId].slice(-40)
      : current.appliedProposalIds,
  } satisfies ItineraryPlan
}

export function applyProposal(current: ItineraryPlan, proposal: ItineraryProposal) {
  if (proposal.baseRevision !== current.revision) throw new Error('The itinerary changed while Miller Time was planning. Ask her to refresh the suggestion.')
  if (current.appliedProposalIds.includes(proposal.id)) throw new Error('That Miller Time suggestion was already applied.')
  return applyItineraryOperations(current, proposal.operations, 'miller', proposal.id)
}

export function compactItinerary(plan: ItineraryPlan) {
  return {
    days: plan.days.map((day) => ({
      id: day.id,
      date: `${day.day} ${day.month} ${day.date}`,
      title: day.title,
      location: day.location,
      stops: day.stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        kind: stop.kind,
        priority: stop.priority,
        mapsQuery: stop.mapsQuery,
        coordinates: stop.coordinates,
        note: stop.note,
      })),
    })),
  }
}

export function itineraryForChat(plan: ItineraryPlan) {
  return {
    revision: plan.revision,
    days: plan.days.map((day) => ({
      id: day.id,
      date: `${day.day} ${day.month} ${day.date}`,
      title: day.title,
      location: day.location,
      stops: day.stops.map((stop) => ({ id: stop.id, name: stop.name, priority: stop.priority })),
    })),
  }
}

export function itineraryAsText(plan: ItineraryPlan) {
  return plan.days.map((day) => [
    `${day.day}, ${day.month} ${day.date} — ${day.title}`,
    ...day.stops.map((stop, index) => `${index + 1}. ${stop.name}${stop.note ? ` — ${stop.note}` : ''}`),
    `Stay: ${day.location}`,
    `Weather backup: ${day.backup}`,
  ].join('\n')).join('\n\n')
}

export function routePointsForDay(day: ItineraryPlan['days'][number]): RoutePoint[] {
  return day.stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    coordinates: stop.coordinates,
    mapsQuery: stop.mapsQuery,
    note: stop.note,
    day: `${day.day} · Oct ${day.date}`,
  }))
}

export function routePointsForPlan(plan: ItineraryPlan): RoutePoint[] {
  const seen = new Set<string>()
  return plan.days.flatMap((day) => routePointsForDay(day)).filter((point) => {
    const key = (point.mapsQuery || point.name).trim().toLocaleLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

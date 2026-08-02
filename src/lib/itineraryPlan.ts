import { defaultItineraryPlan } from '../data/itinerary'
import type {
  ItineraryDay,
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
const MAX_REPLACEMENT_DAYS = 6
const MAX_REPLACEMENT_STOPS_PER_DAY = 12
const MAX_REPLACEMENT_STOPS = 64

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
    && (stop.priority !== 'fixed' || stop.kind === 'travel' || stop.kind === 'lodging')
    && (stop.coordinates === undefined || isCoordinates(stop.coordinates))
    && (stop.source === 'seed' || stop.source === 'manual' || stop.source === 'miller')
}

export function isItineraryPlan(value: unknown): value is ItineraryPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<ItineraryPlan>
  if (
    plan.schemaVersion !== 1
    || typeof plan.revision !== 'number'
    || !Array.isArray(plan.days)
    || plan.days.length !== defaultItineraryPlan.days.length
    || !Array.isArray(plan.appliedProposalIds)
  ) return false

  const stopIds = new Set<string>()
  return plan.days.every((day, index) => Boolean(
      day && day.id === defaultItineraryPlan.days[index]?.id
      && typeof day.day === 'string'
      && typeof day.date === 'number' && typeof day.month === 'string'
      && typeof day.title === 'string' && typeof day.location === 'string'
      && typeof day.image === 'string' && typeof day.imageAlt === 'string'
      && (day.tone === 'blue' || day.tone === 'green' || day.tone === 'amber')
      && (day.label === undefined || typeof day.label === 'string')
      && Array.isArray(day.stops) && day.stops.every(isStop)
      && Array.isArray(day.optional) && day.optional.every((item) => typeof item === 'string')
      && typeof day.backup === 'string' && typeof day.logistics === 'string'
      && Array.isArray(day.dining) && day.dining.every((item) => typeof item === 'string')
      && isCoordinates(day.coordinates)
      && day.stops.every((stop) => {
        if (stopIds.has(stop.id)) return false
        stopIds.add(stop.id)
        return true
      }),
    ))
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

function normalizedStopName(name: string) {
  return name.toLocaleLowerCase('en-CA').replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizedBase(location: string) {
  return normalizedStopName(location)
    .replace(/\b(?:town|downtown|alberta|canada|ab|national park)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stableStopId(name: string, proposalId: string, dayId: string, index: number) {
  const slug = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 36) || 'stop'
  const value = `${proposalId}:${dayId}:${index}:${name}`
  let hash = 2_166_136_261
  for (let position = 0; position < value.length; position += 1) {
    hash ^= value.charCodeAt(position)
    hash = Math.imul(hash, 16_777_619)
  }
  return `${slug}-${(hash >>> 0).toString(36)}`
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

function boundedText(value: unknown, maximum: number, label: string) {
  if (typeof value !== 'string') throw new Error(`${label} was missing from Miller Time’s plan.`)
  const result = value.trim().slice(0, maximum)
  if (!result) throw new Error(`${label} was missing from Miller Time’s plan.`)
  return result
}

function boundedTextList(value: unknown, maximumItems: number, maximumLength: number, label: string) {
  if (!Array.isArray(value) || value.length > maximumItems) throw new Error(`${label} was not safely formatted.`)
  return value.map((item) => boundedText(item, maximumLength, label))
}

function visualForReplacement(location: string) {
  if (!/\bjasper\b/i.test(location)) return {}
  return {
    image: '/images/icefields-parkway.jpg',
    imageAlt: 'Canadian Rockies route through the Icefields Parkway toward Jasper',
    tone: 'amber' as const,
  } satisfies Partial<ItineraryDay>
}

function replaceItineraryDays(
  current: ItineraryPlan,
  replacement: Extract<ItineraryOperation, { type: 'replace_days' }>,
  source: 'manual' | 'miller',
  proposalId?: string,
) {
  if (source !== 'miller' || !proposalId) throw new Error('A full itinerary rewrite must come from a reviewable Miller Time proposal.')
  if (replacement.days.length < 1 || replacement.days.length > MAX_REPLACEMENT_DAYS) {
    throw new Error('That rewrite includes too many days to review safely at once.')
  }

  const protectedDayIds = new Set([current.days[0]?.id, current.days.at(-1)?.id])
  const dayById = new Map(current.days.map((day) => [day.id, day]))
  const replacementIds = new Set<string>()
  let replacementStopCount = 0

  const replacementById = new Map<string, ItineraryDay>()
  for (const draft of replacement.days) {
    if (!draft || replacementIds.has(draft.dayId)) throw new Error('Miller Time repeated a day in that rewrite.')
    const existing = dayById.get(draft.dayId)
    if (!existing) throw new Error('Miller Time picked a day that is no longer in the itinerary.')
    if (protectedDayIds.has(draft.dayId)) throw new Error('Arrival and departure days stay protected during a full rewrite.')
    if (!Array.isArray(draft.stops) || draft.stops.length < 1 || draft.stops.length > MAX_REPLACEMENT_STOPS_PER_DAY) {
      throw new Error('One of the rewritten days has too many stops to review safely.')
    }

    replacementIds.add(draft.dayId)
    replacementStopCount += draft.stops.length
    if (replacementStopCount > MAX_REPLACEMENT_STOPS) throw new Error('That rewrite contains too many total stops to review safely.')

    const existingStopsByName = new Map<string, ItineraryStop[]>()
    for (const stop of existing.stops) {
      const key = normalizedStopName(stop.name)
      existingStopsByName.set(key, [...(existingStopsByName.get(key) ?? []), stop])
    }
    const usedStopIds = new Set<string>()
    const usedNames = new Map<string, ItineraryStopKind>()
    const stops = draft.stops.map((rawStop, index) => {
      const stop = sanitizeStop(rawStop, source)
      const normalizedName = normalizedStopName(stop.name)
      const priorKind = usedNames.get(normalizedName)
      if (!normalizedName || (priorKind && !(['travel', 'lodging'].includes(priorKind) && ['travel', 'lodging'].includes(stop.kind)))) {
        throw new Error(`${stop.name} appears twice on the same rewritten day.`)
      }
      usedNames.set(normalizedName, stop.kind)
      const existingStop = existingStopsByName.get(normalizedName)?.find((candidate) => !usedStopIds.has(candidate.id))
      const id = existingStop && !usedStopIds.has(existingStop.id)
        ? existingStop.id
        : stableStopId(stop.name, proposalId, draft.dayId, index)
      usedStopIds.add(id)
      const resolved = {
        ...stop,
        id,
        coordinates: stop.coordinates ?? existingStop?.coordinates,
        note: stop.note ?? existingStop?.note,
        sourceUrl: stop.sourceUrl ?? existingStop?.sourceUrl,
      }
      const unchanged = existingStop
        && resolved.name === existingStop.name
        && resolved.kind === existingStop.kind
        && resolved.priority === existingStop.priority
        && resolved.mapsQuery === existingStop.mapsQuery
        && resolved.note === existingStop.note
        && resolved.sourceUrl === existingStop.sourceUrl
        && JSON.stringify(resolved.coordinates) === JSON.stringify(existingStop.coordinates)
      return { ...resolved, source: unchanged ? existingStop.source : source }
    })

    const label = draft.label === null ? undefined : boundedText(draft.label, 80, 'The day label')
    const coordinates = isCoordinates(draft.coordinates)
      ? draft.coordinates
      : stops.find((stop) => stop.coordinates)?.coordinates ?? existing.coordinates

    replacementById.set(draft.dayId, {
      ...existing,
      ...visualForReplacement(draft.location),
      title: boundedText(draft.title, 160, 'The day title'),
      location: boundedText(draft.location, 120, 'The overnight location'),
      label,
      stops,
      optional: boundedTextList(draft.optional, 6, 180, 'The extra ideas'),
      backup: boundedText(draft.backup, 500, 'The weather backup'),
      logistics: boundedText(draft.logistics, 500, 'The logistics note'),
      dining: boundedTextList(draft.dining, 6, 140, 'The dining ideas'),
      coordinates,
    })
  }

  for (const [dayId, replacementDay] of replacementById) {
    const currentIndex = current.days.findIndex((day) => day.id === dayId)
    const currentDay = current.days[currentIndex]
    const previousDay = current.days[currentIndex - 1]
    const nextDay = current.days[currentIndex + 1]
    const previousEffectiveDay = previousDay ? replacementById.get(previousDay.id) ?? previousDay : undefined
    const baseChangesDuringDay = Boolean(previousEffectiveDay && normalizedBase(previousEffectiveDay.location) !== normalizedBase(replacementDay.location))
    if (baseChangesDuringDay && !replacementDay.stops.some((stop) => stop.kind === 'travel')) {
      throw new Error(`The ${replacementDay.day} rewrite changes bases without a travel transition.`)
    }
    if (baseChangesDuringDay && !replacementDay.stops.some((stop) => stop.kind === 'lodging')) {
      throw new Error(`The ${replacementDay.day} rewrite changes bases without a lodging transition.`)
    }
    const disconnectsUnchangedNextDay = nextDay
      && !replacementById.has(nextDay.id)
      && normalizedBase(currentDay.location) !== normalizedBase(replacementDay.location)
    if (disconnectsUnchangedNextDay) {
      throw new Error(`The rewrite must return to ${currentDay.location} before the unchanged ${nextDay.day} plan begins.`)
    }
  }

  return current.days.map((day) => replacementById.get(day.id) ?? day)
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
  const rewrite = operations.find((operation) => operation.type === 'replace_days')
  if (rewrite && operations.length !== 1) throw new Error('A full rewrite cannot be mixed with smaller itinerary edits.')
  const days = rewrite
    ? replaceItineraryDays(current, rewrite, source, proposalId)
    : current.days.map((day) => ({ ...day, stops: [...day.stops] }))

  for (const operation of rewrite ? [] : operations) {
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
      const nextPriority = operation.patch.priority ?? existing.priority
      const nextSource = source === 'manual' && existing.source === 'miller' && nextPriority === 'fixed' ? 'miller' : source
      day.stops[index] = {
        ...existing,
        ...operation.patch,
        name: typeof operation.patch.name === 'string' ? operation.patch.name.trim().slice(0, 120) || existing.name : existing.name,
        mapsQuery: typeof operation.patch.mapsQuery === 'string' ? operation.patch.mapsQuery.trim().slice(0, 180) || existing.mapsQuery : existing.mapsQuery,
        coordinates,
        note: typeof operation.patch.note === 'string' ? operation.patch.note.trim().slice(0, 300) || undefined : existing.note,
        source: nextSource,
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
      const nextSource = source === 'manual' && stop.source === 'miller' && stop.priority === 'fixed' ? 'miller' : source
      toDay.stops.splice(destination, 0, { ...stop, source: nextSource })
      continue
    }

    if (operation.type === 'replace_days') continue
    const day = days.find((item) => item.id === operation.dayId)
    const index = day?.stops.findIndex((stop) => stop.id === operation.stopId) ?? -1
    if (!day || index < 0) throw new Error('That stop changed before it could be removed.')
    if (day.stops[index].priority === 'fixed' && !(source === 'manual' && day.stops[index].source === 'miller')) {
      throw new Error('Seeded travel and lodging anchors cannot be removed.')
    }
    day.stops.splice(index, 1)
  }

  const next = {
    ...current,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    days,
    appliedProposalIds: proposalId
      ? [...current.appliedProposalIds.filter((id) => id !== proposalId), proposalId].slice(-40)
      : current.appliedProposalIds,
  } satisfies ItineraryPlan
  if (!isItineraryPlan(next)) throw new Error('The proposed itinerary did not pass the final safety check.')
  return next
}

export function previewProposal(current: ItineraryPlan, proposal: ItineraryProposal) {
  if (proposal.baseRevision !== current.revision) throw new Error('The itinerary changed while Miller Time was planning. Ask her to refresh the suggestion.')
  if (current.appliedProposalIds.includes(proposal.id)) throw new Error('That Miller Time suggestion was already applied.')
  return applyItineraryOperations(current, proposal.operations, 'miller', proposal.id)
}

export function applyProposal(current: ItineraryPlan, proposal: ItineraryProposal) {
  return previewProposal(current, proposal)
}

export function proposalAffectedDayIds(proposal: ItineraryProposal) {
  const affected = new Set<string>()
  for (const operation of proposal.operations) {
    if (operation.type === 'replace_days') operation.days.forEach((day) => affected.add(day.dayId))
    else if (operation.type === 'move_stop') {
      affected.add(operation.fromDayId)
      affected.add(operation.toDayId)
    } else affected.add(operation.dayId)
  }
  return [...affected]
}

export function compactItinerary(plan: ItineraryPlan) {
  return {
    days: plan.days.map((day) => ({
      id: day.id,
      date: `${day.day} ${day.month} ${day.date}`,
      title: day.title,
      location: day.location,
      label: day.label,
      stops: day.stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        kind: stop.kind,
        priority: stop.priority,
        mapsQuery: stop.mapsQuery,
        coordinates: stop.coordinates,
        note: stop.note,
      })),
      optional: day.optional,
      backup: day.backup,
      logistics: day.logistics,
      dining: day.dining,
      coordinates: day.coordinates,
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

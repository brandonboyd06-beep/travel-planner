import type {
  ItineraryOperation,
  ItineraryProposal,
  ItineraryStopKind,
  ItineraryStopPriority,
} from '../types'

export interface ProposalSourceLink {
  title: string
  url: string
}

const kinds = new Set<ItineraryStopKind>(['travel', 'activity', 'scenic', 'meal', 'lodging', 'other'])
const priorities = new Set<ItineraryStopPriority>(['fixed', 'core', 'optional'])
const editablePriorities = new Set<ItineraryStopPriority>(['core', 'optional'])

function boundedString(value: unknown, maximum: number) {
  if (typeof value !== 'string') return undefined
  const result = value.trim()
  return result ? result.slice(0, maximum) : undefined
}

function safeUrl(value: unknown) {
  const rawUrl = boundedString(value, 500)
  if (!rawUrl) return undefined
  try {
    const url = new URL(rawUrl)
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function coordinates(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2 || value.some((item) => typeof item !== 'number' || !Number.isFinite(item))) return undefined
  const [latitude, longitude] = value as [number, number]
  if (latitude < 49 || latitude > 54 || longitude < -119 || longitude > -113) return undefined
  return [latitude, longitude]
}

function boundedStringList(value: unknown, maximumItems: number, maximumLength: number) {
  if (!Array.isArray(value) || value.length > maximumItems) return undefined
  const result = value.map((item) => boundedString(item, maximumLength))
  return result.every((item): item is string => Boolean(item)) ? result : undefined
}

export function parseProposalSources(value: unknown): ProposalSourceLink[] {
  if (!Array.isArray(value)) return []
  const sources = new Map<string, ProposalSourceLink>()
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const url = safeUrl(item.url)
    const title = boundedString(item.title, 120)
    if (url && title && !sources.has(url)) sources.set(url, { title, url })
    if (sources.size === 6) break
  }
  return [...sources.values()]
}

export function parseItineraryOperation(value: unknown): ItineraryOperation | null {
  if (!value || typeof value !== 'object') return null
  const operation = value as Record<string, unknown>
  const type = operation.type

  if (type === 'replace_days' && Array.isArray(operation.days)) {
    if (operation.days.length < 1 || operation.days.length > 6) return null
    const seenDays = new Set<string>()
    let stopCount = 0
    const days: Extract<ItineraryOperation, { type: 'replace_days' }>['days'] = []
    for (const rawDayValue of operation.days) {
      if (!rawDayValue || typeof rawDayValue !== 'object') return null
      const rawDay = rawDayValue as Record<string, unknown>
      const dayId = boundedString(rawDay.dayId, 80)
      const title = boundedString(rawDay.title, 160)
      const location = boundedString(rawDay.location, 120)
      const label = rawDay.label == null ? null : boundedString(rawDay.label, 80)
      const optional = boundedStringList(rawDay.optional, 6, 180)
      const backup = boundedString(rawDay.backup, 500)
      const logistics = boundedString(rawDay.logistics, 500)
      const dining = boundedStringList(rawDay.dining, 6, 140)
      if (
        !dayId || seenDays.has(dayId) || !title || !location || (rawDay.label != null && !label)
        || !Array.isArray(rawDay.stops) || rawDay.stops.length < 1 || rawDay.stops.length > 12
        || !optional || !backup || !logistics || !dining
      ) return null

      seenDays.add(dayId)
      stopCount += rawDay.stops.length
      if (stopCount > 64) return null
      const names = new Map<string, ItineraryStopKind>()
      const stops: Extract<ItineraryOperation, { type: 'replace_days' }>['days'][number]['stops'] = []
      for (const rawStopValue of rawDay.stops) {
        if (!rawStopValue || typeof rawStopValue !== 'object') return null
        const rawStop = rawStopValue as Record<string, unknown>
        const name = boundedString(rawStop.name, 120)
        if (!name) return null
        const normalizedName = name.toLocaleLowerCase('en-CA').replace(/[^a-z0-9]+/g, ' ').trim()
        const kind = kinds.has(rawStop.kind as ItineraryStopKind) ? rawStop.kind as ItineraryStopKind : 'other'
        const priority = priorities.has(rawStop.priority as ItineraryStopPriority) ? rawStop.priority as ItineraryStopPriority : 'core'
        const priorKind = names.get(normalizedName)
        if (!normalizedName || (priorKind && !(['travel', 'lodging'].includes(priorKind) && ['travel', 'lodging'].includes(kind)))) return null
        names.set(normalizedName, kind)
        if (priority === 'fixed' && kind !== 'travel' && kind !== 'lodging') return null
        stops.push({
          name,
          kind,
          priority,
          mapsQuery: boundedString(rawStop.mapsQuery, 180) ?? name,
          coordinates: coordinates(rawStop.coordinates),
          note: boundedString(rawStop.note, 300),
          sourceUrl: safeUrl(rawStop.sourceUrl),
        })
      }

      const dayCoordinates = coordinates(rawDay.coordinates)
      if (rawDay.coordinates != null && !dayCoordinates) return null
      days.push({ dayId, title, location, label: label ?? null, stops, optional, backup, logistics, dining, coordinates: dayCoordinates })
    }
    return { type, days }
  }

  if (type === 'add_stop' && operation.stop && typeof operation.stop === 'object') {
    const dayId = boundedString(operation.dayId, 80)
    const afterStopId = boundedString(operation.afterStopId, 100)
    const rawStop = operation.stop as Record<string, unknown>
    const name = boundedString(rawStop.name, 120)
    if (!dayId || !name) return null
    const kind = kinds.has(rawStop.kind as ItineraryStopKind) ? rawStop.kind as ItineraryStopKind : 'other'
    const priority = editablePriorities.has(rawStop.priority as ItineraryStopPriority) ? rawStop.priority as ItineraryStopPriority : 'core'
    return {
      type,
      dayId,
      afterStopId,
      stop: {
        name,
        kind,
        priority,
        mapsQuery: boundedString(rawStop.mapsQuery, 180) ?? name,
        coordinates: coordinates(rawStop.coordinates),
        note: boundedString(rawStop.note, 300),
        sourceUrl: safeUrl(rawStop.sourceUrl),
      },
    }
  }

  if (type === 'move_stop') {
    const stopId = boundedString(operation.stopId, 100)
    const fromDayId = boundedString(operation.fromDayId, 80)
    const toDayId = boundedString(operation.toDayId, 80)
    if (!stopId || !fromDayId || !toDayId) return null
    return { type, stopId, fromDayId, toDayId, afterStopId: boundedString(operation.afterStopId, 100) }
  }

  if (type === 'remove_stop') {
    const dayId = boundedString(operation.dayId, 80)
    const stopId = boundedString(operation.stopId, 100)
    return dayId && stopId ? { type, dayId, stopId } : null
  }

  if (type === 'update_stop' && operation.patch && typeof operation.patch === 'object') {
    const dayId = boundedString(operation.dayId, 80)
    const stopId = boundedString(operation.stopId, 100)
    if (!dayId || !stopId) return null
    const rawPatch = operation.patch as Record<string, unknown>
    const patch: Extract<ItineraryOperation, { type: 'update_stop' }>['patch'] = {}
    const name = boundedString(rawPatch.name, 120)
    const mapsQuery = boundedString(rawPatch.mapsQuery, 180)
    const note = boundedString(rawPatch.note, 300)
    const sourceUrl = safeUrl(rawPatch.sourceUrl)
    const position = coordinates(rawPatch.coordinates)
    if (name) patch.name = name
    if (mapsQuery) patch.mapsQuery = mapsQuery
    if (kinds.has(rawPatch.kind as ItineraryStopKind)) patch.kind = rawPatch.kind as ItineraryStopKind
    if (editablePriorities.has(rawPatch.priority as ItineraryStopPriority)) patch.priority = rawPatch.priority as ItineraryStopPriority
    if (position) patch.coordinates = position
    if (note) patch.note = note
    if (sourceUrl) patch.sourceUrl = sourceUrl
    return Object.keys(patch).length ? { type, dayId, stopId, patch } : null
  }

  return null
}

export function parseItineraryProposal(
  value: unknown,
  expectedRevision: number,
  sources: ProposalSourceLink[] = [],
): ItineraryProposal | null {
  if (!value || typeof value !== 'object' || !Number.isSafeInteger(expectedRevision)) return null
  const proposal = value as Record<string, unknown>
  if (!Array.isArray(proposal.operations) || proposal.operations.length < 1 || proposal.operations.length > 4) return null
  const operations = proposal.operations.map(parseItineraryOperation)
  if (operations.some((operation) => !operation)) return null
  if (operations.some((operation) => operation?.type === 'replace_days') && operations.length !== 1) return null
  const summary = boundedString(proposal.summary, 220)
  const rationale = boundedString(proposal.rationale, 700)
  if (!summary || !rationale) return null
  const id = boundedString(proposal.id, 120)

  return {
    id: id ?? `miller-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    baseRevision: expectedRevision,
    summary,
    rationale,
    operations: operations as ItineraryOperation[],
    warnings: Array.isArray(proposal.warnings)
      ? proposal.warnings.flatMap((warning) => boundedString(warning, 240) ?? []).slice(0, 4)
      : [],
    sources: parseProposalSources(sources),
  }
}

export function proposalRevision(value: unknown) {
  if (!value || typeof value !== 'object') return undefined
  const revision = (value as Record<string, unknown>).baseRevision
  return Number.isSafeInteger(revision) && (revision as number) >= 0 ? revision as number : undefined
}

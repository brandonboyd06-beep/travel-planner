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

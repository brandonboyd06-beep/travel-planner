import { lodging } from '../data/lodging'
import type { ItineraryPlan, Lodging } from '../types'
import { formatItineraryDate } from './itinerarySummary'

export interface LodgingSegment {
  id: string
  baseKey: string
  baseName: string
  checkIn: string
  checkOut: string
  dateLabel: string
  nights: number
  startDayId: string
  endDayId: string
}

export type LodgingSelections = Record<string, string>

function normalize(value: string) {
  return value
    .toLocaleLowerCase('en-CA')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(?:town|downtown|alberta|canada|ab|national park|townsite)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function displayBase(value: string) {
  return value
    .replace(/\s+(?:town|downtown|townsite|national park)$/i, '')
    .replace(/,?\s+(?:Alberta|AB|Canada)$/i, '')
    .trim()
}

function segmentId(startDayId: string, endDayId: string, baseKey: string, nights: number) {
  return `${startDayId}:${endDayId}:${baseKey}:${nights}`
}

export function lodgingSegmentsForItinerary(plan: ItineraryPlan): LodgingSegment[] {
  const overnightDays = plan.days.slice(0, -1)
  const segments: Array<Omit<LodgingSegment, 'id' | 'dateLabel'>> = []

  overnightDays.forEach((day, index) => {
    const nextDay = plan.days[index + 1]
    const baseKey = normalize(day.location) || day.location.toLocaleLowerCase('en-CA')
    const current = segments.at(-1)

    if (current?.baseKey === baseKey) {
      current.endDayId = day.id
      current.checkOut = formatItineraryDate(nextDay, false)
      current.nights += 1
      return
    }

    segments.push({
      baseKey,
      baseName: displayBase(day.location),
      checkIn: formatItineraryDate(day, false),
      checkOut: formatItineraryDate(nextDay, false),
      nights: 1,
      startDayId: day.id,
      endDayId: day.id,
    })
  })

  return segments.map((segment) => ({
    ...segment,
    id: segmentId(segment.startDayId, segment.endDayId, segment.baseKey, segment.nights),
    dateLabel: `${segment.checkIn}–${segment.checkOut}`,
  }))
}

export function lodgingTownForBase(baseName: string): Lodging['town'] | null {
  const key = normalize(baseName)
  if (key.includes('jasper')) return 'Jasper'
  if (key.includes('canmore')) return 'Canmore'
  if (key.includes('banff')) return 'Banff'
  return null
}

export function lodgingOptionsForSegment(segment: LodgingSegment) {
  const town = lodgingTownForBase(segment.baseName)
  return town ? lodging.filter((item) => item.town === town) : []
}

export function estimateLodgingCost(item: Lodging, nights: number) {
  const nightlyMultiplier = item.rateBasis === 'per-room-night' ? item.roomCount : 1
  return Math.round(item.price * nightlyMultiplier * nights + item.estimatedFixedFees)
}

export function matchedLodgingSelection(segment: LodgingSegment, selections: LodgingSelections) {
  const selected = lodging.find((item) => item.id === selections[segment.id])
  return selected && lodgingTownForBase(segment.baseName) === selected.town ? selected : null
}

export interface LodgingCoverageItem {
  segment: LodgingSegment
  options: Lodging[]
  selected: Lodging | null
  status: 'chosen' | 'ready' | 'research-needed'
}

export function lodgingCoverageForItinerary(plan: ItineraryPlan, selections: LodgingSelections): LodgingCoverageItem[] {
  return lodgingSegmentsForItinerary(plan).map((segment) => {
    const options = lodgingOptionsForSegment(segment)
    const selected = matchedLodgingSelection(segment, selections)
    return {
      segment,
      options,
      selected,
      status: selected ? 'chosen' : options.length ? 'ready' : 'research-needed',
    }
  })
}

export function lodgingSelectionTotal(plan: ItineraryPlan, selections: LodgingSelections) {
  return lodgingCoverageForItinerary(plan, selections).reduce((total, item) => {
    return total + (item.selected ? estimateLodgingCost(item.selected, item.segment.nights) : 0)
  }, 0)
}

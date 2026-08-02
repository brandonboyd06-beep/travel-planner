import { defaultItineraryPlan } from '../data/itinerary'
import { findTripPlace } from '../data/tripPlaces'
import type { ItineraryDay, ItineraryPlan, ItineraryStop, MapLocation } from '../types'

const weekdayNames: Record<string, string> = {
  SUN: 'Sunday',
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
}

const mapCategoryOrder: MapLocation['category'][] = [
  'Airport',
  'Lodging',
  'Transportation',
  'Shuttle pickup',
  'Scenic stops',
  'Activities',
  'Dining',
  'Visitor centers',
]

function normalize(value: string) {
  return value
    .toLocaleLowerCase('en-CA')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeBase(value: string) {
  return normalize(value)
    .replace(/\b(?:town|downtown|alberta|canada|ab|national park)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function displayBase(value: string) {
  return value
    .replace(/\s+(?:town|downtown)$/i, '')
    .replace(/,?\s+(?:Alberta|AB|Canada)$/i, '')
    .trim()
}

function coordinatesForStop(stop: ItineraryStop) {
  if (stop.coordinates) return stop.coordinates
  return findTripPlace(stop.name)?.coordinates ?? findTripPlace(stop.mapsQuery)?.coordinates
}

function categoryForStop(stop: ItineraryStop): MapLocation['category'] {
  const label = normalize(`${stop.name} ${stop.mapsQuery} ${stop.note ?? ''}`)
  if (/\b(?:airport|yyc)\b/.test(label)) return 'Airport'
  if (stop.kind === 'lodging') return 'Lodging'
  if (stop.kind === 'meal') return 'Dining'
  if (/\b(?:shuttle|transit|park ride|connector)\b/.test(label)) return 'Shuttle pickup'
  if (stop.kind === 'travel') return 'Transportation'
  if (stop.kind === 'scenic') return 'Scenic stops'
  return 'Activities'
}

function mapKey(stop: ItineraryStop) {
  return normalize(stop.mapsQuery || stop.name)
}

export function formatItineraryDate(day: ItineraryDay, includeWeekday = true) {
  const date = `${day.month.charAt(0)}${day.month.slice(1).toLocaleLowerCase()} ${day.date}`
  return includeWeekday ? `${weekdayNames[day.day] ?? day.day}, ${date}` : date
}

export interface ItineraryBase {
  key: string
  name: string
  nights: number
}

export interface ItinerarySummary {
  nights: number
  bases: ItineraryBase[]
  destinationLabel: string
  baseSummary: string
  baseChanges: number
  routeLabels: Array<{ id: string; label: string }>
}

export function summarizeItinerary(plan: ItineraryPlan): ItinerarySummary {
  const overnightDays = plan.days.slice(0, -1)
  const baseByKey = new Map<string, ItineraryBase>()
  let previousBase = ''
  let baseChanges = 0

  for (const day of overnightDays) {
    const key = normalizeBase(day.location) || normalize(day.location)
    const existing = baseByKey.get(key)
    if (existing) existing.nights += 1
    else baseByKey.set(key, { key, name: displayBase(day.location), nights: 1 })
    if (previousBase && previousBase !== key) baseChanges += 1
    previousBase = key
  }

  const bases = [...baseByKey.values()]
  const baseSummary = bases.length
    ? bases.map((base) => `${base.nights} ${base.nights === 1 ? 'night' : 'nights'} ${base.name}`).join(' · ')
    : 'No overnight base selected'

  return {
    nights: overnightDays.length,
    bases,
    destinationLabel: bases.map((base) => base.name).join(' + ') || 'Current itinerary',
    baseSummary,
    baseChanges,
    routeLabels: plan.days.map((day) => ({
      id: day.id,
      label: `${formatItineraryDate(day, false)} · ${day.title}`,
    })),
  }
}

export interface ItineraryMapData {
  locations: MapLocation[]
  categories: MapLocation['category'][]
  unpinnedStops: number
}

export function mapDataForItinerary(plan: ItineraryPlan): ItineraryMapData {
  const locationByKey = new Map<string, MapLocation & { dayLabels: string[] }>()
  const unpinnedKeys = new Set<string>()

  plan.days.forEach((day, dayIndex) => {
    day.stops.forEach((stop) => {
      const key = mapKey(stop)
      if (!key) return
      const coordinates = coordinatesForStop(stop)
      if (!coordinates) {
        unpinnedKeys.add(key)
        return
      }

      const dayLabel = `Day ${dayIndex + 1} · ${formatItineraryDate(day, false)}`
      const existing = locationByKey.get(key)
      if (existing) {
        if (!existing.dayLabels.includes(dayLabel)) existing.dayLabels.push(dayLabel)
        return
      }

      locationByKey.set(key, {
        id: stop.id,
        name: stop.name,
        category: categoryForStop(stop),
        coordinates,
        day: dayLabel,
        dayLabels: [dayLabel],
        note: stop.note ?? `Current itinerary ${stop.kind}`,
      })
    })
  })

  const locations = [...locationByKey.values()].map(({ dayLabels, ...location }) => ({
    ...location,
    day: dayLabels.join(' · '),
  }))
  const usedCategories = new Set(locations.map((location) => location.category))

  return {
    locations,
    categories: mapCategoryOrder.filter((category) => usedCategories.has(category)),
    unpinnedStops: unpinnedKeys.size,
  }
}

function baseSignature(plan: ItineraryPlan) {
  return plan.days.slice(0, -1).map((day) => normalizeBase(day.location)).join('|')
}

export function hasLodgingResearchGap(plan: ItineraryPlan) {
  return baseSignature(plan) !== baseSignature(defaultItineraryPlan)
}

function transportationStops(plan: ItineraryPlan) {
  return plan.days.flatMap((day) => day.stops
    .filter((stop) => stop.kind === 'travel' || stop.kind === 'lodging')
    .map((stop) => ({ key: `${day.id}:${mapKey(stop)}`, name: stop.name })))
}

export interface TransportationResearchGap {
  changed: boolean
  addedStops: string[]
  removedStops: string[]
}

export function getTransportationResearchGap(plan: ItineraryPlan): TransportationResearchGap {
  const current = transportationStops(plan)
  const original = transportationStops(defaultItineraryPlan)
  const currentKeys = new Set(current.map((stop) => stop.key))
  const originalKeys = new Set(original.map((stop) => stop.key))
  const addedStops = current.filter((stop) => !originalKeys.has(stop.key)).map((stop) => stop.name)
  const removedStops = original.filter((stop) => !currentKeys.has(stop.key)).map((stop) => stop.name)

  return {
    changed: baseSignature(plan) !== baseSignature(defaultItineraryPlan) || addedStops.length > 0 || removedStops.length > 0,
    addedStops: [...new Set(addedStops)],
    removedStops: [...new Set(removedStops)],
  }
}

export function itineraryIncludes(plan: ItineraryPlan, searchTerms: readonly string[]) {
  const terms = searchTerms.map(normalize).filter(Boolean)
  return plan.days.some((day) => {
    const stopText = day.stops.map((stop) => `${stop.name} ${stop.mapsQuery} ${stop.note ?? ''}`).join(' ')
    const haystack = normalize(`${day.title} ${day.logistics} ${day.backup} ${day.optional.join(' ')} ${day.dining.join(' ')} ${stopText}`)
    return terms.some((term) => haystack.includes(term))
  })
}

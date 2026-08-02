import type { BookingItem } from '../data/bookings'
import type { ItineraryDay, ItineraryPlan } from '../types'
import { formatItineraryDate } from './itinerarySummary'

const shuttleBookingIds = new Set(['parks-lakes-shuttle', 'roam-super-pass'])

function normalize(value: string) {
  return value.toLocaleLowerCase('en-CA').replace(/[^a-z0-9]+/g, ' ').trim()
}

function matchingDay(plan: ItineraryPlan, item: BookingItem) {
  const terms = item.matchTerms.map(normalize).filter(Boolean)
  return plan.days.find((day) => {
    const stopText = day.stops.map((stop) => `${stop.name} ${stop.mapsQuery}`).join(' ')
    const haystack = normalize(`${stopText} ${day.optional.join(' ')} ${day.dining.join(' ')}`)
    return terms.some((term) => haystack.includes(term))
  })
}

function replaceSeedDate(value: string, item: BookingItem, day?: ItineraryDay) {
  const seedShortDate = item.tripDate.replace(/^[^,]+,\s*/, '')
  const currentShortDate = day ? formatItineraryDate(day, false) : 'the date you add it back'
  return value.split(seedShortDate).join(currentShortDate)
}

export interface ReconciledBookingItem extends BookingItem {
  inCurrentPlan: boolean
  matchedDayId?: string
}

export function reconcileBookingItems(plan: ItineraryPlan, items: readonly BookingItem[]): ReconciledBookingItem[] {
  return items.map((item) => {
    const day = matchingDay(plan, item)
    return {
      ...item,
      inCurrentPlan: Boolean(day),
      matchedDayId: day?.id,
      tripDate: day ? formatItineraryDate(day) : 'Not in the current itinerary',
      bookingLabel: day ? replaceSeedDate(item.bookingLabel, item, day) : 'View official booking page',
      instructions: item.instructions.map((instruction) => replaceSeedDate(instruction, item, day)),
    }
  })
}

export function isShuttleBooking(item: Pick<BookingItem, 'id'>) {
  return shuttleBookingIds.has(item.id)
}

export function selectExclusiveShuttle(current: string[], selectedId: string) {
  if (!shuttleBookingIds.has(selectedId)) return current
  const currentShuttle = [...current].reverse().find((id) => shuttleBookingIds.has(id))
  const withoutShuttles = current.filter((id) => !shuttleBookingIds.has(id))
  return currentShuttle === selectedId ? withoutShuttles : [...withoutShuttles, selectedId]
}

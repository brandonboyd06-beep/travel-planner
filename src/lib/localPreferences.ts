export const LOCAL_STORAGE_PREFIX = 'banff-2026:'
export const LOCAL_PREFERENCE_EVENT = 'banff-2026:preference-change'
export const LOCAL_STORAGE_ERROR_EVENT = 'banff-2026:storage-error'

export const cloudPreferenceKeys = [
  'overview-checklist',
  'booking-progress',
  'booking-reviewed-revision',
  'itinerary-plan-v1',
  'preferred-lodging',
  'lodging-selections-v1',
  'lodging-scenario',
  'lodging-calculator',
  'budget-estimates',
  'packing',
  'personal-notes',
  'reservations',
] as const

export type CloudPreferenceKey = (typeof cloudPreferenceKeys)[number]

export function isCloudPreferenceKey(key: string): key is CloudPreferenceKey {
  return (cloudPreferenceKeys as readonly string[]).includes(key)
}

export interface LocalPreferenceChange {
  key: string
  value: unknown
  origin: 'user' | 'cloud'
  updatedAt: string
}

export function storageKey(key: string) {
  return `${LOCAL_STORAGE_PREFIX}${key}`
}

function timestampKey(key: string) {
  return `${storageKey(key)}:updated-at`
}

function syncedTripKey(key: string) {
  return `${storageKey(key)}:synced-trip`
}

function dirtyKey(key: string) {
  return `${storageKey(key)}:needs-sync`
}

function tripBackupKey(key: string, tripId: string) {
  return `${storageKey(key)}:trip-backup:${tripId}`
}

const budgetEstimateKeys = [
  'Lodging', 'Rental vehicle', 'Fuel', 'Park pass', 'Shuttles',
  'Attractions', 'Restaurants', 'Groceries', 'Parking', 'Miscellaneous',
] as const

const lodgingCalculatorKeys = [
  'rooms', 'hotelRate', 'hotelNights', 'tax', 'parking',
  'rentalNights', 'rentalTotal', 'cleaning', 'service',
] as const

function isNonNegativeNumberRecord(value: unknown, requiredKeys: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Object.keys(record).length === requiredKeys.length
    && requiredKeys.every((key) => typeof record[key] === 'number' && Number.isFinite(record[key]) && record[key] >= 0)
}

export function readLocalPreference<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(storageKey(key))
    if (saved === null) return fallback
    const parsed = JSON.parse(saved) as unknown
    return isCloudPreferenceKey(key) && !isValidCloudPreference(key, parsed) ? fallback : parsed as T
  } catch {
    return fallback
  }
}

export function isValidCloudPreference(key: CloudPreferenceKey, value: unknown) {
  if (key === 'booking-reviewed-revision') {
    return (typeof value === 'string' && value.length <= 120)
      || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
  }
  if (key === 'preferred-lodging' || key === 'personal-notes' || key === 'lodging-scenario') return typeof value === 'string'
  if (key === 'lodging-selections-v1') {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
      && Object.entries(value as Record<string, unknown>).every(([segmentId, lodgingId]) => (
        segmentId.length > 0 && segmentId.length <= 240 && typeof lodgingId === 'string' && lodgingId.length <= 120
      ))
  }
  if (key === 'overview-checklist' || key === 'booking-progress' || key === 'packing') {
    return Array.isArray(value) && value.every((item) => typeof item === 'string')
  }
  if (key === 'budget-estimates') return isNonNegativeNumberRecord(value, budgetEstimateKeys)
  if (key === 'lodging-calculator') return isNonNegativeNumberRecord(value, lodgingCalculatorKeys)
  if (key === 'reservations') {
    const statuses = new Set(['Not started', 'Researching', 'Ready to book', 'Booked'])
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
      && Object.values(value as Record<string, unknown>).every((item) => typeof item === 'string' && statuses.has(item))
  }
  if (key === 'itinerary-plan-v1') {
    const candidate = value as { schemaVersion?: unknown; revision?: unknown; days?: unknown }
    return Boolean(candidate) && typeof candidate === 'object' && candidate.schemaVersion === 1
      && typeof candidate.revision === 'number' && Number.isSafeInteger(candidate.revision)
      && Array.isArray(candidate.days)
  }
  return false
}

export function readLocalPreferences() {
  const preferences: Record<string, unknown> = {}

  for (const key of cloudPreferenceKeys) {
    try {
      const saved = window.localStorage.getItem(storageKey(key))
      if (saved !== null) {
        const parsed = JSON.parse(saved) as unknown
        if (isValidCloudPreference(key, parsed)) preferences[key] = parsed
      }
    } catch {
      // A malformed browser-local value should not prevent other preferences syncing.
    }
  }

  return preferences
}

export function readLocalPreferenceUpdatedAt(key: string) {
  try {
    return window.localStorage.getItem(timestampKey(key)) ?? ''
  } catch {
    return ''
  }
}

export function readLocalPreferenceSyncedTrip(key: string) {
  try {
    return window.localStorage.getItem(syncedTripKey(key)) ?? ''
  } catch {
    return ''
  }
}

export function isLocalPreferenceDirty(key: string) {
  try {
    return window.localStorage.getItem(dirtyKey(key)) === 'true'
  } catch {
    return false
  }
}

export function associateLocalPreferenceWithTrip(key: string, tripId: string) {
  try {
    window.localStorage.setItem(syncedTripKey(key), tripId)
  } catch {
    // Sync metadata is advisory. The preference itself still has its normal error path.
  }
}

function defaultCloudPreference(key: CloudPreferenceKey): unknown {
  if (key === 'booking-reviewed-revision') return ''
  if (key === 'preferred-lodging' || key === 'personal-notes' || key === 'lodging-scenario') return ''
  if (key === 'lodging-selections-v1') return {}
  if (key === 'overview-checklist' || key === 'booking-progress' || key === 'packing') return []
  if (key === 'itinerary-plan-v1') return defaultItineraryPlan
  if (key === 'budget-estimates') return {
    Lodging: 6800,
    'Rental vehicle': 780,
    Fuel: 300,
    'Park pass': 180,
    Shuttles: 220,
    Attractions: 800,
    Restaurants: 1900,
    Groceries: 350,
    Parking: 180,
    Miscellaneous: 300,
  }
  if (key === 'lodging-calculator') return {
    rooms: 3,
    hotelRate: 315,
    hotelNights: 4,
    tax: 15,
    parking: 25,
    rentalNights: 3,
    rentalTotal: 1560,
    cleaning: 180,
    service: 145,
  }
  return Object.fromEntries(reservations.map((item) => [item, 'Not started']))
}

function backupCurrentTripPreference(key: CloudPreferenceKey, nextTripId: string) {
  try {
    const currentTripId = window.localStorage.getItem(syncedTripKey(key))
    const saved = window.localStorage.getItem(storageKey(key))
    if (!currentTripId || currentTripId === nextTripId || saved === null) return
    const parsed = JSON.parse(saved) as unknown
    if (isValidCloudPreference(key, parsed)) window.localStorage.setItem(tripBackupKey(key, currentTripId), saved)
  } catch {
    // Trip backups are a safety net; the canonical cloud value remains authoritative.
  }
}

export function applyCloudPreferenceForTrip(
  key: CloudPreferenceKey,
  tripId: string,
  value: unknown,
  updatedAt?: string,
) {
  if (!isValidCloudPreference(key, value)) return false
  backupCurrentTripPreference(key, tripId)
  writeLocalPreference(key, value, 'cloud', updatedAt)
  return markLocalPreferenceSyncedToTrip(key, tripId)
}

export function restoreLocalPreferenceForTrip(key: CloudPreferenceKey, tripId: string) {
  backupCurrentTripPreference(key, tripId)
  let nextValue = defaultCloudPreference(key)
  try {
    const backup = window.localStorage.getItem(tripBackupKey(key, tripId))
    if (backup !== null) {
      const parsed = JSON.parse(backup) as unknown
      if (isValidCloudPreference(key, parsed)) nextValue = parsed
    }
  } catch {
    // Fall back to a clean trip-specific starting value.
  }
  writeLocalPreference(key, nextValue, 'cloud')
  markLocalPreferenceSyncedToTrip(key, tripId)
  return nextValue
}

export function markLocalPreferenceSyncedToTrip(key: string, tripId: string, expectedUpdatedAt?: string) {
  try {
    if (expectedUpdatedAt !== undefined && window.localStorage.getItem(timestampKey(key)) !== expectedUpdatedAt) return false
    window.localStorage.setItem(syncedTripKey(key), tripId)
    window.localStorage.removeItem(dirtyKey(key))
    return true
  } catch {
    // Sync metadata is advisory. The preference itself still has its normal error path.
    return false
  }
}

export function writeLocalPreference(
  key: string,
  value: unknown,
  origin: LocalPreferenceChange['origin'],
  updatedAt = new Date().toISOString(),
) {
  let savedLocally = true
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value))
    window.localStorage.setItem(timestampKey(key), updatedAt)
    if (origin === 'user') window.localStorage.setItem(dirtyKey(key), 'true')
  } catch {
    savedLocally = false
    window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_ERROR_EVENT, { detail: { key } }))
  }
  window.dispatchEvent(new CustomEvent<LocalPreferenceChange>(LOCAL_PREFERENCE_EVENT, {
    detail: { key, value, origin, updatedAt },
  }))
  return savedLocally
}
import { defaultItineraryPlan } from '../data/itinerary'
import { reservations } from '../data/packing'

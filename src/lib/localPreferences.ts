export const LOCAL_STORAGE_PREFIX = 'banff-2026:'
export const LOCAL_PREFERENCE_EVENT = 'banff-2026:preference-change'

export const cloudPreferenceKeys = [
  'overview-checklist',
  'booking-progress',
  'optional-days',
  'preferred-lodging',
  'lodging-scenario',
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
}

export function storageKey(key: string) {
  return `${LOCAL_STORAGE_PREFIX}${key}`
}

export function readLocalPreference<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(storageKey(key))
    return saved === null ? fallback : (JSON.parse(saved) as T)
  } catch {
    return fallback
  }
}

export function readLocalPreferences() {
  const preferences: Record<string, unknown> = {}

  for (const key of cloudPreferenceKeys) {
    try {
      const saved = window.localStorage.getItem(storageKey(key))
      if (saved !== null) preferences[key] = JSON.parse(saved) as unknown
    } catch {
      // A malformed browser-local value should not prevent other preferences syncing.
    }
  }

  return preferences
}

export function writeLocalPreference(key: string, value: unknown, origin: LocalPreferenceChange['origin']) {
  window.localStorage.setItem(storageKey(key), JSON.stringify(value))
  window.dispatchEvent(new CustomEvent<LocalPreferenceChange>(LOCAL_PREFERENCE_EVENT, {
    detail: { key, value, origin },
  }))
}

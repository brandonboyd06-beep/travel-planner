import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LOCAL_PREFERENCE_EVENT,
  isCloudPreferenceKey,
  readLocalPreference,
  storageKey,
  writeLocalPreference,
  type LocalPreferenceChange,
} from '../lib/localPreferences'
import { useCollaboration } from '../context/collaboration'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const { trip, user } = useCollaboration()
  const canWrite = !isCloudPreferenceKey(key) || !user || Boolean(trip && trip.role !== 'viewer')
  const [value, setValue] = useState<T>(() => {
    return readLocalPreference(key, initialValue)
  })
  const valueRef = useRef(value)

  useEffect(() => {
    const onPreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<LocalPreferenceChange>).detail
      if (detail?.key === key) {
        valueRef.current = detail.value as T
        setValue(detail.value as T)
      }
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey(key)) {
        const nextValue = readLocalPreference(key, initialValue)
        valueRef.current = nextValue
        setValue(nextValue)
      }
    }

    window.addEventListener(LOCAL_PREFERENCE_EVENT, onPreferenceChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LOCAL_PREFERENCE_EVENT, onPreferenceChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [initialValue, key])

  const update = useCallback((next: T | ((current: T) => T)) => {
    if (!canWrite) return
    const resolved = typeof next === 'function' ? (next as (value: T) => T)(valueRef.current) : next
    valueRef.current = resolved
    setValue(resolved)
    writeLocalPreference(key, resolved, 'user')
  }, [canWrite, key])

  return [value, update] as const
}

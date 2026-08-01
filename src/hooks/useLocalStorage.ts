import { useCallback, useState } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = window.localStorage.getItem(`banff-2026:${key}`)
      return saved ? (JSON.parse(saved) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const update = useCallback((next: T | ((current: T) => T)) => {
    setValue((current) => {
      const resolved = typeof next === 'function' ? (next as (value: T) => T)(current) : next
      window.localStorage.setItem(`banff-2026:${key}`, JSON.stringify(resolved))
      return resolved
    })
  }, [key])

  return [value, update] as const
}

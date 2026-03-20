import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'matrix-web-developer-mode'

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  }
  catch {
    return false
  }
}

const listeners = new Set<() => void>()

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function notify(): void {
  for (const cb of listeners) cb()
}

export function useDeveloperMode(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, getSnapshot)

  const setEnabled = useCallback((value: boolean) => {
    try {
      if (value)
        localStorage.setItem(STORAGE_KEY, 'true')
      else
        localStorage.removeItem(STORAGE_KEY)
    }
    catch {
      // localStorage unavailable
    }
    notify()
  }, [])

  return [enabled, setEnabled]
}

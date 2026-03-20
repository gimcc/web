import { useCallback, useSyncExternalStore } from 'react'

export type MessageLayout = 'bubble' | 'compact' | 'modern'

const STORAGE_KEY = 'matrix-web-message-layout'

function getLayout(): MessageLayout {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'compact' || stored === 'modern') return stored
  } catch {
    // localStorage unavailable
  }
  return 'bubble'
}

let currentLayout = getLayout()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): MessageLayout {
  return currentLayout
}

export function useLayoutPreference(): {
  layout: MessageLayout
  setLayout: (layout: MessageLayout) => void
} {
  const layout = useSyncExternalStore(subscribe, getSnapshot)

  const setLayout = useCallback((newLayout: MessageLayout) => {
    currentLayout = newLayout
    try {
      localStorage.setItem(STORAGE_KEY, newLayout)
    } catch {
      // localStorage unavailable
    }
    for (const listener of listeners) listener()
  }, [])

  return { layout, setLayout }
}

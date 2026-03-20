import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'matrix-web:recent-emojis'
const MAX_RECENT = 32

let cached: string[] | null = null
const listeners = new Set<() => void>()

function getSnapshot(): string[] {
  if (!cached) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      cached = raw ? JSON.parse(raw) : []
    }
    catch {
      cached = []
    }
  }
  return cached!
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(): void {
  for (const l of listeners) l()
}

export function addRecentEmoji(emoji: string): void {
  const current = getSnapshot()
  const filtered = current.filter(e => e !== emoji)
  cached = [emoji, ...filtered].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
  }
  catch { /* localStorage full or unavailable */ }
  notify()
}

export function useRecentEmojis(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => [])
}

export function useAddRecentEmoji(): (emoji: string) => void {
  return useCallback((emoji: string) => addRecentEmoji(emoji), [])
}

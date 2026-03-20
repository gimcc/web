import { useCallback, useSyncExternalStore } from 'react'

export type SendKey = 'enter' | 'cmd-enter'

const STORAGE_KEY = 'matrix-web-send-key'

function getSendKey(): SendKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'cmd-enter')
      return stored
  }
  catch {
    // localStorage unavailable
  }
  return 'enter'
}

let currentSendKey = getSendKey()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): SendKey {
  return currentSendKey
}

export function useSendKey(): {
  sendKey: SendKey
  setSendKey: (key: SendKey) => void
} {
  const sendKey = useSyncExternalStore(subscribe, getSnapshot)

  const setSendKey = useCallback((newKey: SendKey) => {
    currentSendKey = newKey
    try {
      localStorage.setItem(STORAGE_KEY, newKey)
    }
    catch {
      // localStorage unavailable
    }
    for (const listener of listeners) listener()
  }, [])

  return { sendKey, setSendKey }
}

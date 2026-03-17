import { useEffect, useRef } from 'react'

const DEFAULT_TIMEOUT = 300_000 // 5 minutes
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'touchstart', 'scroll'] as const

export function useIdleDetector(
  onIdle: () => void,
  onActive: () => void,
  timeout: number = DEFAULT_TIMEOUT,
): void {
  const isIdleRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    // timeout <= 0 means disabled
    if (timeout <= 0)
      return

    function resetTimer(): void {
      if (isIdleRef.current) {
        isIdleRef.current = false
        onActive()
      }

      if (timerRef.current)
        clearTimeout(timerRef.current)

      timerRef.current = setTimeout(() => {
        isIdleRef.current = true
        onIdle()
      }, timeout)
    }

    // Start initial timer
    resetTimer()

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true })
    }

    return () => {
      if (timerRef.current)
        clearTimeout(timerRef.current)

      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer)
      }
    }
  }, [onIdle, onActive, timeout])
}

import { Calendar } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface JumpToDateProps {
  onJumpToDate: (timestamp: number) => void
}

export function JumpToDate({ onJumpToDate }: JumpToDateProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value)
    if (!Number.isNaN(date.getTime())) {
      // Jump to start of the selected day
      date.setHours(0, 0, 0, 0)
      onJumpToDate(date.getTime())
      setOpen(false)
    }
  }, [onJumpToDate])

  const handleToggle = useCallback(() => {
    setOpen(v => {
      if (!v) {
        // Focus the date input after it renders
        setTimeout(() => inputRef.current?.showPicker(), 0)
      }
      return !v
    })
  }, [])

  // Format today's date as max value
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={t('jump_to_date.title')}
        title={t('jump_to_date.title')}
      >
        <Calendar className="h-4 w-4" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-label={t('common.close')}
          />
          <div className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-border bg-background p-3 shadow-lg">
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              {t('jump_to_date.label')}
            </label>
            <input
              ref={inputRef}
              type="date"
              max={today}
              onChange={handleDateChange}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
        </>
      )}
    </div>
  )
}

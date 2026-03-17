import { createDirectRoom, useRoomsStore } from '@matrix-web/matrix-client'
import { Loader2, MessageSquarePlus, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface NewDirectChatDialogProps {
  open: boolean
  onClose: () => void
}

const USER_ID_REGEX = /^@[^:]+:.+$/

export function NewDirectChatDialog({ open, onClose }: NewDirectChatDialogProps) {
  const [userId, setUserId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const inputRef = useRef<HTMLInputElement>(null)
  const openRef = useRef(open)

  useEffect(() => {
    openRef.current = open
  }, [open])

  const handleClose = useCallback(() => {
    setUserId('')
    setError(null)
    setLoading(false)
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(async () => {
    const trimmed = userId.trim()
    if (!trimmed) {
      setError('Please enter a user ID')
      return
    }

    if (!USER_ID_REGEX.test(trimmed)) {
      setError('Invalid user ID format. Expected: @user:server.com')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const roomId = await createDirectRoom(trimmed)
      // Guard: ignore result if dialog was closed during the request
      if (!openRef.current)
        return
      setActiveRoom(roomId)
      handleClose()
    }
    catch (err) {
      if (!openRef.current)
        return
      setError(err instanceof Error ? err.message : 'Failed to create direct chat')
    }
    finally {
      setLoading(false)
    }
  }, [userId, setActiveRoom, handleClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === 'Escape') {
        handleClose()
      }
    },
    [handleSubmit, handleClose, loading],
  )

  if (!open)
    return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-label="Close dialog"
      />

      {/* Dialog */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">New Direct Chat</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-muted-foreground" htmlFor="dm-user-id">
            Enter the Matrix user ID you want to chat with
          </label>
          <Input
            ref={inputRef}
            id="dm-user-id"
            placeholder="@user:server.com"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value)
              if (error)
                setError(null)
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoFocus
            className={cn(error && 'border-destructive')}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !userId.trim()}
          >
            {loading
              ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                )
              : (
                  'Start Chat'
                )}
          </Button>
        </div>
      </div>
    </div>
  )
}

import { getMatrixClient, useCryptoStore } from '@matrix-web/matrix-client'
import { useCallback, useState } from 'react'
import { Button } from '../ui/button'

type SetupPhase = 'idle' | 'creating' | 'restoring' | 'error'

export function KeyBackupSetup() {
  const { keyBackupEnabled, keyBackupProgress } = useCryptoStore()
  const [phase, setPhase] = useState<SetupPhase>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleCreateBackup = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto)
      return

    setPhase('creating')
    setError(null)

    try {
      await crypto.resetKeyBackup()
      setPhase('idle')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup')
      setPhase('error')
    }
  }, [])

  const handleRestoreBackup = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto)
      return

    setPhase('restoring')
    setError(null)

    try {
      const info = await crypto.checkKeyBackupAndEnable()
      if (info) {
        setPhase('idle')
      }
      else {
        setError('No backup found on server')
        setPhase('error')
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup')
      setPhase('error')
    }
  }, [])

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Key Backup</h3>
        <p className="text-xs text-muted-foreground">
          {keyBackupEnabled
            ? 'Key backup is enabled. Your encryption keys are safely backed up.'
            : 'Key backup is not configured. Set up backup to avoid losing encrypted messages.'}
        </p>
      </div>

      {keyBackupProgress && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.round((keyBackupProgress.current / keyBackupProgress.total) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Backing up keys:
            {' '}
            {keyBackupProgress.current}
            {' '}
            /
            {' '}
            {keyBackupProgress.total}
          </p>
        </div>
      )}

      {phase === 'error' && error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        {!keyBackupEnabled && (
          <Button
            size="sm"
            onClick={handleCreateBackup}
            disabled={phase === 'creating' || phase === 'restoring'}
          >
            {phase === 'creating' ? 'Creating...' : 'Set Up Backup'}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleRestoreBackup}
          disabled={phase === 'creating' || phase === 'restoring'}
        >
          {phase === 'restoring' ? 'Restoring...' : 'Restore from Backup'}
        </Button>
      </div>
    </div>
  )
}

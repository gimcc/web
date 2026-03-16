import type { ReactNode } from 'react'
import { useAuthStore } from '@matrix-web/matrix-client'
import { Navigate } from 'react-router'

export function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isRestoring = useAuthStore(s => s.isRestoring)

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

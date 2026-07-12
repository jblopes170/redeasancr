import type { ReactNode } from 'react'
import { Navigate } from '@tanstack/react-router'

import { useAuth } from '@/providers/auth-provider'
import type { UserRole } from '@/types/domain'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children: ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { loading, profile, session } = useAuth()

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
  }

  if (!session) {
    return <Navigate to="/login" />
  }

  if (!profile?.active) {
    return <div className="p-6 text-sm text-destructive">Seu acesso está desativado.</div>
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />
  }

  return children
}

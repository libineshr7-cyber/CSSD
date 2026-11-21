import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { NavModule } from '../../types/database'

interface PermissionGateProps {
  module: NavModule
  action?: 'view' | 'create' | 'edit' | 'delete'
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Conditionally renders UI actions (e.g. "Create Invoice", "Delete Client")
 * based on the active administrator's configurable role permissions.
 */
export default function PermissionGate({
  module,
  action = 'view',
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission } = useAuth()

  if (hasPermission(module, action)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

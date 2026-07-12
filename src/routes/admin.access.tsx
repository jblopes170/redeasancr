import { createFileRoute } from '@tanstack/react-router'

import { AccessManager } from '@/components/access-manager'
import { AdminLayout } from '@/components/admin-layout'
import { ProtectedRoute } from '@/components/protected-route'

export const Route = createFileRoute('/admin/access')({
  component: AccessPage,
})

function AccessPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout title="Gerenciamento de Acessos">
        <AccessManager canEdit />
      </AdminLayout>
    </ProtectedRoute>
  )
}

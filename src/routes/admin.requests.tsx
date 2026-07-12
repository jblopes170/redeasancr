import { createFileRoute } from '@tanstack/react-router'

import { AdminLayout } from '@/components/admin-layout'
import { ProtectedRoute } from '@/components/protected-route'
import { RequestManagement } from '@/components/request-management'

export const Route = createFileRoute('/admin/requests')({
  component: AdminRequestsPage,
})

function AdminRequestsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout title="Inscrições e atendimento">
        <RequestManagement />
      </AdminLayout>
    </ProtectedRoute>
  )
}

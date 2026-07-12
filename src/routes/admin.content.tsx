import { createFileRoute } from '@tanstack/react-router'

import { AdminLayout } from '@/components/admin-layout'
import { ContentManager } from '@/components/content-manager'
import { ProtectedRoute } from '@/components/protected-route'

export const Route = createFileRoute('/admin/content')({
  component: AdminContentPage,
})

function AdminContentPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout title="Notícias e publicações">
        <ContentManager />
      </AdminLayout>
    </ProtectedRoute>
  )
}

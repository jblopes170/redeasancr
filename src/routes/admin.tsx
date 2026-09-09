import { ProtectedRoute } from '@/components/protected-route'
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  component: AdminRouteLayout,
})

function AdminRouteLayout() {
  return <ProtectedRoute allowedRoles={['admin', 'judge']}><Outlet /></ProtectedRoute>
}

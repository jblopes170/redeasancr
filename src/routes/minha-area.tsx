import { createFileRoute } from '@tanstack/react-router'

import { MemberPortal } from '@/components/member-portal'
import { MemberLayout } from '@/components/member-layout'
import { ProtectedRoute } from '@/components/protected-route'

export const Route = createFileRoute('/minha-area')({
  component: MemberAreaPage,
})

function MemberAreaPage() {
  return (
    <ProtectedRoute allowedRoles={['user', 'admin', 'judge']}>
      <MemberLayout><MemberPortal /></MemberLayout>
    </ProtectedRoute>
  )
}

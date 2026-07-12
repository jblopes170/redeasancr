import { createFileRoute } from '@tanstack/react-router'

import { MemberPortal } from '@/components/member-portal'
import { ProtectedRoute } from '@/components/protected-route'
import { SiteHeader } from '@/components/site-header'

export const Route = createFileRoute('/minha-area')({
  component: MemberAreaPage,
})

function MemberAreaPage() {
  return (
    <ProtectedRoute allowedRoles={['user', 'admin', 'judge']}>
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <MemberPortal />
        </main>
      </div>
    </ProtectedRoute>
  )
}

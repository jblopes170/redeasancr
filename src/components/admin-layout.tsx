import { Link, useLocation } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { ChevronRight, Menu, Sparkles } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { PageHeading } from '@/components/page-heading'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { adminNavigation, isNavigationActive, managementNavigation } from '@/lib/navigation'
import { useAuth } from '@/providers/auth-provider'

function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth()
  const location = useLocation()
  const isAdmin = profile?.role === 'admin'
  const primaryItems = adminNavigation.filter((item) => !('adminOnly' in item) || isAdmin)
  const managementItems = isAdmin ? managementNavigation : []

  return (
    <nav className="admin-sidebar-nav" aria-label="Módulos administrativos">
      <div className="admin-sidebar-section">
        <p>Operação</p>
        {primaryItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={isNavigationActive(location.pathname, item.to) ? 'page' : undefined}
            className={`admin-sidebar-link ${'live' in item ? 'admin-sidebar-link-live' : ''}`}
          >
            <item.icon aria-hidden="true" className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
      {managementItems.length > 0 && (
        <div className="admin-sidebar-section">
          <p>Gestão</p>
          {managementItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              aria-current={isNavigationActive(location.pathname, item.to) ? 'page' : undefined}
              className="admin-sidebar-link"
            >
              <item.icon aria-hidden="true" className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

export function AdminLayout({ title, children, eventId, description, actions }: { title: string; children: ReactNode; eventId?: string; description?: string; actions?: ReactNode }) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const mobileNavigation = (
    <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir módulos administrativos">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="admin-nav-sheet">
        <SheetHeader>
          <SheetTitle>Organização NTMR</SheetTitle>
          <SheetDescription>Eventos, inscrições, notas, ranking e financeiro.</SheetDescription>
        </SheetHeader>
        <AdminNavigation onNavigate={() => setMobileNavigationOpen(false)} />
      </SheetContent>
    </Sheet>
  )

  return <div className="workspace-shell admin-workspace"><AppHeader scope="admin" navigationSlot={mobileNavigation} />
    <div className="admin-shell-grid">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-sticky">
          <div className="admin-sidebar-kicker"><Sparkles className="h-3.5 w-3.5" />Painel executivo</div>
          <AdminNavigation />
        </div>
      </aside>
      <main id="main-content" className="admin-main workspace-content">
        <nav aria-label="Caminho da página" className="breadcrumbs"><Link to="/admin">Organização</Link><ChevronRight className="h-3.5 w-3.5" />{eventId && <><Link to="/admin/eventos">Eventos</Link><ChevronRight className="h-3.5 w-3.5" /></>}<span aria-current="page">{title}</span></nav>
        <PageHeading title={title} description={description} actions={actions} />{children}
      </main>
    </div>
  </div>
}

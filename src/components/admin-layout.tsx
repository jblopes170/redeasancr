import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { PageHeading } from '@/components/page-heading'

export function AdminLayout({ title, children, eventId, description, actions }: { title: string; children: ReactNode; eventId?: string; description?: string; actions?: ReactNode }) {
  return <div className="workspace-shell"><AppHeader scope="admin" /><main id="main-content" className="page-container workspace-content">
    <nav aria-label="Caminho da página" className="breadcrumbs"><Link to="/admin">Organização</Link><ChevronRight className="h-3.5 w-3.5" />{eventId && <><Link to="/admin/eventos">Eventos</Link><ChevronRight className="h-3.5 w-3.5" /></>}<span aria-current="page">{title}</span></nav>
    <PageHeading title={title} description={description} actions={actions} />{children}
  </main></div>
}

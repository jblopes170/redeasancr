import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ClipboardCheck, Home, LayoutDashboard, Newspaper, UsersRound } from 'lucide-react'

import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'

interface AdminLayoutProps {
  title: string
  children: ReactNode
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  const { profile } = useAuth()

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/15 bg-card/90 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div>
            <h1 className="text-3xl font-semibold text-primary">{title}</h1>
            <p className="text-sm text-muted-foreground">Painel administrativo do campeonato</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Site
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Eventos
              </Link>
            </Button>
            {profile?.role === 'admin' && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/requests">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Inscrições
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/content">
                    <Newspaper className="mr-2 h-4 w-4" />
                    Publicações
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/access">
                    <UsersRound className="mr-2 h-4 w-4" />
                    Acessos
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}

import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ClipboardCheck, Home, LayoutDashboard, Newspaper, UsersRound } from 'lucide-react'

import heroImage from '@/assets/hero-reining.webp'
import { HorseTrail } from '@/components/horse-trail'
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
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="relative mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <img src={heroImage} alt="" className="absolute inset-y-0 right-0 hidden h-full w-96 object-cover opacity-15 md:block" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-white via-white/95 to-white/40 md:block" />
          <HorseTrail className="opacity-20" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-headline-md text-primary">{title}</h1>
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
                      Inscricoes
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/content">
                      <Newspaper className="mr-2 h-4 w-4" />
                      Publicacoes
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
        </div>        {children}
      </main>
    </div>
  )
}


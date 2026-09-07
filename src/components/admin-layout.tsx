import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ExternalLink, LogOut } from 'lucide-react'

import { AppQuickNav } from '@/components/app-quick-nav'
import { Button } from '@/components/ui/button'
import { ntmrLogoPath } from '@/lib/brand-assets'
import { useAuth } from '@/providers/auth-provider'

interface AdminLayoutProps {
  title: string
  children: ReactNode
  eventId?: string
}

export function AdminLayout({ title, children, eventId }: AdminLayoutProps) {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#17100e]/95 text-white shadow-[0_10px_32px_rgba(32,12,7,0.25)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/admin" className="flex shrink-0 items-center gap-3" aria-label="Ir para o painel administrativo">
            <img src={ntmrLogoPath} alt="Logo NTMR" className="h-12 w-12 object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,.35)]" />
            <div className="hidden sm:block">
              <p className="font-serif text-2xl font-semibold leading-none">NTMR</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">Administração</p>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex"><AppQuickNav eventId={eventId} tone="dark" /></div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="hidden text-white/70 hover:bg-white/10 hover:text-white xl:inline-flex"><Link to="/"><ExternalLink className="h-4 w-4" />Ver site</Link></Button>
            <span className="hidden max-w-32 truncate text-xs text-white/55 2xl:block">{profile?.name ?? profile?.email}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void signOut()}
              className="text-white hover:bg-white/10 hover:text-white"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 px-3 py-1.5 lg:hidden">
          <AppQuickNav eventId={eventId} tone="dark" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-7 border-b border-border pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Administração NTMR</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}

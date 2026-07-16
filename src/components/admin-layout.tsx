import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'

import { AppQuickNav } from '@/components/app-quick-nav'
import { RoleBadge } from '@/components/role-badge'
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
      <header className="sticky top-0 z-50 border-b border-white/15 bg-primary text-white shadow-[0_8px_28px_rgba(65,0,0,0.18)]">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/admin" className="flex shrink-0 items-center gap-3" aria-label="Ir para o painel administrativo">
            <img src={ntmrLogoPath} alt="Logo NTMR" className="h-11 w-11 rounded border border-white/30 bg-white object-contain" />
            <div className="hidden sm:block">
              <p className="font-serif text-2xl font-semibold italic leading-none">NTMR</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">Administração</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 border border-white/20 px-3 py-2 xl:flex">
              <ShieldCheck className="h-4 w-4 text-white/70" />
              <span className="max-w-44 truncate text-sm">{profile?.name ?? profile?.email}</span>
              {profile && <RoleBadge role={profile.role} />}
            </div>
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

        <div className="border-t border-white/10 px-3 py-1.5 sm:px-4">
          <AppQuickNav eventId={eventId} tone="dark" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-8 flex flex-col gap-3 border-b border-outline/20 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Administração NTMR</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{title}</h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">Eventos, inscrições, prova, resultados e financeiro organizados por fluxo de trabalho.</p>
        </header>
        {children}
      </main>
    </div>
  )
}

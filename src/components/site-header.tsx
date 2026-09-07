import { Link } from '@tanstack/react-router'
import { CalendarDays, Home, LogOut, Newspaper, Trophy, UserCircle, UserPlus } from 'lucide-react'

import { AppQuickNav } from '@/components/app-quick-nav'
import { RoleBadge } from '@/components/role-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ntmrLogoPath } from '@/lib/brand-assets'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

export function SiteHeader() {
  const { session, profile, signOut } = useAuth()
  const panelRoute = profile?.role === 'user'
    ? '/minha-area'
    : profile?.role === 'admin' || profile?.role === 'judge'
      ? '/admin/live'
      : '/admin'

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#17100e]/95 text-white backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 lg:pr-24">
        <div className="flex min-h-[68px] items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label="Ir para o início">
            <img src={ntmrLogoPath} alt="Logo NTMR" className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,.35)]" />
            <div className="min-w-0">
              <p className="hidden truncate text-[9px] font-bold uppercase tracking-[0.14em] text-white/55 sm:block">Núcleo Triângulo Mineiro de Rédeas</p>
              <p className="truncate font-serif text-2xl font-semibold leading-none text-white">NTMR</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {session && profile ? (
              <>
                <div className="hidden items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 xl:flex">
                  <span className="max-w-44 truncate text-sm">{profile.name ?? profile.email}</span>
                  <RoleBadge role={profile.role} />
                </div>
                <Button asChild size="sm" className="bg-white text-primary hover:bg-white/90">
                  <Link to={panelRoute}><UserCircle className="h-4 w-4" /><span className="hidden sm:inline">Meu painel</span></Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => void signOut()} className="text-white hover:bg-white/10 hover:text-white" aria-label="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
                <Link to="/login"><UserPlus className="h-4 w-4" />Entrar</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 px-0 py-1.5 lg:hidden">
          <AppQuickNav tone="dark" />
        </div>

        {!isSupabaseConfigured && <Badge variant="destructive" className="mb-2">Configure o Supabase para habilitar o login</Badge>}
      </div>

      <nav className="fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-2 rounded-full border border-white/15 bg-[#17100e]/80 p-2 shadow-[0_16px_50px_rgba(0,0,0,.3)] backdrop-blur-xl lg:flex" aria-label="Atalhos do site">
        <Link to="/" className="floating-nav-item" aria-label="Início"><Home className="h-5 w-5" /><span>Início</span></Link>
        <Link to="/" hash="calendario" className="floating-nav-item" aria-label="Eventos"><CalendarDays className="h-5 w-5" /><span>Eventos</span></Link>
        <Link to="/ranking" className="floating-nav-item" aria-label="Ranking"><Trophy className="h-5 w-5" /><span>Ranking</span></Link>
        <Link to="/" hash="noticias" className="floating-nav-item" aria-label="Notícias"><Newspaper className="h-5 w-5" /><span>Notícias</span></Link>
        <Link to={session ? panelRoute : '/login'} className="floating-nav-item floating-nav-item--accent" aria-label={session ? 'Meu painel' : 'Entrar'}><UserCircle className="h-5 w-5" /><span>{session ? 'Meu painel' : 'Entrar'}</span></Link>
      </nav>
    </header>
  )
}

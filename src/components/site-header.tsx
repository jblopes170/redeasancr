import { Link } from '@tanstack/react-router'
import { ChevronDown, LogOut, Radio, Settings, Trophy, UserCircle, UserPlus } from 'lucide-react'

import { AppQuickNav } from '@/components/app-quick-nav'
import { RoleBadge } from '@/components/role-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label="Ir para o início">
            <img src={ntmrLogoPath} alt="Logo NTMR" className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,.35)]" />
            <div className="min-w-0">
              <p className="hidden truncate text-[9px] font-bold uppercase tracking-[0.14em] text-white/55 sm:block">Núcleo Triângulo Mineiro de Rédeas</p>
              <p className="truncate font-serif text-2xl font-semibold leading-none text-white">NTMR</p>
            </div>
          </Link>

          <nav className="hidden items-center justify-center gap-1 lg:flex" aria-label="Navegação pública">
            <Link to="/" className="public-nav-link">Início</Link>
            <Link to="/" hash="calendario" className="public-nav-link">Eventos</Link>
            <Link to="/ranking" className="public-nav-link">Ranking</Link>
            <Link to="/" hash="noticias" className="public-nav-link">Notícias</Link>
            <Link to="/" hash="como-funciona" className="public-nav-link">Como funciona</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {session && profile ? (
              <>
                <Button asChild size="sm" className="bg-white text-primary hover:bg-white/90">
                  <Link to={panelRoute}><UserCircle className="h-4 w-4" /><span className="hidden sm:inline">Meu painel</span></Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="max-w-52 gap-2 px-2 text-white hover:bg-white/10 hover:text-white">
                      <span className="hidden max-w-32 truncate text-xs xl:inline">{profile.name ?? profile.email}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2">
                    <DropdownMenuLabel className="space-y-1">
                      <span className="block truncate">{profile.name ?? profile.email}</span>
                      <RoleBadge role={profile.role} />
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(profile.role === 'admin' || profile.role === 'judge') && (
                      <DropdownMenuItem asChild><Link to="/admin/live"><Radio className="mr-2 h-4 w-4" />Notas ao vivo</Link></DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild><Link to={panelRoute}><Settings className="mr-2 h-4 w-4" />Abrir meu painel</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/ranking"><Trophy className="mr-2 h-4 w-4" />Ranking ao vivo</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
    </header>
  )
}

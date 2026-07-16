import { Link } from '@tanstack/react-router'
import { LogOut, Trophy, UserCircle, UserPlus } from 'lucide-react'

import { RoleBadge } from '@/components/role-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ntmrLogoPath } from '@/lib/brand-assets'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

const navClass = 'whitespace-nowrap border-b-2 border-transparent px-1 py-3 text-sm font-semibold text-muted-foreground transition hover:border-secondary hover:text-foreground'

export function SiteHeader() {
  const { session, profile, signOut } = useAuth()
  const panelRoute = profile?.role === 'user' ? '/minha-area' : '/admin'

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Ir para o início">
            <img src={ntmrLogoPath} alt="Logo NTMR" className="h-11 w-11 shrink-0 rounded-md border bg-white object-contain" />
            <div className="min-w-0">
              <p className="hidden truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:block">Núcleo Triângulo Mineiro de Rédeas</p>
              <p className="truncate font-serif text-2xl font-bold leading-none text-foreground">NTMR</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {session && profile ? (
              <>
                <div className="hidden items-center gap-2 border px-3 py-2 lg:flex">
                  <span className="max-w-52 truncate text-sm">{profile.name ?? profile.email}</span>
                  <RoleBadge role={profile.role} />
                </div>
                <Button asChild size="sm">
                  <Link to={panelRoute}>
                    <UserCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Meu painel</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/ranking"><Trophy className="h-4 w-4" />Ranking</Link>
                </Button>
                <Button size="sm" asChild><Link to="/login"><UserPlus className="h-4 w-4" />Entrar</Link></Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t">
          <nav className="flex min-w-0 gap-5 overflow-x-auto" aria-label="Navegação principal">
            <Link to="/" hash="inicio" className={navClass}>Início</Link>
            <Link to="/" hash="calendario" className={navClass}>Eventos</Link>
            <Link to="/ranking" className={navClass}>Classificação</Link>
            <Link to="/" hash="noticias" className={navClass}>Notícias</Link>
            <Link to="/" hash="como-funciona" className={navClass}>Como funciona</Link>
          </nav>
          <span className="hidden whitespace-nowrap text-xs font-semibold text-muted-foreground md:block">Vinculado à ANCR</span>
        </div>

        {!isSupabaseConfigured && <Badge variant="destructive" className="mb-2">Configure o Supabase para habilitar o login</Badge>}
      </div>
    </header>
  )
}

import { Link } from '@tanstack/react-router'
import { LogOut, Shield, Trophy, UserCircle, UserPlus } from 'lucide-react'

import { AppQuickNav } from '@/components/app-quick-nav'
import { RoleBadge } from '@/components/role-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ntmrLogoPath } from '@/lib/brand-assets'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

export function SiteHeader() {
  const { session, profile, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src={ntmrLogoPath}
              alt="Logo NTMR"
              className="h-14 w-14 rounded-xl border border-gray-200 bg-white object-cover shadow-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Núcleo Triângulo Mineiro de Rédeas
              </p>
              <p className="truncate font-serif text-3xl font-bold leading-none tracking-tight text-foreground">Ranking NTMR</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {session && profile ? (
              <>
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                  <Shield className="h-4 w-4 shrink-0 text-primary" />
                  <span className="max-w-[220px] truncate text-sm">{profile.name ?? profile.email}</span>
                  <RoleBadge role={profile.role} />
                </div>
                {(profile.role === 'admin' || profile.role === 'judge') && (
                  <Button asChild>
                    <Link to="/admin">Painel</Link>
                  </Button>
                )}
                {profile.role === 'user' && (
                  <Button asChild>
                    <Link to="/minha-area">
                      <UserCircle className="mr-2 h-4 w-4" />
                      Minha área
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link to="/ranking">
                    <Trophy className="mr-2 h-4 w-4" />
                    Ranking
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/login">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Entrar
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-secondary">
            <Link to="/" hash="inicio" className="rounded-lg px-3 py-2 font-semibold transition-colors hover:text-primary">
              Início
            </Link>
            <Link to="/" hash="calendario" className="rounded-lg px-3 py-2 font-semibold transition-colors hover:text-primary">
              Eventos
            </Link>
            <Link to="/" hash="noticias" className="rounded-lg px-3 py-2 font-semibold transition-colors hover:text-primary">
              Notícias
            </Link>
            <Link to="/ranking" className="rounded-lg px-3 py-2 font-semibold transition-colors hover:text-primary">
              Ranking
            </Link>
            <Link to="/" hash="como-funciona" className="rounded-lg px-3 py-2 font-semibold transition-colors hover:text-primary">
              Como funciona
            </Link>
          </nav>

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-muted-foreground shadow-sm">
            Vinculado à ANCR
          </div>
        </div>

        <AppQuickNav />

        {!isSupabaseConfigured && (
          <Badge variant="destructive" className="w-fit bg-destructive text-destructive-foreground">
            Configure o .env do Supabase para habilitar login
          </Badge>
        )}
      </div>
    </header>
  )
}

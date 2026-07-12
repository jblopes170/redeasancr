import { Link } from '@tanstack/react-router'
import { LogOut, Shield, Trophy, UserCircle, UserPlus } from 'lucide-react'

import ntmrLogo from '@/assets/ntmr-logo.jpg'
import { RoleBadge } from '@/components/role-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

export function SiteHeader() {
  const { session, profile, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src={ntmrLogo} alt="Logo NTMR" className="h-12 w-12 rounded-md border border-border object-cover" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Núcleo Triângulo Mineiro de Rédeas
              </p>
              <p className="truncate text-2xl font-bold tracking-tight text-foreground">Ranking NTMR</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {session && profile ? (
              <>
                <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/35 px-3 py-2">
                  <Shield className="h-4 w-4 shrink-0 text-primary" />
                  <span className="max-w-[220px] truncate text-sm">{profile.name ?? profile.email}</span>
                  <RoleBadge role={profile.role} />
                </div>
                {(profile.role === 'admin' || profile.role === 'judge') && (
                  <Button variant="secondary" asChild>
                    <Link to="/admin">Painel</Link>
                  </Button>
                )}
                {profile.role === 'user' && (
                  <Button variant="secondary" asChild>
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
                    Entrar / Cadastrar
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-2">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-foreground">
            <Link to="/" hash="inicio" className="rounded-md px-3 py-1.5 font-semibold hover:bg-muted/70">
              Início
            </Link>
            <Link to="/" hash="calendario" className="rounded-md px-3 py-1.5 font-semibold hover:bg-muted/70">
              Eventos
            </Link>
            <Link to="/" hash="noticias" className="rounded-md px-3 py-1.5 font-semibold hover:bg-muted/70">
              Notícias
            </Link>
            <Link to="/ranking" className="rounded-md px-3 py-1.5 font-semibold hover:bg-muted/70">
              Ranking
            </Link>
          </nav>

          <div className="rounded-md border border-border bg-muted/35 px-3 py-1 text-xs font-semibold text-muted-foreground">
            Vinculado à ANCR
          </div>
        </div>

        {!isSupabaseConfigured && (
          <Badge variant="destructive" className="w-fit bg-destructive text-destructive-foreground">
            Configure o .env do Supabase para habilitar login
          </Badge>
        )}
      </div>
    </header>
  )
}

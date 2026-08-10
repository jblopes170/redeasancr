import { Link } from '@tanstack/react-router'
import { LogOut, UserCircle, UserPlus } from 'lucide-react'

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
    <header className="sticky top-0 z-40 border-b border-border/80 bg-white/95 text-foreground shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label="Ir para o início">
            <img src={ntmrLogoPath} alt="Logo NTMR" className="h-11 w-11 shrink-0 rounded border border-border bg-white object-contain" />
            <div className="min-w-0">
              <p className="hidden truncate text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:block">Núcleo Triângulo Mineiro de Rédeas</p>
              <p className="truncate font-serif text-2xl font-semibold italic leading-none text-primary">NTMR</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {session && profile ? (
              <>
                <div className="hidden items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 xl:flex">
                  <span className="max-w-44 truncate text-sm">{profile.name ?? profile.email}</span>
                  <RoleBadge role={profile.role} />
                </div>
                <Button asChild size="sm">
                  <Link to={panelRoute}><UserCircle className="h-4 w-4" /><span className="hidden sm:inline">Meu painel</span></Link>
                </Button>
                <Button variant="outline" size="icon" onClick={() => void signOut()} aria-label="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" asChild>
                <Link to="/login"><UserPlus className="h-4 w-4" />Entrar</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-border/70 px-0 py-1.5">
          <AppQuickNav tone="light" />
        </div>

        {!isSupabaseConfigured && <Badge variant="destructive" className="mb-2">Configure o Supabase para habilitar o login</Badge>}
      </div>
    </header>
  )
}

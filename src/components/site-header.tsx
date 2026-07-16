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
  const panelRoute = profile?.role === 'user' ? '/minha-area' : '/admin'

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-primary text-white shadow-[0_8px_28px_rgba(65,0,0,0.18)]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label="Ir para o início">
            <img src={ntmrLogoPath} alt="Logo NTMR" className="h-11 w-11 shrink-0 rounded border border-white/30 bg-white object-contain" />
            <div className="min-w-0">
              <p className="hidden truncate text-[9px] font-bold uppercase tracking-[0.12em] text-white/65 sm:block">Núcleo Triângulo Mineiro de Rédeas</p>
              <p className="truncate font-serif text-2xl font-semibold italic leading-none text-white">NTMR</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {session && profile ? (
              <>
                <div className="hidden items-center gap-2 border border-white/20 px-3 py-2 xl:flex">
                  <span className="max-w-44 truncate text-sm">{profile.name ?? profile.email}</span>
                  <RoleBadge role={profile.role} />
                </div>
                <Button asChild size="sm" className="border border-white/35 bg-white text-primary hover:bg-white/90">
                  <Link to={panelRoute}><UserCircle className="h-4 w-4" /><span className="hidden sm:inline">Meu painel</span></Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => void signOut()} className="text-white hover:bg-white/10 hover:text-white" aria-label="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" asChild className="border border-white/35 bg-white text-primary hover:bg-white/90">
                <Link to="/login"><UserPlus className="h-4 w-4" />Entrar</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 px-3 py-1.5 sm:px-0">
          <AppQuickNav tone="dark" />
        </div>

        {!isSupabaseConfigured && <Badge variant="destructive" className="mb-2">Configure o Supabase para habilitar o login</Badge>}
      </div>
    </header>
  )
}

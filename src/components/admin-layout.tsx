import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  Gauge,
  KeyRound,
  LogOut,
  Settings,
  Trophy,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ntmrLogoPath } from '@/lib/brand-assets'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

interface AdminLayoutProps {
  title: string
  children: ReactNode
}

interface AdminNavItem {
  to: '/admin' | '/admin/requests' | '/admin/finance' | '/ranking' | '/admin/content' | '/admin/access'
  label: string
  icon: LucideIcon
  exact?: boolean
  hash?: string
  adminOnly?: boolean
}

const navItems: AdminNavItem[] = [
  { to: '/admin', label: 'Dashboard global', icon: Gauge, exact: true },
  { to: '/admin', label: 'Gestão de eventos', icon: CalendarDays, hash: 'admin-events' },
  { to: '/admin/requests', label: 'Solicitações de inscrição', icon: ClipboardCheck, adminOnly: true },
  { to: '/admin/finance', label: 'Financeiro e DRE', icon: WalletCards, adminOnly: true },
  { to: '/ranking', label: 'Notas e classificação', icon: Trophy },
  { to: '/admin/content', label: 'Conteúdo e notícias', icon: FileText, adminOnly: true },
  { to: '/admin/access', label: 'Controle de acesso', icon: KeyRound, adminOnly: true },
]

function AdminNavigation({ mobile = false, isAdmin }: { mobile?: boolean; isAdmin: boolean }) {
  return (
    <nav className={cn('gap-1', mobile ? 'flex overflow-x-auto pb-1' : 'grid')} aria-label="Administração">
      {navItems.filter((item) => isAdmin || !item.adminOnly).map(({ to, label, icon: Icon, exact, hash }) => (
        <Link
          key={`${to}-${label}`}
          to={to}
          hash={hash}
          activeOptions={{ exact: Boolean(exact) }}
          className={cn(
            'flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground',
            mobile && 'border bg-card px-4 py-2.5',
          )}
          activeProps={{ className: 'bg-secondary/20 text-secondary shadow-[inset_3px_0_0_hsl(var(--secondary))]' }}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden h-screen border-r bg-card lg:sticky lg:top-0 lg:flex lg:flex-col">
        <Link to="/" className="flex items-center gap-3 border-b p-6">
          <img src={ntmrLogoPath} alt="Logo NTMR" className="h-12 w-12 rounded-md border bg-white object-contain" />
          <div><p className="font-serif text-xl font-bold">NTMR Admin</p><p className="text-xs text-muted-foreground">{profile?.name ?? 'Administração'}</p></div>
        </Link>
        <div className="flex-1 overflow-y-auto p-4"><AdminNavigation isAdmin={isAdmin} /></div>
        <div className="grid gap-1 border-t p-4">
          <Link to="/admin/access" className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold hover:bg-muted"><Settings className="h-5 w-5" />Configurações</Link>
          <button type="button" onClick={() => void signOut()} className="flex items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold hover:bg-muted"><LogOut className="h-5 w-5" />Sair</button>
        </div>
      </aside>

      <section className="min-w-0">
        <div className="border-b bg-card px-4 py-4 lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 font-serif text-xl font-bold"><img src={ntmrLogoPath} alt="" className="h-9 w-9 rounded border object-contain" />NTMR Admin</Link>
            <Button variant="ghost" size="icon" onClick={() => void signOut()}><LogOut className="h-5 w-5" /></Button>
          </div>
          <AdminNavigation mobile isAdmin={isAdmin} />
        </div>

        <main className="w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <header className="mb-7 flex flex-col gap-2 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Administração NTMR</p>
              <h1 className="font-headline-md text-foreground">{title}</h1>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">Gestão do campeonato, inscrições, prova e resultados em um só lugar.</p>
          </header>
          {children}
        </main>
      </section>
    </div>
  )
}

import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  Menu,
  Newspaper,
  Radio,
  Trophy,
  UserCircle,
  UsersRound,
  WalletCards,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

interface AppQuickNavProps {
  eventId?: string
  tone?: 'light' | 'dark'
  className?: string
}

const navButtonClass = 'h-9 rounded-md px-3 text-xs font-bold uppercase tracking-[0.08em]'

function QuickMenu({
  icon: Icon,
  label,
  children,
  tone,
}: {
  icon: typeof Home
  label: string
  children: ReactNode
  tone: 'light' | 'dark'
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            navButtonClass,
            tone === 'dark'
              ? 'text-white/90 hover:bg-white/10 hover:text-white data-[state=open]:bg-white/15'
              : 'text-foreground hover:bg-muted data-[state=open]:bg-muted',
          )}
        >
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {label}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-md p-2">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppQuickNav({ eventId, tone = 'light', className }: AppQuickNavProps) {
  const { session, profile } = useAuth()
  const canUseAdmin = profile?.role === 'admin' || profile?.role === 'judge'
  const isAdmin = profile?.role === 'admin'

  return (
    <nav className={cn('min-w-0 max-w-full', className)} aria-label="Navegação principal">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className={cn(navButtonClass, tone === 'dark' ? 'text-white hover:bg-white/10 hover:text-white' : '')}
        >
          <Link to="/"><Home className="h-4 w-4" />Início</Link>
        </Button>

        {canUseAdmin && (
          <Button size="sm" asChild className="h-9 bg-secondary px-3 text-xs font-bold text-secondary-foreground hover:bg-secondary/90">
            {eventId ? (
              <Link to="/admin/events/$eventId/scores" params={{ eventId }}><Radio className="h-4 w-4" />Notas ao vivo</Link>
            ) : (
              <Link to="/admin/live"><Radio className="h-4 w-4" />Notas ao vivo</Link>
            )}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(navButtonClass, tone === 'dark' ? 'text-white hover:bg-white/10 hover:text-white' : '')}
            >
              <Menu className="h-4 w-4" />Menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2">
            <DropdownMenuLabel>Campeonato</DropdownMenuLabel>
            <DropdownMenuItem asChild><Link to="/" hash="calendario"><CalendarDays className="mr-2 h-4 w-4" />Eventos e etapas</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to={session ? '/minha-area' : '/login'}><ClipboardCheck className="mr-2 h-4 w-4" />Inscrições</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/ranking"><Trophy className="mr-2 h-4 w-4" />Ranking ao vivo</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/" hash="noticias"><Newspaper className="mr-2 h-4 w-4" />Notícias</Link></DropdownMenuItem>
            {session && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{canUseAdmin ? 'Administração' : 'Minha área'}</DropdownMenuLabel>
                <DropdownMenuItem asChild><Link to={canUseAdmin ? '/admin' : '/minha-area'}><LayoutDashboard className="mr-2 h-4 w-4" />Painel principal</Link></DropdownMenuItem>
                {isAdmin && <DropdownMenuItem asChild><Link to="/admin/finance"><WalletCards className="mr-2 h-4 w-4" />Financeiro e DRE</Link></DropdownMenuItem>}
                {isAdmin && <DropdownMenuItem asChild><Link to="/admin/access"><UsersRound className="mr-2 h-4 w-4" />Acessos</Link></DropdownMenuItem>}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="hidden items-center justify-center gap-1 lg:flex">
        {canUseAdmin ? (
          <>
            <Button variant="ghost" size="sm" asChild className={cn(navButtonClass, tone === 'dark' && 'text-white/85 hover:bg-white/10 hover:text-white')}>
              <Link to="/admin"><LayoutDashboard className="h-4 w-4" />Painel</Link>
            </Button>
            <Button size="sm" asChild className="h-9 bg-secondary px-4 text-xs font-extrabold uppercase tracking-[0.08em] text-secondary-foreground hover:bg-secondary/90">
              {eventId ? <Link to="/admin/events/$eventId/scores" params={{ eventId }}><Radio className="h-4 w-4" />Prova ao vivo</Link> : <Link to="/admin/live"><Radio className="h-4 w-4" />Prova ao vivo</Link>}
            </Button>
            <Button variant="ghost" size="sm" asChild className={cn(navButtonClass, tone === 'dark' && 'text-white/85 hover:bg-white/10 hover:text-white')}>
              <Link to="/admin" hash="admin-events"><CalendarDays className="h-4 w-4" />Eventos</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className={cn(navButtonClass, tone === 'dark' && 'text-white/85 hover:bg-white/10 hover:text-white')}>
              <Link to="/admin/requests"><ClipboardCheck className="h-4 w-4" />Inscrições</Link>
            </Button>
            <QuickMenu icon={UserCircle} label="Gestão" tone={tone}>
              <DropdownMenuLabel>Administração</DropdownMenuLabel>
              <DropdownMenuItem asChild><Link to="/ranking"><Trophy className="mr-2 h-4 w-4" />Ranking público</Link></DropdownMenuItem>
              {isAdmin && <DropdownMenuItem asChild><Link to="/admin/finance"><WalletCards className="mr-2 h-4 w-4" />Financeiro e DRE</Link></DropdownMenuItem>}
              {isAdmin && <DropdownMenuItem asChild><Link to="/admin/content"><Newspaper className="mr-2 h-4 w-4" />Publicações</Link></DropdownMenuItem>}
              {isAdmin && <DropdownMenuItem asChild><Link to="/admin/access"><UsersRound className="mr-2 h-4 w-4" />Acessos</Link></DropdownMenuItem>}
            </QuickMenu>
          </>
        ) : session ? (
          <>
            <Button variant="ghost" size="sm" asChild className={cn(navButtonClass, tone === 'dark' && 'text-white/85 hover:bg-white/10 hover:text-white')}><Link to="/minha-area" hash="resumo"><LayoutDashboard className="h-4 w-4" />Resumo</Link></Button>
            <Button size="sm" asChild className="h-9 bg-secondary px-4 text-xs font-extrabold uppercase tracking-[0.08em] text-secondary-foreground hover:bg-secondary/90"><Link to="/minha-area" hash="nova-inscricao"><ClipboardCheck className="h-4 w-4" />Nova inscrição</Link></Button>
            <Button variant="ghost" size="sm" asChild className={cn(navButtonClass, tone === 'dark' && 'text-white/85 hover:bg-white/10 hover:text-white')}><Link to="/minha-area" hash="inscricoes">Minhas inscrições</Link></Button>
            <Button variant="ghost" size="sm" asChild className={cn(navButtonClass, tone === 'dark' && 'text-white/85 hover:bg-white/10 hover:text-white')}><Link to="/ranking"><Trophy className="h-4 w-4" />Resultados</Link></Button>
          </>
        ) : null}
      </div>
    </nav>
  )
}

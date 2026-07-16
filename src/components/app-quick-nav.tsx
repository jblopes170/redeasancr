import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Home,
  LayoutDashboard,
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
            'h-10 shrink-0 justify-between gap-2 rounded px-3 text-xs font-bold uppercase tracking-[0.08em]',
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
    <nav
      className={cn('flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
      aria-label="Navegação principal"
    >
      <Button
        variant="ghost"
        size="sm"
        asChild
        className={cn(
          'h-10 shrink-0 rounded px-3 text-xs font-bold uppercase tracking-[0.08em]',
          tone === 'dark' ? 'text-white/90 hover:bg-white/10 hover:text-white' : 'text-foreground hover:bg-muted',
        )}
      >
        <Link to="/"><Home className="h-4 w-4" />Início</Link>
      </Button>

      <QuickMenu icon={CalendarDays} label="Eventos" tone={tone}>
        <DropdownMenuLabel>Competições NTMR</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link to="/" hash="calendario">Calendário e etapas</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/ranking">Resultados dos eventos</Link></DropdownMenuItem>
        {canUseAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/admin" hash="admin-events">Gerenciar eventos</Link></DropdownMenuItem>
            {eventId && <DropdownMenuItem asChild><Link to="/admin/events/$eventId" params={{ eventId }}>Painel deste evento</Link></DropdownMenuItem>}
          </>
        )}
      </QuickMenu>

      <QuickMenu icon={ClipboardCheck} label="Inscrições" tone={tone}>
        <DropdownMenuLabel>Competidores e inscrições</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link to={session ? '/minha-area' : '/login'}>{session ? 'Minha área' : 'Entrar ou criar conta'}</Link></DropdownMenuItem>
        {session && <DropdownMenuItem asChild><Link to="/minha-area" hash="nova-inscricao">Fazer nova inscrição</Link></DropdownMenuItem>}
        {eventId && canUseAdmin && <DropdownMenuItem asChild><Link to="/admin/events/$eventId" params={{ eventId }} hash="inscricoes">Inscrições deste evento</Link></DropdownMenuItem>}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/admin/requests">Aprovar solicitações</Link></DropdownMenuItem>
          </>
        )}
      </QuickMenu>

      <QuickMenu icon={Trophy} label="Ranking" tone={tone}>
        <DropdownMenuLabel>Classificação oficial</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link to="/ranking">Ranking ao vivo</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/" hash="calendario">Ranking por evento</Link></DropdownMenuItem>
      </QuickMenu>

      <QuickMenu icon={Newspaper} label="Notícias" tone={tone}>
        <DropdownMenuLabel>Central NTMR</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link to="/" hash="noticias">Últimas notícias</Link></DropdownMenuItem>
        {isAdmin && <DropdownMenuItem asChild><Link to="/admin/content">Gerenciar publicações</Link></DropdownMenuItem>}
      </QuickMenu>

      {session && (
        <QuickMenu icon={UserCircle} label={canUseAdmin ? 'Administrativo' : 'Minha área'} tone={tone}>
          {canUseAdmin ? (
            <>
              <DropdownMenuLabel>Operação do campeonato</DropdownMenuLabel>
              <DropdownMenuItem asChild><Link to="/admin"><LayoutDashboard className="mr-2 h-4 w-4" />Painel administrativo</Link></DropdownMenuItem>
              {eventId ? (
                <DropdownMenuItem asChild><Link to="/admin/events/$eventId/scores" params={{ eventId }}><Radio className="mr-2 h-4 w-4" />Lançamento ao vivo</Link></DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild><Link to="/admin" hash="admin-events"><Radio className="mr-2 h-4 w-4" />Escolher prova para notas</Link></DropdownMenuItem>
              )}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/admin/finance"><WalletCards className="mr-2 h-4 w-4" />Financeiro e DRE</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/admin/access"><UsersRound className="mr-2 h-4 w-4" />Gerenciar acessos</Link></DropdownMenuItem>
                </>
              )}
            </>
          ) : (
            <>
              <DropdownMenuLabel>Área do competidor</DropdownMenuLabel>
              <DropdownMenuItem asChild><Link to="/minha-area" hash="resumo">Resumo</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/minha-area" hash="nova-inscricao">Nova inscrição</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/minha-area" hash="inscricoes">Minhas inscrições</Link></DropdownMenuItem>
            </>
          )}
        </QuickMenu>
      )}
    </nav>
  )
}

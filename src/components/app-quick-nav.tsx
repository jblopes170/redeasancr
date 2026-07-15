import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  Newspaper,
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
import { useAuth } from '@/providers/auth-provider'

const text = {
  quick: 'Acesso r\u00e1pido',
  publicArea: '\u00c1rea p\u00fablica',
  start: 'In\u00edcio',
  news: 'Not\u00edcias',
  calendar: 'Ver calend\u00e1rio',
  publicRanking: 'Ranking p\u00fablico',
  entries: 'Inscri\u00e7\u00f5es',
  myArea: 'Minha \u00e1rea',
  approveEntries: 'Aprovar inscri\u00e7\u00f5es',
  admin: 'Administra\u00e7\u00e3o',
  operation: 'Opera\u00e7\u00e3o',
  launchScores: 'Lan\u00e7ar notas',
  posts: 'Publica\u00e7\u00f5es',
}

function QuickMenu({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Home
  label: string
  children: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 justify-between gap-2 rounded-xl bg-white px-3 shadow-sm">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {label}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 rounded-xl p-2">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppQuickNav() {
  const { session, profile } = useAuth()
  const canUseAdmin = profile?.role === 'admin' || profile?.role === 'judge'
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white/85 p-2 shadow-sm backdrop-blur">
      <span className="px-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{text.quick}</span>

      <QuickMenu icon={Home} label="Site">
        <DropdownMenuLabel>{text.publicArea}</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link to="/" hash="inicio">{text.start}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/" hash="calendario">Eventos publicados</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/" hash="noticias">{text.news}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/" hash="como-funciona">Como funciona</Link></DropdownMenuItem>
      </QuickMenu>

      <QuickMenu icon={CalendarDays} label="Eventos">
        <DropdownMenuLabel>Eventos e provas</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link to="/" hash="calendario">{text.calendar}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/ranking">{text.publicRanking}</Link></DropdownMenuItem>
        {canUseAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/admin">Gerenciar eventos</Link></DropdownMenuItem>
          </>
        )}
      </QuickMenu>

      <QuickMenu icon={ClipboardCheck} label={text.entries}>
        <DropdownMenuLabel>Competidores</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link to={session ? '/minha-area' : '/login'}>{session ? text.myArea : 'Entrar ou criar conta'}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/" hash="calendario">Escolher evento</Link></DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/admin/requests">{text.approveEntries}</Link></DropdownMenuItem>
          </>
        )}
      </QuickMenu>

      <QuickMenu icon={Trophy} label="Ranking">
        <DropdownMenuLabel>Resultados</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link to="/ranking">Ranking ao vivo</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/" hash="calendario">Ranking por evento</Link></DropdownMenuItem>
      </QuickMenu>

      {canUseAdmin && (
        <QuickMenu icon={LayoutDashboard} label={text.admin}>
          <DropdownMenuLabel>{text.operation}</DropdownMenuLabel>
          <DropdownMenuItem asChild><Link to="/admin">Painel</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/admin">{text.launchScores}</Link></DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/admin/finance"><WalletCards className="mr-2 h-4 w-4" />Financeiro e DRE</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/admin/content"><Newspaper className="mr-2 h-4 w-4" />{text.posts}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/admin/access"><UsersRound className="mr-2 h-4 w-4" />Acessos</Link></DropdownMenuItem>
            </>
          )}
        </QuickMenu>
      )}

      {!canUseAdmin && session && (
        <Button asChild size="sm" className="h-10 rounded-xl">
          <Link to="/minha-area">
            <UserCircle className="mr-2 h-4 w-4" />
            {text.myArea}
          </Link>
        </Button>
      )}
    </div>
  )
}

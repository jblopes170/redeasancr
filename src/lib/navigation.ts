import { CalendarDays, ClipboardList, House, LayoutDashboard, LifeBuoy, Newspaper, Radio, Trophy, UsersRound, WalletCards } from 'lucide-react'

export type NavigationScope = 'public' | 'admin' | 'member'
export const publicNavigation = [
  { to: '/', label: 'Início', icon: House },
  { to: '/eventos', label: 'Eventos', icon: CalendarDays },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/noticias', label: 'Notícias', icon: Newspaper },
] as const
export const adminNavigation = [
  { to: '/admin', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/admin/eventos', label: 'Eventos', icon: CalendarDays },
  { to: '/admin/requests', label: 'Inscrições', icon: ClipboardList, adminOnly: true },
  { to: '/admin/live', label: 'Notas ao vivo', icon: Radio, live: true },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/admin/finance', label: 'Financeiro', icon: WalletCards, adminOnly: true },
] as const
export const managementNavigation = [
  { to: '/admin/content', label: 'Publicações', icon: Newspaper },
  { to: '/admin/access', label: 'Acessos e permissões', icon: UsersRound },
] as const
export const memberSections = [
  { id: 'summary', hash: 'resumo', label: 'Meu resumo', icon: LayoutDashboard },
  { id: 'new', hash: 'nova-inscricao', label: 'Nova inscrição', icon: CalendarDays },
  { id: 'registrations', hash: 'inscricoes', label: 'Inscrições e pagamentos', icon: ClipboardList },
  { id: 'results', hash: 'resultados', label: 'Resultados', icon: Trophy },
  { id: 'suggestions', hash: 'sugestoes', label: 'Suporte', icon: LifeBuoy },
] as const
export function isNavigationActive(pathname: string, to: string) {
  if (to === '/admin') return pathname === '/admin' || pathname === '/admin/'
  if (to === '/admin/live') return pathname === to || /^\/admin\/events\/[^/]+\/scores\/?$/.test(pathname)
  if (to === '/admin/eventos') return pathname === to || (/^\/admin\/events\//.test(pathname) && !pathname.endsWith('/scores'))
  if (to === '/eventos') return pathname === to || pathname.startsWith('/events/')
  return pathname === to
}

export function getMemberSection(hash: string) {
  return memberSections.find(item => item.hash === hash.replace(/^#/, '')) ?? memberSections[0]
}
export function getEventSection(hash: string) {
  const value = hash.replace(/^#/, '')
  if (value === 'inscricoes') return 'entries'
  return ['overview','categories','records','entries','finance','import-export','settings'].includes(value) ? value : 'overview'
}

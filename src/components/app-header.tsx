import { Link, useLocation } from '@tanstack/react-router'
import { ChevronDown, ExternalLink, LogOut, Menu, Settings2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ntmrLogoPath } from '@/lib/brand-assets'
import { adminNavigation, isNavigationActive, managementNavigation, memberSections, publicNavigation, type NavigationScope } from '@/lib/navigation'
import { useAuth } from '@/providers/auth-provider'

export function AppHeader({ scope = 'public' }: { scope?: NavigationScope }) {
  const { session, profile, signOut } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = profile?.role === 'admin'
  const isStaff = isAdmin || profile?.role === 'judge'
  const panelRoute = isStaff ? '/admin' : '/minha-area'
  const items = scope === 'admin' ? adminNavigation.filter((item) => !('adminOnly' in item) || isAdmin) : publicNavigation
  const memberHash = location.hash.replace(/^#/, '') || 'resumo'
  const closeMenu = () => setMobileOpen(false)
  const links = scope === 'member'
    ? memberSections.map((item) => <Link key={item.id} to="/minha-area" hash={item.hash} onClick={closeMenu} aria-current={memberHash === item.hash ? 'page' : undefined} className="app-nav-link"><item.icon aria-hidden="true" className="h-4 w-4" />{item.label}</Link>)
    : items.map((item) => <Link key={item.to} to={item.to} onClick={closeMenu} aria-current={isNavigationActive(location.pathname, item.to) ? 'page' : undefined} className={`app-nav-link ${'live' in item ? 'app-nav-live' : ''}`}><item.icon aria-hidden="true" className="h-4 w-4" />{item.label}</Link>)
  return (
    <header className="app-header">
      <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); const main = document.getElementById('main-content'); main?.setAttribute('tabindex', '-1'); main?.focus(); main?.scrollIntoView({ block: 'start' }) }}>Ir para o conteúdo</a>
      <div className="app-header-inner">
        <Link to={scope === 'admin' ? '/admin' : '/'} className="brand-link" aria-label="NTMR, início"><img src={ntmrLogoPath} alt="" className="h-11 w-11 object-contain" /><span><strong className="block font-serif text-2xl leading-none">NTMR</strong><span className="mt-1 block text-xs text-muted-foreground">{scope === 'admin' ? 'Organização' : scope === 'member' ? 'Área do competidor' : 'Rédeas'}</span></span></Link>
        <nav className="hidden min-w-0 items-center gap-1 xl:flex" aria-label="Navegação principal">{links}
          {scope === 'admin' && isAdmin && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="app-nav-link" data-active={managementNavigation.some((item) => item.to === location.pathname)}><Settings2 className="h-4 w-4" />Mais<ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{managementNavigation.map((item) => <DropdownMenuItem asChild key={item.to}><Link to={item.to}><item.icon className="mr-2 h-4 w-4" />{item.label}</Link></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}
        </nav>
        <div className="flex items-center gap-2">
          {session && profile ? <>
            {scope === 'public' && <Button asChild size="sm"><Link to={panelRoute}>Meu painel</Link></Button>}
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Abrir menu da conta" className="rounded-full"><UserRound className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel><span className="block truncate">{profile.name || profile.email}</span><span className="block text-xs font-normal text-muted-foreground">{isAdmin ? 'Administrador' : isStaff ? 'Juiz' : 'Competidor'}</span></DropdownMenuLabel><DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to={panelRoute}>Meu painel</Link></DropdownMenuItem>{isStaff && <DropdownMenuItem asChild><Link to="/admin/live">Lançar notas ao vivo</Link></DropdownMenuItem>}{scope !== 'public' && <DropdownMenuItem asChild><Link to="/"><ExternalLink className="mr-2 h-4 w-4" />Ver site público</Link></DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sair da conta</DropdownMenuItem>
            </DropdownMenuContent></DropdownMenu>
          </> : <Button asChild size="sm"><Link to="/login">Entrar</Link></Button>}
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}><DialogTrigger asChild><Button variant="outline" size="icon" className="xl:hidden" aria-label="Abrir navegação"><Menu className="h-5 w-5" /></Button></DialogTrigger><DialogContent className="max-w-md"><DialogTitle>Navegar pelo NTMR</DialogTitle><DialogDescription>{scope === 'admin' ? 'Organização do campeonato' : scope === 'member' ? 'Sua área de competidor' : 'Eventos, resultados e notícias'}</DialogDescription>
            <nav className="mobile-navigation" aria-label="Navegação principal no celular">{links}{scope === 'admin' && isAdmin && managementNavigation.map((item) => <Link key={item.to} to={item.to} onClick={closeMenu} className="app-nav-link"><item.icon className="h-4 w-4" />{item.label}</Link>)}{scope !== 'public' && <Link to="/" onClick={closeMenu} className="app-nav-link"><ExternalLink className="h-4 w-4" />Site público</Link>}</nav>
          </DialogContent></Dialog>
        </div>
      </div>
    </header>
  )
}

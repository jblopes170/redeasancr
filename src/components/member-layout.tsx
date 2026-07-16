import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { CalendarDays, ClipboardList, Home, LogOut, PlusCircle, Trophy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ntmrLogoPath } from '@/lib/brand-assets'
import { useAuth } from '@/providers/auth-provider'

export function MemberLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden h-screen border-r bg-card lg:sticky lg:top-0 lg:flex lg:flex-col">
        <Link to="/" className="flex items-center gap-3 border-b p-6">
          <img src={ntmrLogoPath} alt="Logo NTMR" className="h-12 w-12 rounded-md border bg-white object-contain" />
          <div><p className="font-serif text-xl font-bold">Competidor</p><p className="max-w-36 truncate text-xs text-muted-foreground">{profile?.name ?? profile?.email}</p></div>
        </Link>
        <nav className="grid flex-1 content-start gap-1 p-4">
          <a href="#resumo" className="member-nav-link"><Home className="h-5 w-5" />Meu painel</a>
          <a href="#nova-inscricao" className="member-nav-link"><PlusCircle className="h-5 w-5" />Nova inscrição</a>
          <a href="#inscricoes" className="member-nav-link"><ClipboardList className="h-5 w-5" />Minhas inscrições</a>
          <Link to="/" hash="calendario" className="member-nav-link"><CalendarDays className="h-5 w-5" />Eventos</Link>
          <Link to="/ranking" className="member-nav-link"><Trophy className="h-5 w-5" />Classificação</Link>
        </nav>
        <button type="button" onClick={() => void signOut()} className="member-nav-link m-4 border-t pt-5"><LogOut className="h-5 w-5" />Sair</button>
      </aside>
      <section className="min-w-0">
        <div className="flex items-center justify-between border-b bg-card p-4 lg:hidden">
          <Link to="/" className="flex items-center gap-2 font-serif text-xl font-bold"><img src={ntmrLogoPath} alt="" className="h-9 w-9 rounded border object-contain" />Minha área</Link>
          <div className="flex gap-1"><Button variant="ghost" size="icon" asChild><Link to="/ranking"><Trophy className="h-5 w-5" /></Link></Button><Button variant="ghost" size="icon" onClick={() => void signOut()}><LogOut className="h-5 w-5" /></Button></div>
        </div>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </section>
    </div>
  )
}

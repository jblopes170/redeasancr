import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { LogOut, UserCircle } from 'lucide-react'

import { AppQuickNav } from '@/components/app-quick-nav'
import { Button } from '@/components/ui/button'
import { ntmrLogoPath } from '@/lib/brand-assets'
import { useAuth } from '@/providers/auth-provider'

export function MemberLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-white/15 bg-primary text-white shadow-[0_8px_28px_rgba(65,0,0,0.18)]">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <img src={ntmrLogoPath} alt="Logo NTMR" className="h-11 w-11 rounded border border-white/30 bg-white object-contain" />
            <div className="hidden sm:block"><p className="font-serif text-2xl font-semibold italic leading-none">NTMR</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">Área do competidor</p></div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 border border-white/20 px-3 py-2 md:flex"><UserCircle className="h-4 w-4" /><span className="max-w-40 truncate text-sm">{profile?.name ?? profile?.email}</span></div>
            <Button variant="ghost" size="icon" onClick={() => void signOut()} className="text-white hover:bg-white/10 hover:text-white" aria-label="Sair"><LogOut className="h-5 w-5" /></Button>
          </div>
        </div>
        <div className="border-t border-white/10 px-3 py-1.5 sm:px-4"><AppQuickNav tone="dark" /></div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">{children}</main>
    </div>
  )
}

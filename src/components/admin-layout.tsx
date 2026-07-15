import type { ReactNode } from 'react'

import { SiteHeader } from '@/components/site-header'
import { heroReiningPath } from '@/lib/brand-assets'

interface AdminLayoutProps {
  title: string
  children: ReactNode
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <img src={heroReiningPath} alt="" className="absolute inset-y-0 right-0 hidden h-full w-80 object-cover opacity-10 md:block" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-white via-white/95 to-white/50 md:block" />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Administração NTMR</p>
            <h1 className="font-headline-md text-primary">{title}</h1>
            <p className="text-sm text-muted-foreground">Use o acesso rápido no topo para navegar entre eventos, inscrições, financeiro, publicações e acessos.</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}


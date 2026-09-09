import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'

export function MemberLayout({ children }: { children: ReactNode }) {
  return <div className="workspace-shell"><AppHeader scope="member" /><main id="main-content" className="page-container workspace-content">{children}</main></div>
}

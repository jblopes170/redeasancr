import { ROLE_LABEL } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import type { UserRole } from '@/types/domain'

const ROLE_VARIANT: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  judge: 'secondary',
  user: 'outline',
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant={ROLE_VARIANT[role]}>{ROLE_LABEL[role]}</Badge>
}

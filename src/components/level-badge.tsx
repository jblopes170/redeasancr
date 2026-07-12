import { Badge } from '@/components/ui/badge'
import type { CategoryLevel } from '@/types/domain'

export function LevelBadge({ level }: { level: CategoryLevel }) {
  if (!level) {
    return (
      <Badge variant="outline" className="font-semibold tracking-wide">
        Sem nível
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="font-semibold tracking-wide">
      {level}
    </Badge>
  )
}

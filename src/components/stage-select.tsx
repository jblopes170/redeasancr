import { STAGE_OPTIONS } from '@/lib/constants'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Stage } from '@/types/domain'

interface StageSelectProps {
  value?: Stage
  onChange: (value: Stage) => void
  placeholder?: string
}

export function StageSelect({ value, onChange, placeholder = 'Selecione a etapa' }: StageSelectProps) {
  return (
    <Select value={value ? String(value) : undefined} onValueChange={(next) => onChange(Number(next) as Stage)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {STAGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

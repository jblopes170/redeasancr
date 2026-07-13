import { useId, type ComponentProps } from 'react'

import { Input } from '@/components/ui/input'

export interface SuggestionOption {
  value: string
  label?: string
}

interface SuggestionInputProps extends Omit<ComponentProps<typeof Input>, 'list'> {
  options: SuggestionOption[]
  onSuggestionSelect?: (option: SuggestionOption) => void
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR')
}

export function SuggestionInput({ options, onChange, onSuggestionSelect, ...props }: SuggestionInputProps) {
  const generatedId = useId()
  const listId = `suggestions-${generatedId.replace(/:/g, '')}`

  return (
    <>
      <Input
        {...props}
        list={listId}
        autoComplete="off"
        onChange={(event) => {
          onChange?.(event)
          const selected = options.find((option) => normalize(option.value) === normalize(event.target.value))
          if (selected) onSuggestionSelect?.(selected)
        }}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={`${option.value}-${option.label ?? ''}`} value={option.value} label={option.label} />
        ))}
      </datalist>
    </>
  )
}

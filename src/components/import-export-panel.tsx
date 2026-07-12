import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { IMPORT_TEMPLATES } from '@/lib/constants'
import { CSVTemplateButton } from '@/components/csv-template-button'
import { CSVUploader } from '@/components/csv-uploader'
import { Separator } from '@/components/ui/separator'
import {
  importCategories,
  importCompetitors,
  importEntries,
  importHorses,
  importScores,
  importUnifiedSheet,
} from '@/services/api'

interface ImportExportPanelProps {
  eventId: string
  currentUserId: string
}

type ImportType = 'competidores' | 'cavalos' | 'categorias' | 'inscricoes' | 'notas' | 'cadastro_unico'

const REQUIRED_COLUMNS: Record<ImportType, string[]> = {
  competidores: ['nome', 'documento', 'telefone', 'email', 'cidade', 'uf', 'observacoes'],
  cavalos: ['nome', 'registro', 'proprietario', 'observacoes'],
  categorias: ['nome', 'nivel', 'ativa', 'ordem'],
  inscricoes: [
    'competidor_nome',
    'cavalo_nome',
    'categoria_nome',
    'nivel',
    'etapa',
    'numero_entrada',
    'ordem_apresentacao',
  ],
  notas: ['competidor_nome', 'cavalo_nome', 'categoria_nome', 'nivel', 'etapa', 'nota', 'penalidades', 'observacoes'],
  cadastro_unico: ['etapa', 'categoria', 'competidor', 'animal'],
}

export function ImportExportPanel({ eventId, currentUserId }: ImportExportPanelProps) {
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<ImportType>('competidores')
  const [lastErrors, setLastErrors] = useState<string[]>([])

  const onImport = async (rows: Array<Record<string, string>>) => {
    setLastErrors([])
    let result: { success: number; errors: string[] }

    switch (selectedType) {
      case 'competidores':
        result = await importCompetitors(rows)
        break
      case 'cavalos':
        result = await importHorses(rows)
        break
      case 'categorias':
        result = await importCategories(eventId, rows)
        break
      case 'inscricoes':
        result = await importEntries(eventId, rows)
        break
      case 'notas':
        result = await importScores(eventId, currentUserId, rows)
        break
      case 'cadastro_unico':
        result = await importUnifiedSheet(eventId, currentUserId, rows)
        break
      default:
        result = { success: 0, errors: ['Tipo de importação inválido.'] }
    }

    if (result.success > 0) {
      toast.success(`${result.success} linha(s) importadas com sucesso.`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['competitors'] }),
        queryClient.invalidateQueries({ queryKey: ['horses'] }),
        queryClient.invalidateQueries({ queryKey: ['categories', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['entries', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['scores', eventId] }),
      ])
    }

    if (result.errors.length > 0) {
      setLastErrors(result.errors)
      toast.error(`Importação finalizada com ${result.errors.length} erro(s).`)
      console.error(result.errors)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border bg-card p-3">
        <h3 className="mb-2 text-lg font-semibold">Tipo de importação</h3>
        <div className="space-y-2">
          {(
            [
              { id: 'competidores', label: 'Competidores' },
              { id: 'cavalos', label: 'Cavalos' },
              { id: 'categorias', label: 'Categorias' },
              { id: 'inscricoes', label: 'Inscrições' },
              { id: 'notas', label: 'Notas' },
              { id: 'cadastro_unico', label: 'Cadastro Único (Planilha)' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedType(option.id)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                selectedType === option.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-lg border bg-card p-4">
        <h3 className="text-lg font-semibold">{selectedType[0].toUpperCase() + selectedType.slice(1)}</h3>
        <p className="text-sm text-muted-foreground">
          Baixe o modelo CSV, preencha os dados e faça upload para importar com validação.
        </p>

        <div className="my-4 flex flex-wrap gap-2">
          <CSVTemplateButton
            filename={`modelo-${selectedType}.csv`}
            headerLine={IMPORT_TEMPLATES[selectedType]}
          />
        </div>

        <Separator className="my-4" />

        <CSVUploader requiredColumns={REQUIRED_COLUMNS[selectedType]} onConfirm={onImport} />

        {lastErrors.length > 0 && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3">
            <p className="mb-2 text-sm font-semibold text-destructive">Erros por linha</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-destructive">
              {lastErrors.slice(0, 30).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}

import { Upload } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseCsv } from '@/lib/csv'

interface CSVUploaderProps {
  requiredColumns: string[]
  onConfirm: (rows: Array<Record<string, string>>) => Promise<void>
}

export function CSVUploader({ requiredColumns, onConfirm }: CSVUploaderProps) {
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const missingColumns = useMemo(() => {
    if (!rows.length) return []
    const rowKeys = Object.keys(rows[0]).map((key) => key.toLowerCase())
    return requiredColumns.filter((column) => !rowKeys.includes(column.toLowerCase()))
  }, [requiredColumns, rows])

  return (
    <div className="space-y-3">
      <Input
        type="file"
        accept=".csv"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return

          const content = await file.text()
          const parsed = parseCsv<Record<string, string>>(content)
          setRows(parsed.data)
          setErrors(parsed.errors)
        }}
      />

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Erros de leitura</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {missingColumns.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Colunas obrigatórias ausentes</AlertTitle>
          <AlertDescription>{missingColumns.join(', ')}</AlertDescription>
        </Alert>
      )}

      {rows.length > 0 && (
        <Alert>
          <AlertTitle>Pré-visualização pronta</AlertTitle>
          <AlertDescription>
            {rows.length} linha(s) lidas. Revise as validações e confirme a importação.
          </AlertDescription>
        </Alert>
      )}

      <Button
        disabled={!rows.length || !!missingColumns.length || loading}
        onClick={async () => {
          setLoading(true)
          try {
            await onConfirm(rows)
          } finally {
            setLoading(false)
          }
        }}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Confirmar importação
      </Button>
    </div>
  )
}

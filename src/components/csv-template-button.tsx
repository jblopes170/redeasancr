import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { downloadTemplate } from '@/lib/csv'

interface CSVTemplateButtonProps {
  filename: string
  headerLine: string
}

export function CSVTemplateButton({ filename, headerLine }: CSVTemplateButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => downloadTemplate(filename, headerLine)}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Baixar modelo
    </Button>
  )
}

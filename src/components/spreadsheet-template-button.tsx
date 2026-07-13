import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { downloadExcelTemplate } from '@/lib/spreadsheet'

interface SpreadsheetTemplateButtonProps {
  filename: string
  headerLine: string
}

export function SpreadsheetTemplateButton({ filename, headerLine }: SpreadsheetTemplateButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => downloadExcelTemplate(filename, headerLine)}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Baixar modelo Excel
    </Button>
  )
}

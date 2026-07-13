import * as XLSX from 'xlsx'

import { parseCsv } from '@/lib/csv'

function splitHeaderLine(headerLine: string): string[] {
  return headerLine.split(',').map((header) => header.trim()).filter(Boolean)
}

function normalizeHeader(header: unknown): string {
  return String(header ?? '').trim().toLowerCase()
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function fitColumnWidths(headers: string[], rows: Record<string, unknown>[]) {
  return headers.map((header) => {
    const maxLength = rows.reduce((max, row) => {
      const value = row[header]
      return Math.max(max, String(value ?? '').length)
    }, header.length)

    return { wch: Math.min(Math.max(maxLength + 2, 12), 38) }
  })
}

export async function parseSpreadsheetFile<T = Record<string, string>>(
  file: File,
): Promise<{ data: T[]; errors: string[] }> {
  const filename = file.name.toLowerCase()

  if (filename.endsWith('.csv')) {
    return parseCsv<T>(await file.text())
  }

  if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
    return { data: [], errors: ['Formato inválido. Use Excel (.xlsx/.xls) ou CSV.'] }
  }

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
    const sheetName = workbook.SheetNames[0]
    const worksheet = sheetName ? workbook.Sheets[sheetName] : undefined

    if (!worksheet) return { data: [], errors: ['A planilha não possui abas com dados.'] }

    const table = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    })

    if (table.length === 0) return { data: [], errors: ['A planilha está vazia.'] }

    const headers = (table[0] ?? []).map(normalizeHeader)
    const rows = table.slice(1)
      .filter((row) => row.some((cell) => normalizeCell(cell) !== ''))
      .map((row) => {
        const record: Record<string, string> = {}
        headers.forEach((header, index) => {
          if (header) record[header] = normalizeCell(row[index])
        })
        return record
      })

    return { data: rows as T[], errors: [] }
  } catch (error) {
    return {
      data: [],
      errors: [error instanceof Error ? error.message : 'Não foi possível ler a planilha Excel.'],
    }
  }
}

export function downloadExcel(
  filename: string,
  rows: Record<string, unknown>[],
  options?: { sheetName?: string; headers?: string[] },
) {
  const headers = options?.headers ?? Object.keys(rows[0] ?? {})
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: headers,
    skipHeader: false,
  })

  if (rows.length === 0) {
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' })
  }

  worksheet['!cols'] = fitColumnWidths(headers, rows)

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, options?.sheetName ?? 'Dados')
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export function downloadExcelTemplate(filename: string, headerLine: string) {
  const headers = splitHeaderLine(headerLine)
  const worksheet = XLSX.utils.aoa_to_sheet([headers])
  worksheet['!cols'] = headers.map((header) => ({ wch: Math.min(Math.max(header.length + 4, 14), 36) }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo')
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

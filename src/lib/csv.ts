import Papa from 'papaparse'

export function parseCsv<T>(content: string): { data: T[]; errors: string[] } {
  const result = Papa.parse<T>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  })

  const errors = result.errors.map((error) => `Linha ${error.row ?? '-'}: ${error.message}`)

  return {
    data: result.data,
    errors,
  }
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  try {
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
  } finally {
    if (link.parentNode) {
      link.parentNode.removeChild(link)
    }
    URL.revokeObjectURL(url)
  }
}

export function downloadTemplate(filename: string, csvHeaderLine: string) {
  const blob = new Blob([`${csvHeaderLine}\n`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  try {
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
  } finally {
    if (link.parentNode) {
      link.parentNode.removeChild(link)
    }
    URL.revokeObjectURL(url)
  }
}

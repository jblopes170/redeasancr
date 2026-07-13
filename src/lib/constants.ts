import type { CategoryLevel, Level } from '@/types/domain'

export const STAGE_OPTIONS = [
  { label: '1a etapa', value: 1 },
  { label: '2a etapa', value: 2 },
  { label: '3a etapa', value: 3 },
] as const

export const LEVEL_OPTIONS = ['N1', 'N2', 'N3', 'N4'] as const

export const BRAZILIAN_UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export const NO_LEVEL_VALUE = '__SEM_NIVEL__'

export const EVENT_STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ao vivo',
  finished: 'Finalizado',
  published: 'Publicado',
}

export const ENTRY_STATUS_LABEL: Record<string, string> = {
  registered: 'Inscrito',
  cancelled: 'Cancelado',
  finished: 'Finalizado',
}

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  judge: 'Juiz',
  user: 'Usuário',
}

export const STAGE_POINTS_BY_POSITION: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
}

export function pointsForPosition(position: number): number {
  return STAGE_POINTS_BY_POSITION[position] ?? 0
}

export interface NtmrCategoryPreset {
  name: string
  leveled: boolean
}

export const NTMR_CATEGORY_PRESETS: NtmrCategoryPreset[] = [
  { name: 'Amador Principiante', leveled: false },
  { name: 'Amador Master', leveled: false },
  { name: 'Aberto', leveled: true },
  { name: 'Amador', leveled: true },
  { name: 'Aberto Principiante', leveled: false },
  { name: 'Jovem Principiante', leveled: false },
  { name: 'Pré Futurity', leveled: false },
  { name: 'Potro do Futuro', leveled: false },
  { name: 'Futurity', leveled: true },
]

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function normalizeCategoryName(rawName: string): string {
  const normalized = normalizeForMatch(rawName)

  if (normalized === 'aberta') return 'Aberto'
  if (normalized === 'pre futurity') return 'Pré Futurity'
  if (normalized.includes('aberto') && normalized.includes('n1')) return 'Aberto'
  if (normalized.includes('amador') && normalized.includes('n1')) return 'Amador'
  if (normalized.includes('futurity') && normalized.includes('n1')) return 'Futurity'

  const preset = NTMR_CATEGORY_PRESETS.find((item) => normalizeForMatch(item.name) === normalized)
  return preset?.name ?? rawName.trim()
}

export function isLeveledCategoryName(rawName: string): boolean {
  const canonical = normalizeCategoryName(rawName)
  return NTMR_CATEGORY_PRESETS.some((item) => item.name === canonical && item.leveled)
}

export function isOfficialCategoryName(rawName: string): boolean {
  const canonical = normalizeCategoryName(rawName)
  return NTMR_CATEGORY_PRESETS.some((item) => item.name === canonical)
}

export function categoryLabel(name: string, level: Level | null): string {
  return level ? `${name} (${level})` : name
}
interface CategoryLike {
  id: string
  name: string
  level: CategoryLevel
  display_order?: number | null
}

export function categoryOptionLabel(name: string): string {
  return normalizeCategoryName(name)
}

export function getCategoryOptionKey(category: CategoryLike): string {
  const name = normalizeCategoryName(category.name)
  return isLeveledCategoryName(name) ? `leveled:${name}` : `single:${name}`
}

export function getUniqueCategoryOptions<T extends CategoryLike>(categories: T[]): T[] {
  const options = new Map<string, T>()

  for (const category of categories) {
    const key = getCategoryOptionKey(category)
    const existing = options.get(key)

    if (!existing || (category.display_order ?? 9999) < (existing.display_order ?? 9999)) {
      options.set(key, category)
    }
  }

  return Array.from(options.values()).sort((a, b) => {
    const orderDiff = (a.display_order ?? 9999) - (b.display_order ?? 9999)
    if (orderDiff !== 0) return orderDiff
    return categoryOptionLabel(a.name).localeCompare(categoryOptionLabel(b.name), 'pt-BR')
  })
}

export const IMPORT_TEMPLATES = {
  competidores: 'nome,documento,telefone,email,cidade,uf,observacoes',
  cavalos: 'nome,registro,proprietario,observacoes',
  categorias: 'nome,nivel,ativa,ordem',
  inscricoes:
    'competidor_nome,cavalo_nome,categoria_nome,nivel,etapa,numero_entrada,ordem_apresentacao',
  notas:
    'competidor_nome,cavalo_nome,categoria_nome,nivel,etapa,nota,penalidades,observacoes',
  cadastro_unico:
    'etapa,categoria,competidor,animal,registro,proprietario,cidade,uf,nivel,nota_ancr,penalidades,inscricao,ordem_apresentacao,numero_entrada,observacoes',
} as const




// Dados e tipos compartilhados entre os gráficos da dashboard

export type PeriodoKey = '3m' | '6m' | '12m'
export type TipoKey    = 'todos' | 'Eventos' | 'Ensaios' | 'Diarias'

export const ALL_DATA: { mes: string; Eventos: number; Ensaios: number; Diarias: number; meta: number }[] = []

export const SERIES = [
  { key: 'Eventos', color: '#7c3aed' },
  { key: 'Ensaios', color: '#2563eb' },
  { key: 'Diarias', color: '#0d9488', label: 'Diárias' },
] as const

export function getFilteredData(periodo: PeriodoKey) {
  const n = periodo === '3m' ? 3 : periodo === '6m' ? 6 : 12
  return ALL_DATA.slice(-n)
}

export function getActiveSeries(tipo: TipoKey) {
  return tipo === 'todos' ? SERIES : SERIES.filter(s => s.key === tipo)
}

export function rowTotal(row: typeof ALL_DATA[0], tipo: TipoKey) {
  if (tipo === 'todos') return row.Eventos + row.Ensaios + row.Diarias
  return row[tipo as 'Eventos' | 'Ensaios' | 'Diarias'] ?? 0
}

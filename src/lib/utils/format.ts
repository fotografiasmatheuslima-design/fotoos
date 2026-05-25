import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDatetime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

export const WORK_TYPE_LABEL: Record<string, string> = {
  ensaio: 'Ensaio',
  evento: 'Evento',
  diaria: 'Diaria',
}

export const WORK_STATUS_LABEL: Record<string, string> = {
  orcamento:    'Orcamento',
  confirmado:   'Confirmado',
  em_andamento: 'Em Andamento',
  finalizado:   'Finalizado',
  entregue:     'Entregue',
  cancelado:    'Cancelado',
}

export const WORK_STATUS_COLOR: Record<string, string> = {
  orcamento:    'bg-gray-100 text-gray-700',
  confirmado:   'bg-blue-100 text-blue-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  finalizado:   'bg-purple-100 text-purple-700',
  entregue:     'bg-green-100 text-green-700',
  cancelado:    'bg-red-100 text-red-700',
}

export const SD_STATUS_LABEL: Record<string, string> = {
  pendente:         'Pendente',
  em_descarga:      'Em Descarga',
  backup_realizado: 'Backup Realizado',
  seguro_formatar:  'Seguro para Formatar',
}

export const SD_STATUS_COLOR: Record<string, string> = {
  pendente:         'bg-gray-100 text-gray-600',
  em_descarga:      'bg-amber-100 text-amber-700',
  backup_realizado: 'bg-blue-100 text-blue-700',
  seguro_formatar:  'bg-green-100 text-green-700',
}

import { pgEnum } from 'drizzle-orm/pg-core'

// JOB TYPE
export const jobTypeEnum = pgEnum('job_type', [
  'ensaio',
  'evento',
  'diaria',
])

// JOB STATUS - MAQUINA DE ESTADOS
export const jobStatusEnum = pgEnum('job_status', [
  'lead',
  'orcamento',
  'contrato_pendente',
  'aguardando_sinal',
  'confirmado',
  'aguardando_evento',
  'evento_realizado',
  'sd_pendente',
  'backup_realizado',
  'previa_pendente',
  'previa_enviada',
  'em_edicao',
  'edicao_final',
  'entregue',
  'finalizado',
  'cancelado',
])

// CONTRACT STATUS
export const contractStatusEnum = pgEnum('contract_status', [
  'rascunho',
  'enviado',
  'assinado',
  'cancelado',
])

// PAYMENT
export const paymentMethodEnum = pgEnum('payment_method', [
  'pix',
  'cartao_credito',
  'cartao_debito',
  'dinheiro',
  'transferencia',
])

export const paymentStatusEnum = pgEnum('payment_status', [
  'pendente',
  'pago',
  'atrasado',
  'estornado',
])

export const paymentTypeEnum = pgEnum('payment_type', [
  'sinal',
  'parcela',
  'saldo',
  'avulso',
])

// SD CARD
export const sdUsageStatusEnum = pgEnum('sd_usage_status', [
  'pendente',
  'em_descarga',
  'backup_realizado',
  'seguro_formatar',
  'formatado',
])

// STORAGE LOCATION TYPE
export const storageTypeEnum = pgEnum('storage_type', [
  'hd_externo',
  'ssd_externo',
  'nas',
  'nuvem',
  'outro',
])

// TASK PRIORITY
export const taskPriorityEnum = pgEnum('task_priority', [
  'urgente',
  'alta',
  'normal',
  'baixa',
])

// CLIENT SOURCE
export const clientSourceEnum = pgEnum('client_source', [
  'indicacao',
  'instagram',
  'google',
  'facebook',
  'site',
  'outro',
])

// NOTIFICATION TYPE
export const notificationTypeEnum = pgEnum('notification_type', [
  'contrato_pendente',
  'pagamento_vencendo',
  'pagamento_atrasado',
  'entrega_proxima',
  'sd_aguardando_descarga',
  'backup_realizado',
  'meta_atingida',
  'novo_job',
  'lembrete_task',
])

// TYPE HELPERS
export type JobType   = 'ensaio' | 'evento' | 'diaria'
export type JobStatus =
  | 'lead' | 'orcamento' | 'contrato_pendente' | 'aguardando_sinal'
  | 'confirmado' | 'aguardando_evento' | 'evento_realizado'
  | 'sd_pendente' | 'backup_realizado' | 'previa_pendente' | 'previa_enviada'
  | 'em_edicao' | 'edicao_final' | 'entregue' | 'finalizado' | 'cancelado'

// MAQUINA DE ESTADOS - transicoes validas
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  lead:               ['orcamento', 'cancelado'],
  orcamento:          ['contrato_pendente', 'cancelado'],
  contrato_pendente:  ['aguardando_sinal', 'orcamento', 'cancelado'],
  aguardando_sinal:   ['confirmado', 'contrato_pendente', 'cancelado'],
  confirmado:         ['aguardando_evento', 'cancelado'],
  aguardando_evento:  ['evento_realizado', 'cancelado'],
  evento_realizado:   ['sd_pendente', 'cancelado'],
  sd_pendente:        ['backup_realizado', 'cancelado'],
  backup_realizado:   ['previa_pendente'],
  previa_pendente:    ['previa_enviada'],
  previa_enviada:     ['em_edicao'],
  em_edicao:          ['edicao_final'],
  edicao_final:       ['entregue'],
  entregue:           ['finalizado'],
  finalizado:         [],
  cancelado:          ['orcamento'],
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  lead:              'Lead',
  orcamento:         'Orcamento',
  contrato_pendente: 'Contrato pendente',
  aguardando_sinal:  'Aguardando sinal',
  confirmado:        'Confirmado',
  aguardando_evento: 'Aguardando evento',
  evento_realizado:  'Evento realizado',
  sd_pendente:       'SD pendente',
  backup_realizado:  'Backup realizado',
  previa_pendente:   'Previa pendente',
  previa_enviada:    'Previa enviada',
  em_edicao:         'Em edicao',
  edicao_final:      'Edicao final',
  entregue:          'Entregue',
  finalizado:        'Finalizado',
  cancelado:         'Cancelado',
}

export const JOB_STATUS_COLORS: Record<JobStatus, { bg: string; tc: string; dot: string }> = {
  lead:              { bg: '#f3f4f6', tc: '#6b7280',  dot: '#9ca3af' },
  orcamento:         { bg: '#ede9fe', tc: '#5b21b6',  dot: '#7c3aed' },
  contrato_pendente: { bg: '#fef3c7', tc: '#92400e',  dot: '#f59e0b' },
  aguardando_sinal:  { bg: '#fef3c7', tc: '#92400e',  dot: '#f59e0b' },
  confirmado:        { bg: '#dbeafe', tc: '#1e40af',  dot: '#2563eb' },
  aguardando_evento: { bg: '#dbeafe', tc: '#1e40af',  dot: '#2563eb' },
  evento_realizado:  { bg: '#ccfbf1', tc: '#0f766e',  dot: '#0d9488' },
  sd_pendente:       { bg: '#fee2e2', tc: '#991b1b',  dot: '#ef4444' },
  backup_realizado:  { bg: '#dcfce7', tc: '#166534',  dot: '#16a34a' },
  previa_pendente:   { bg: '#fef3c7', tc: '#92400e',  dot: '#f59e0b' },
  previa_enviada:    { bg: '#dbeafe', tc: '#1e40af',  dot: '#2563eb' },
  em_edicao:         { bg: '#ede9fe', tc: '#5b21b6',  dot: '#7c3aed' },
  edicao_final:      { bg: '#ede9fe', tc: '#5b21b6',  dot: '#7c3aed' },
  entregue:          { bg: '#dcfce7', tc: '#166534',  dot: '#16a34a' },
  finalizado:        { bg: '#f0fdf4', tc: '#166534',  dot: '#22c55e' },
  cancelado:         { bg: '#fee2e2', tc: '#991b1b',  dot: '#ef4444' },
}

// Colunas do kanban
export const JOB_KANBAN_COLUMNS = [
  { id: 'pipeline',   label: 'Pipeline',    statuses: ['lead', 'orcamento'] as JobStatus[],                                               color: '#6b7280' },
  { id: 'contrato',   label: 'Contrato',    statuses: ['contrato_pendente', 'aguardando_sinal'] as JobStatus[],                           color: '#f59e0b' },
  { id: 'confirmado', label: 'Confirmado',  statuses: ['confirmado', 'aguardando_evento'] as JobStatus[],                                 color: '#2563eb' },
  { id: 'producao',   label: 'Producao',    statuses: ['evento_realizado', 'sd_pendente', 'backup_realizado'] as JobStatus[],             color: '#0d9488' },
  { id: 'edicao',     label: 'Edicao',      statuses: ['previa_pendente', 'previa_enviada', 'em_edicao', 'edicao_final'] as JobStatus[],  color: '#7c3aed' },
  { id: 'entrega',    label: 'Entrega',     statuses: ['entregue', 'finalizado'] as JobStatus[],                                         color: '#059669' },
] as const

'use client'
import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { FinanceChart } from '@/components/charts/finance-chart'
import type { JobPayment, JobFull } from '@/lib/services/jobs-data'
import { Search, TrendingUp, TrendingDown, Clock, AlertCircle, ChevronDown } from 'lucide-react'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return 'R$' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
function isOverdue(p: JobPayment) {
  return p.status === 'atrasado' || (p.status === 'pendente' && new Date(p.dueDate) < new Date())
}

// ─── PERIOD UTILS ─────────────────────────────────────────────────────────────
type Period = 'semana' | 'mes' | 'mes_anterior' | 'trimestre' | 'ano' | 'todos'

function getPeriodRange(period: Period): { start: Date | null; end: Date | null } {
  const now = new Date()
  if (period === 'todos') return { start: null, end: null }
  if (period === 'semana') {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay())
    start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  if (period === 'mes') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return { start, end }
  }
  if (period === 'mes_anterior') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    return { start, end }
  }
  if (period === 'trimestre') {
    const q = Math.floor(now.getMonth() / 3)
    const start = new Date(now.getFullYear(), q * 3, 1)
    const end   = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59)
    return { start, end }
  }
  if (period === 'ano') {
    const start = new Date(now.getFullYear(), 0, 1)
    const end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    return { start, end }
  }
  return { start: null, end: null }
}

function inRange(dateStr: string, start: Date | null, end: Date | null) {
  if (!start || !end) return true
  const d = new Date(dateStr)
  return d >= start && d <= end
}

// ─── LABELS / COLORS ──────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = { ensaio: 'Ensaio', evento: 'Evento', diaria: 'Diária' }
const TYPE_COLORS: Record<string, { bg: string; tc: string }> = {
  ensaio: { bg: '#ede9fe', tc: '#5b21b6' },
  evento: { bg: '#dbeafe', tc: '#1e40af' },
  diaria: { bg: '#ccfbf1', tc: '#0f766e' },
}
const PAYMENT_LABELS: Record<string, string> = { sinal: 'Sinal', parcela: 'Parcela', saldo: 'Saldo', avulso: 'Avulso' }
const METHOD_LABELS: Record<string, string> = { pix: 'PIX', cartao_credito: 'Cartão', cartao_debito: 'Débito', dinheiro: 'Dinheiro', transferencia: 'Transf.' }

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'semana',       label: 'Esta semana'    },
  { key: 'mes',          label: 'Este mês'       },
  { key: 'mes_anterior', label: 'Mês anterior'   },
  { key: 'trimestre',    label: 'Este trimestre' },
  { key: 'ano',          label: 'Este ano'       },
  { key: 'todos',        label: 'Todo período'   },
]

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface FlatPayment {
  paymentId: string
  job: JobFull
  payment: JobPayment
  overdue: boolean
}
type StatusFilter = 'todos' | 'pendente' | 'atrasado' | 'pago'
type TypeFilter   = 'todos' | 'evento' | 'ensaio' | 'diaria'

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export function FinanceiroClient({ initialJobs }: { initialJobs: JobFull[] }) {
  const [period,       setPeriod]       = useState<Period>('mes')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('todos')
  const [search,       setSearch]       = useState('')
  const [periodOpen,   setPeriodOpen]   = useState(false)

  const range = useMemo(() => getPeriodRange(period), [period])

  // Lista flat — sem filtro de período nos pagamentos pendentes (vence no futuro)
  const allFlat: FlatPayment[] = useMemo(() => {
    const items: FlatPayment[] = []
    for (const job of initialJobs) {
      for (const p of job.payments) {
        items.push({ paymentId: p.id, job, payment: p, overdue: isOverdue(p) })
      }
    }
    return items.sort((a, b) => {
      const order = (fp: FlatPayment) => fp.payment.status === 'pago' ? 2 : fp.overdue ? 0 : 1
      const diff = order(a) - order(b)
      if (diff !== 0) return diff
      return new Date(a.payment.dueDate).getTime() - new Date(b.payment.dueDate).getTime()
    })
  }, [initialJobs])

  // Aplica todos os filtros
  const filtered = useMemo(() => {
    return allFlat.filter(fp => {
      // Filtro de período: usa paidAt se pago, dueDate se pendente
      const dateRef = fp.payment.status === 'pago' && fp.payment.paidAt
        ? fp.payment.paidAt.slice(0, 10)
        : fp.payment.dueDate
      if (!inRange(dateRef, range.start, range.end)) return false

      // Tipo de job
      if (typeFilter !== 'todos' && fp.job.type !== typeFilter) return false

      // Status
      if (statusFilter === 'atrasado' && !(fp.overdue && fp.payment.status !== 'pago')) return false
      if (statusFilter === 'pendente' && !(fp.payment.status === 'pendente' && !fp.overdue)) return false
      if (statusFilter === 'pago'     && fp.payment.status !== 'pago') return false

      // Busca
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!fp.job.clientName?.toLowerCase().includes(q) && !fp.job.title.toLowerCase().includes(q)) return false
      }

      return true
    })
  }, [allFlat, range, typeFilter, statusFilter, search])

  // KPIs derivados do período selecionado
  const kpis = useMemo(() => {
    const inPeriod = allFlat.filter(fp => {
      const dateRef = fp.payment.status === 'pago' && fp.payment.paidAt
        ? fp.payment.paidAt.slice(0, 10)
        : fp.payment.dueDate
      return inRange(dateRef, range.start, range.end)
    })

    let recebido = 0, aReceber = 0, atrasado = 0, totalPrevisto = 0
    for (const fp of inPeriod) {
      totalPrevisto += fp.payment.amount
      if (fp.payment.status === 'pago')       recebido  += fp.payment.amount
      else if (fp.overdue)                     atrasado  += fp.payment.amount
      else                                     aReceber  += fp.payment.amount
    }
    const taxa = totalPrevisto > 0 ? (recebido / totalPrevisto) * 100 : 0
    return { recebido, aReceber, atrasado, totalPrevisto, taxa }
  }, [allFlat, range])

  const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label ?? 'Período'

  // Contagens para badges dos filtros
  const countAtrasado = allFlat.filter(fp => {
    const dateRef = fp.payment.status === 'pago' && fp.payment.paidAt ? fp.payment.paidAt.slice(0,10) : fp.payment.dueDate
    return inRange(dateRef, range.start, range.end) && fp.overdue && fp.payment.status !== 'pago'
      && (typeFilter === 'todos' || fp.job.type === typeFilter)
  }).length
  const countPendente = allFlat.filter(fp => {
    const dateRef = fp.payment.dueDate
    return inRange(dateRef, range.start, range.end) && fp.payment.status === 'pendente' && !fp.overdue
      && (typeFilter === 'todos' || fp.job.type === typeFilter)
  }).length
  const countPago = allFlat.filter(fp => {
    const dateRef = fp.payment.paidAt?.slice(0,10) ?? fp.payment.dueDate
    return inRange(dateRef, range.start, range.end) && fp.payment.status === 'pago'
      && (typeFilter === 'todos' || fp.job.type === typeFilter)
  }).length

  return (
    <>
      <Header title="Financeiro" />
      <div className="flex-1 overflow-y-auto" style={{ padding: 14, background: '#f9fafb' }}>

        {/* ── BARRA DE FILTROS SUPERIOR ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Período — dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setPeriodOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {periodLabel} <ChevronDown size={13} />
            </button>
            {periodOpen && (
              <div style={{
                position: 'absolute', top: 36, left: 0, zIndex: 50, background: '#fff',
                border: '0.5px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.10)',
                minWidth: 160, overflow: 'hidden',
              }}>
                {PERIOD_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => { setPeriod(opt.key); setPeriodOpen(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px',
                      fontSize: 12, background: period === opt.key ? '#f5f3ff' : 'transparent',
                      color: period === opt.key ? '#7c3aed' : '#374151',
                      fontWeight: period === opt.key ? 600 : 400, border: 'none', cursor: 'pointer',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de job */}
          {(['todos','evento','ensaio','diaria'] as TypeFilter[]).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{
                padding: '7px 12px', fontSize: 11, borderRadius: 7, cursor: 'pointer',
                border: '0.5px solid #e5e7eb',
                background: typeFilter === t ? '#111827' : '#fff',
                color: typeFilter === t ? '#fff' : '#6b7280',
                fontWeight: 500,
              }}
            >
              {t === 'todos' ? 'Todos tipos' : TYPE_LABELS[t]}
            </button>
          ))}

          {/* Search */}
          <div style={{ marginLeft: 'auto', position: 'relative', minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente ou job..."
              style={{
                width: '100%', padding: '7px 10px 7px 30px', fontSize: 12,
                border: '0.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
                background: '#fff', color: '#374151',
              }}
            />
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 12 }}>
          {/* Recebido */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', borderTop: '3px solid #059669' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.4px' }}>Recebido</span>
              <TrendingUp size={14} color="#059669" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#059669' }}>{fmt(kpis.recebido)}</div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>
              {kpis.taxa.toFixed(0)}% do previsto ({fmt(kpis.totalPrevisto)})
            </div>
          </div>

          {/* A receber */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', borderTop: '3px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.4px' }}>A receber</span>
              <Clock size={14} color="#f59e0b" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#92400e' }}>{fmt(kpis.aReceber)}</div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>parcelas pendentes no período</div>
          </div>

          {/* Atrasado */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', borderTop: `3px solid ${kpis.atrasado > 0 ? '#ef4444' : '#e5e7eb'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.4px' }}>Inadimplência</span>
              <AlertCircle size={14} color={kpis.atrasado > 0 ? '#ef4444' : '#9ca3af'} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: kpis.atrasado > 0 ? '#ef4444' : '#6b7280' }}>{fmt(kpis.atrasado)}</div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>{countAtrasado} parcela(s) vencida(s)</div>
          </div>

          {/* Taxa de recebimento */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', borderTop: '3px solid #7c3aed' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.4px' }}>Taxa recebimento</span>
              <TrendingDown size={14} color="#7c3aed" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#7c3aed' }}>{kpis.taxa.toFixed(1)}%</div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>do total previsto no período</div>
          </div>
        </div>

        {/* ── GRÁFICO ── */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '13px 15px', marginBottom: 11 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Receita — 2026 (por tipo de trabalho)</div>
          <FinanceChart jobs={initialJobs} />
        </div>

        {/* ── TABELA DE MOVIMENTAÇÕES ── */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '13px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Movimentações
              <span style={{ marginLeft: 7, padding: '1px 7px', background: '#f3f4f6', borderRadius: 9, color: '#374151', fontSize: 10, fontWeight: 600 }}>
                {filtered.length}
              </span>
            </div>
          </div>

          {/* Filtros de status */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
            {([
              { key: 'todos',    label: `Todos (${filtered.length})` },
              { key: 'atrasado', label: `Atrasados (${countAtrasado})`, dot: '#ef4444' },
              { key: 'pendente', label: `A receber (${countPendente})`, dot: '#f59e0b' },
              { key: 'pago',     label: `Pagos (${countPago})`,         dot: '#059669' },
            ] as { key: StatusFilter; label: string; dot?: string }[]).map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                  border: '0.5px solid',
                  borderColor: statusFilter === f.key ? '#7c3aed' : '#e5e7eb',
                  background: statusFilter === f.key ? '#f5f3ff' : 'transparent',
                  color: statusFilter === f.key ? '#7c3aed' : '#6b7280',
                  fontWeight: statusFilter === f.key ? 600 : 400,
                }}
              >
                {f.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.dot, flexShrink: 0 }} />}
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              Nenhuma movimentação encontrada para este filtro
            </div>
          )}

          {filtered.map((fp, i) => {
            const p = fp.payment
            const j = fp.job
            const isPago  = p.status === 'pago'
            const isLate  = fp.overdue && !isPago
            const badgeBg = isPago ? '#dcfce7' : isLate ? '#fee2e2' : '#fef3c7'
            const badgeTc = isPago ? '#166534' : isLate ? '#991b1b' : '#92400e'
            const badgeLabel = isPago ? 'Pago' : isLate ? 'Atrasado' : 'Pendente'
            const typeStyle  = TYPE_COLORS[j.type] ?? { bg: '#f3f4f6', tc: '#6b7280' }

            return (
              <div key={fp.paymentId}
                style={{
                  display: 'flex', alignItems: 'center', padding: '9px 4px',
                  borderBottom: i < filtered.length - 1 ? '0.5px solid #f3f4f6' : 'none',
                  borderLeft: isLate ? '3px solid #ef4444' : isPago ? '3px solid #059669' : '3px solid #f59e0b',
                  paddingLeft: 8,
                }}
              >
                {/* Tipo badge */}
                <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: typeStyle.bg, color: typeStyle.tc, flexShrink: 0, marginRight: 10, minWidth: 44, textAlign: 'center' }}>
                  {TYPE_LABELS[j.type]}
                </span>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.clientName ?? j.title}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                    {PAYMENT_LABELS[p.type] ?? p.type}
                    {p.method ? ' · ' + (METHOD_LABELS[p.method] ?? p.method) : ''}
                    {' · '}
                    {isPago && p.paidAt ? 'Pago em ' + fmtDate(p.paidAt.slice(0,10)) : isLate ? 'Venceu ' + fmtDate(p.dueDate) : 'Vence ' + fmtDate(p.dueDate)}
                  </div>
                </div>
                {/* Valor */}
                <span style={{ fontSize: 13, fontWeight: 600, color: isPago ? '#059669' : isLate ? '#ef4444' : '#92400e', margin: '0 12px', flexShrink: 0 }}>
                  {fmt(p.amount)}
                </span>
                {/* Status badge */}
                <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 500, background: badgeBg, color: badgeTc, flexShrink: 0 }}>
                  {badgeLabel}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </>
  )
}

'use client'
import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { BarChart2, TrendingUp, Activity } from 'lucide-react'
import { getFilteredData, getActiveSeries, rowTotal, SERIES } from './charts-data'
import type { PeriodoKey, TipoKey } from './charts-data'

export type FormatoKey = 'barras' | 'linha' | 'area'

const FORMATOS: { key: FormatoKey; icon: any; label: string }[] = [
  { key: 'barras', icon: BarChart2,  label: 'Barras' },
  { key: 'linha',  icon: TrendingUp, label: 'Linha'  },
  { key: 'area',   icon: Activity,   label: 'Área'   },
]

const PERIODOS: { key: PeriodoKey; label: string }[] = [
  { key: '3m',  label: '3m'  },
  { key: '6m',  label: '6m'  },
  { key: '12m', label: '12m' },
]

const TIPOS: { key: TipoKey; label: string; color: string }[] = [
  { key: 'todos',   label: 'Todos',   color: '#374151' },
  { key: 'Eventos', label: 'Eventos', color: '#7c3aed' },
  { key: 'Ensaios', label: 'Ensaios', color: '#2563eb' },
  { key: 'Diarias', label: 'Diárias', color: '#0d9488' },
]

const fmt  = (v: number) => `R$${(v / 1000).toFixed(0)}k`
const fmtR = (v: number) => `R$${v.toLocaleString('pt-BR')}`

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0)
  return (
    <div style={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '10px 14px', minWidth: 150 }}>
      <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, color: '#fff', marginBottom: 3 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            {p.dataKey === 'Diarias' ? 'Diárias' : p.dataKey}
          </span>
          <span style={{ fontWeight: 600 }}>{fmtR(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.15)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#c4b5fd', fontWeight: 700 }}>
          <span>Total</span><span>{fmtR(total)}</span>
        </div>
      )}
    </div>
  )
}

interface Props {
  periodo: PeriodoKey; tipo: TipoKey; formato: FormatoKey
  onPeriodo: (p: PeriodoKey) => void
  onTipo:    (t: TipoKey)    => void
  onFormato: (f: FormatoKey) => void
}

export function DashboardChart({ periodo, tipo, formato, onPeriodo, onTipo, onFormato }: Props) {
  const data   = useMemo(() => getFilteredData(periodo), [periodo])
  const series = useMemo(() => getActiveSeries(tipo), [tipo])

  const totMes   = data[data.length - 1]
  const prevMes  = data[data.length - 2]
  const totGeral  = totMes  ? rowTotal(totMes,  tipo) : 0
  const prevGeral = prevMes ? rowTotal(prevMes, tipo) : 0
  const delta = prevGeral > 0 ? ((totGeral - prevGeral) / prevGeral) * 100 : 0

  const common = { data, margin: { top: 4, right: 8, left: 0, bottom: 0 } }
  const xAxis  = <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
  const yAxis  = <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={fmt} axisLine={false} tickLine={false} width={40} />
  const grid   = <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.05)" vertical={false} />

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '.4px', textTransform: 'uppercase' }}>Faturamento Mensal</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{fmt(totGeral)}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: delta >= 0 ? '#059669' : '#ef4444' }}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% vs mês ant.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Formato */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2, gap: 1 }}>
            {FORMATOS.map(f => {
              const Icon = f.icon; const active = formato === f.key
              return (
                <button key={f.key} onClick={() => onFormato(f.key)} title={f.label}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:10,
                    background: active ? '#fff' : 'transparent', color: active ? '#7c3aed' : '#9ca3af',
                    fontWeight: active ? 700 : 400, boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition:'all .15s' }}>
                  <Icon size={12} /><span>{f.label}</span>
                </button>
              )
            })}
          </div>

          {/* Período */}
          <div style={{ display:'flex', background:'#f3f4f6', borderRadius:8, padding:2, gap:1 }}>
            {PERIODOS.map(p => {
              const active = periodo === p.key
              return (
                <button key={p.key} onClick={() => onPeriodo(p.key)}
                  style={{ padding:'4px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:10,
                    background: active ? '#7c3aed' : 'transparent', color: active ? '#fff' : '#6b7280',
                    fontWeight: active ? 700 : 400, transition:'all .15s' }}>
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Tipo */}
          <div style={{ display:'flex', background:'#f3f4f6', borderRadius:8, padding:2, gap:1 }}>
            {TIPOS.map(t => {
              const active = tipo === t.key
              return (
                <button key={t.key} onClick={() => onTipo(t.key)}
                  style={{ padding:'4px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:10,
                    background: active ? t.color : 'transparent', color: active ? '#fff' : '#6b7280',
                    fontWeight: active ? 700 : 400, transition:'all .15s' }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        {formato === 'barras' ? (
          <BarChart {...common} barSize={tipo === 'todos' ? 12 : 20} barCategoryGap="28%">
            {grid}{xAxis}{yAxis}
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,.06)' }} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} stackId={tipo === 'todos' ? 'a' : undefined}
                fill={s.color} radius={i === series.length - 1 ? [4,4,0,0] : [0,0,0,0]} />
            ))}
          </BarChart>
        ) : formato === 'linha' ? (
          <LineChart {...common}>
            {grid}{xAxis}{yAxis}
            <Tooltip content={<CustomTooltip />} />
            {series.map(s => (
              <Line key={s.key} type="monotone" dataKey={s.key}
                stroke={s.color} strokeWidth={2.5} dot={{ r: 3, fill: s.color }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        ) : (
          <AreaChart {...common}>
            <defs>
              {series.map(s => (
                <linearGradient key={s.key} id={`g_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            {grid}{xAxis}{yAxis}
            <Tooltip content={<CustomTooltip />} />
            {series.map(s => (
              <Area key={s.key} type="monotone" dataKey={s.key}
                stroke={s.color} strokeWidth={2.5} fill={`url(#g_${s.key})`} dot={{ r: 3, fill: s.color }} />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>

      {/* Legenda */}
      {tipo === 'todos' && (
        <div style={{ display:'flex', gap:14, marginTop:8, justifyContent:'center' }}>
          {SERIES.map(s => {
            const total = data.reduce((acc, d) => acc + (d[s.key as keyof typeof d] as number ?? 0), 0)
            return (
              <div key={s.key} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:8, height:8, borderRadius:2, background:s.color, display:'inline-block' }} />
                <span style={{ fontSize:10, color:'#6b7280' }}>{s.key === 'Diarias' ? 'Diárias' : s.key}</span>
                <span style={{ fontSize:10, fontWeight:700, color:'#374151' }}>{fmt(total)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

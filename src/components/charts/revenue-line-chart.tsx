'use client'
import { useMemo } from 'react'
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { getFilteredData, rowTotal } from './charts-data'
import type { PeriodoKey, TipoKey } from './charts-data'

const fmt  = (v: number) => 'R$' + Math.round(v / 1000) + 'k'
const fmtR = (v: number) => 'R$' + v.toLocaleString('pt-BR')

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display:'flex', justifyContent:'space-between', gap:16, fontSize:12, color:'#fff', marginBottom:3 }}>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background: p.dataKey === 'meta' ? '#e5e7eb' : '#7c3aed', display:'inline-block' }} />
            {p.dataKey === 'meta' ? 'Meta' : 'Receita'}
          </span>
          <span style={{ fontWeight:600 }}>{fmtR(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

interface Props { periodo: PeriodoKey; tipo: TipoKey }

export function RevenueLineChart({ periodo, tipo }: Props) {
  const data = useMemo(() => {
    return getFilteredData(periodo).map(row => ({
      mes:    row.mes,
      receita: rowTotal(row, tipo),
      meta:   row.meta,
    }))
  }, [periodo, tipo])

  const ultimoMes  = data[data.length - 1]
  const bateuMeta  = ultimoMes && ultimoMes.receita >= ultimoMes.meta
  const pctMeta    = ultimoMes && ultimoMes.meta > 0
    ? Math.min((ultimoMes.receita / ultimoMes.meta) * 100, 100)
    : 0

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#374151', letterSpacing:'.4px', textTransform:'uppercase' }}>
            Receita vs Meta
          </div>
          {ultimoMes && (
            <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>
              {ultimoMes.mes} — meta: <span style={{ fontWeight:700, color: bateuMeta ? '#059669' : '#f59e0b' }}>{fmt(ultimoMes.meta)}</span>
            </div>
          )}
        </div>
        {ultimoMes && (
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, fontWeight:800, color: bateuMeta ? '#059669' : '#374151' }}>
              {pctMeta.toFixed(0)}%
            </div>
            <div style={{ fontSize:9, color:'#9ca3af' }}>da meta</div>
          </div>
        )}
      </div>

      {/* Barra de progresso da meta */}
      <div style={{ height:4, borderRadius:2, background:'#f3f4f6', marginBottom:10, overflow:'hidden' }}>
        <div style={{
          height:'100%', borderRadius:2, transition:'width .5s',
          background: bateuMeta ? '#059669' : '#7c3aed',
          width: pctMeta + '%',
        }} />
      </div>

      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
          <defs>
            <linearGradient id="gradReceita2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.05)" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize:10, fill:'#9ca3af' }} tickFormatter={fmt} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="receita" stroke="#7c3aed" strokeWidth={2.5}
            fill="url(#gradReceita2)" dot={{ r:3, fill:'#7c3aed' }} activeDot={{ r:5 }} />
          <Line type="monotone" dataKey="meta" stroke="#d1d5db" strokeWidth={1.5}
            strokeDasharray="4 3" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

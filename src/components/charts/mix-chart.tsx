'use client'
import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getFilteredData, getActiveSeries, SERIES } from './charts-data'
import type { PeriodoKey, TipoKey } from './charts-data'

const RADIAN = Math.PI / 180
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (percent < 0.08) return null
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

interface Props { periodo: PeriodoKey; tipo: TipoKey }

export function MixChart({ periodo, tipo }: Props) {
  const pieData = useMemo(() => {
    const rows = getFilteredData(periodo)
    const series = getActiveSeries(tipo)
    return series.map(s => ({
      name:  s.key === 'Diarias' ? 'Diárias' : s.key,
      value: rows.reduce((acc, r) => acc + (r[s.key as keyof typeof r] as number ?? 0), 0),
      color: s.color,
    })).filter(d => d.value > 0)
  }, [periodo, tipo])

  const total = pieData.reduce((s, d) => s + d.value, 0)
  const fmt   = (v: number) => `R$${v.toLocaleString('pt-BR')}`

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 6 }}>
        Mix de Tipos
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={54}
              dataKey="value" labelLine={false} label={CustomLabel}>
              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legenda lateral */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pieData.map(d => (
            <div key={d.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#374151' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                  {d.name}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>
                  {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: '#f3f4f6', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: d.color, width: `${total > 0 ? (d.value / total) * 100 : 0}%`, transition: 'width .4s' }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 4, fontSize: 10, color: '#9ca3af' }}>
            Total: <span style={{ fontWeight: 700, color: '#374151' }}>{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

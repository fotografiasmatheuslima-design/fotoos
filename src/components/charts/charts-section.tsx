'use client'
import { useState } from 'react'
import { DashboardChart } from './dashboard-chart'
import { MixChart }        from './mix-chart'
import { RevenueLineChart } from './revenue-line-chart'
import type { PeriodoKey, TipoKey } from './charts-data'
import type { FormatoKey } from './dashboard-chart'

export function ChartsSection() {
  const [periodo, setPeriodo] = useState<PeriodoKey>('6m')
  const [tipo,    setTipo]    = useState<TipoKey>('todos')
  const [formato, setFormato] = useState<FormatoKey>('barras')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Gráfico principal — contém os controles de filtro */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '0.5px solid #f0f0f0' }}>
        <DashboardChart
          periodo={periodo} tipo={tipo} formato={formato}
          onPeriodo={setPeriodo} onTipo={setTipo} onFormato={setFormato}
        />
      </div>

      {/* Linha inferior: mix + receita vs meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '0.5px solid #f0f0f0' }}>
          <MixChart periodo={periodo} tipo={tipo} />
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '0.5px solid #f0f0f0' }}>
          <RevenueLineChart periodo={periodo} tipo={tipo} />
        </div>
      </div>
    </div>
  )
}

'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { JobFull } from '@/lib/services/jobs-data'

const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function buildChartData(jobs: JobFull[]) {
  const now = new Date()
  const year = now.getFullYear()
  const currentMonth = now.getMonth() // 0-indexed

  // Initialize 12 months
  const byMonth: Record<number, { Eventos: number; Ensaios: number; Diárias: number; Previsto: number }> = {}
  for (let i = 0; i < 12; i++) {
    byMonth[i] = { Eventos: 0, Ensaios: 0, Diárias: 0, Previsto: 0 }
  }

  for (const job of jobs) {
    for (const p of job.payments) {
      const dateStr = p.status === 'pago' && p.paidAt ? p.paidAt.slice(0, 10) : p.dueDate
      const d = new Date(dateStr)
      if (d.getFullYear() !== year) continue
      const m = d.getMonth()
      const amount = p.amount

      if (p.status === 'pago') {
        // Recebido real
        if (job.type === 'evento')  byMonth[m].Eventos  += amount
        else if (job.type === 'ensaio') byMonth[m].Ensaios += amount
        else                         byMonth[m].Diárias  += amount
      } else {
        // Previsto (futuro)
        byMonth[m].Previsto += amount
      }
    }
  }

  // Only return months that have data or up to currentMonth+2
  const limit = Math.min(11, currentMonth + 2)
  return Array.from({ length: limit + 1 }, (_, i) => ({
    mes: MONTH_ABBR[i],
    ...byMonth[i],
  }))
}

const fmt = (v: number) => `R$${Math.round(v / 1000)}k`

interface FinanceChartProps {
  jobs?: JobFull[]
}

export function FinanceChart({ jobs }: FinanceChartProps = {}) {
  const data = jobs && jobs.length > 0 ? buildChartData(jobs) : []

  return (
    <ResponsiveContainer width="100%" height={115}>
      <BarChart data={data} barSize={12} barCategoryGap="30%">
        <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={fmt} axisLine={false} tickLine={false} width={36} />
        <Tooltip formatter={(v: number) => [`R$${v.toLocaleString('pt-BR')}`, '']} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }} />
        <Bar dataKey="Eventos"  stackId="s" fill="#7c3aed" />
        <Bar dataKey="Ensaios"  stackId="s" fill="#2563eb" />
        <Bar dataKey="Diárias"  stackId="s" fill="#0d9488" />
        <Bar dataKey="Previsto" stackId="s" fill="rgba(124,58,237,.22)" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

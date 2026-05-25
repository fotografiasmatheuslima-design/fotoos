import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { ChartsSection } from '@/components/charts/charts-section'
import { AgendaCalendar } from '@/components/agenda/agenda-calendar'
import { EventDayCheckin } from '@/components/jobs/event-day-checkin'
import { getJobs } from '@/lib/services/jobs'

const ACOES = [
  {
    group: 'Cadastros', color: '#7c3aed',
    items: [
      { icon: '📸', label: 'Novo Evento',  sub: 'Casamento, formatura, corporativo', href: '/jobs?new=evento', accent: '#7c3aed', bg: '#f5f3ff' },
      { icon: '🌿', label: 'Novo Ensaio',  sub: 'Pre-wedding, familia, gestante',    href: '/jobs?new=ensaio', accent: '#2563eb', bg: '#eff6ff' },
      { icon: '🏢', label: 'Nova Diaria',  sub: 'Voce contratado por outro estudio', href: '/jobs?new=diaria', accent: '#0d9488', bg: '#f0fdfa' },
      { icon: '👤', label: 'Novo Cliente', sub: 'Cadastrar cliente na base',         href: '/clientes',        accent: '#059669', bg: '#f0fdf4' },
    ],
  },
  {
    group: 'Contratos', color: '#d97706',
    items: [
      { icon: '📄', label: 'Gerar Contrato', sub: 'Motor de contrato automatico', href: '/contratos/gerar', accent: '#d97706', bg: '#fffbeb' },
      { icon: '📋', label: 'Ver Contratos',  sub: 'Pendentes e assinados',        href: '/contratos',       accent: '#d97706', bg: '#fffbeb' },
    ],
  },
  {
    group: 'Financeiro', color: '#059669',
    items: [
      { icon: '💰', label: 'A Receber',      sub: 'Pagamentos pendentes e atrasados', href: '/financeiro', accent: '#059669', bg: '#f0fdf4' },
      { icon: '📊', label: 'Ver Financeiro', sub: 'Receita, inadimplencia, ticket',   href: '/financeiro', accent: '#059669', bg: '#f0fdf4' },
    ],
  },
  {
    group: 'Operacional', color: '#6b7280',
    items: [
      { icon: '🗂', label: 'Kanban de Jobs', sub: 'Visao completa do pipeline',     href: '/jobs',      accent: '#374151', bg: '#f9fafb' },
      { icon: '👥', label: 'Clientes',       sub: 'Base de clientes e historico',   href: '/clientes',  accent: '#374151', bg: '#f9fafb' },
      { icon: '💾', label: 'SD Cards',       sub: 'Registrar uso e controle backup', href: '/sd-cards', accent: '#0d9488', bg: '#f0fdfa' },
    ],
  },
]


const MESES_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default async function DashboardPage() {
  const jobs = await getJobs()

  // ── Alertas derivados dos jobs reais ──
  const now = new Date()
  const ALERTS: { text: string; sub: string; dot: string; action: string; href: string }[] = []

  for (const job of jobs) {
    const overduePayment = job.payments.find(
      p => p.status !== 'pago' && p.status !== 'estornado' && new Date(p.dueDate) < now
    )
    if (overduePayment) {
      ALERTS.push({
        text:   `Pagamento atrasado · R$${overduePayment.amount.toLocaleString('pt-BR')}`,
        sub:    job.clientName ?? job.title,
        dot:    '#ef4444',
        action: 'Ver Financeiro',
        href:   '/financeiro',
      })
    }
  }
  const sdPendingJobs = jobs.filter(
    j => j.sdCount > 0 && ['evento_realizado', 'sd_pendente'].includes(j.status)
  )
  for (const job of sdPendingJobs) {
    ALERTS.push({
      text:   `SD pendente de backup`,
      sub:    job.clientName ?? job.title,
      dot:    '#ef4444',
      action: 'Ir para SD Cards',
      href:   '/sd-cards',
    })
  }
  const contractPendingJobs = jobs.filter(
    j => j.contract?.status === 'enviado' && !j.contract?.signedAt
  )
  for (const job of contractPendingJobs) {
    ALERTS.push({
      text:   'Contrato pendente de assinatura',
      sub:    job.clientName ?? job.title,
      dot:    '#f59e0b',
      action: 'Ver Contratos',
      href:   '/contratos',
    })
  }

  // ── Jobs por mês (últimos 6 meses) ──
  const MESES_JOBS = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const m = d.getMonth()
    const y = d.getFullYear()
    const count = jobs.filter(j => {
      if (!j.scheduledAt) return false
      const jd = new Date(j.scheduledAt)
      return jd.getMonth() === m && jd.getFullYear() === y
    }).length
    return { mes: MESES_ABBR[m], jobs: count }
  })
  const maxJobs = Math.max(...MESES_JOBS.map(m => m.jobs), 1)

  // ── Real KPIs ──
  const activeJobs    = jobs.filter(j => !['finalizado','cancelado'].includes(j.status))
  const totalPending  = jobs.reduce((s, j) => s + j.pendingValue, 0)
  const overdueAmt    = jobs.reduce((s, j) => {
    const over = j.payments
      .filter(p => p.status !== 'pago' && p.status !== 'estornado' && new Date(p.dueDate) < new Date())
      .reduce((a, p) => a + p.amount, 0)
    return s + over
  }, 0)
  const sdPendentes   = jobs.filter(j =>
    j.sdCount > 0 && ['evento_realizado','sd_pendente'].includes(j.status)
  ).length
  const totalValue    = activeJobs.reduce((s, j) => s + j.totalValue, 0)

  // ── Pipeline groups ──
  const pipelineGroups = [
    { status: 'Lead',       statuses: ['lead','orcamento'],                              color: '#9ca3af' },
    { status: 'Contrato',   statuses: ['contrato_pendente','aguardando_sinal'],          color: '#f59e0b' },
    { status: 'Confirmado', statuses: ['confirmado','aguardando_evento'],                color: '#2563eb' },
    { status: 'Em edição',  statuses: ['evento_realizado','sd_pendente','backup_realizado','previa_pendente','previa_enviada','em_edicao','edicao_final'], color: '#7c3aed' },
    { status: 'Entregue',   statuses: ['entregue'],                                      color: '#059669' },
  ].map(g => ({ ...g, count: activeJobs.filter(j => g.statuses.includes(j.status)).length }))
  const pipelineTotal = pipelineGroups.reduce((s, g) => s + g.count, 0) || 1

  return (
    <>
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto" style={{ padding: 14, background: '#f9fafb' }}>

        <EventDayCheckin jobs={jobs} />

        {/* ── 1. ACOES RAPIDAS ── */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 11 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
            Acoes rapidas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ACOES.map(group => (
              <div key={group.group}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                  <div style={{ width: 3, height: 11, borderRadius: 2, background: group.color }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: group.color, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    {group.group}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                  {group.items.map(item => (
                    <a key={item.label} href={item.href} style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '9px 11px', borderRadius: 9, textDecoration: 'none',
                      background: item.bg, border: '0.5px solid #e5e7eb',
                      borderLeft: '3px solid ' + item.accent,
                    }}>
                      <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. AGENDA + ALERTAS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 290px', gap: 10, marginBottom: 11 }}>
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '13px 15px' }}>
            <AgendaCalendar jobs={jobs} />
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '13px 15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px' }}>Alertas</div>
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 9, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>{ALERTS.length}</span>
            </div>
            {ALERTS.map((a, i) => (
              <Link key={i} href={a.href} style={{ textDecoration: 'none', display: 'block', marginBottom: 6 }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                  padding: '10px 11px', borderRadius: 9,
                  background: '#f9fafb', border: `1px solid ${a.dot}33`,
                  cursor: 'pointer',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.dot, flexShrink: 0, marginTop: 3 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.35 }}>{a.text}</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{a.sub}</div>
                    <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: a.dot, background: a.dot + '15', padding: '3px 8px', borderRadius: 6 }}>
                      {a.action} →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── 3. KPIs OPERACIONAIS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9, marginBottom: 11 }}>
          {[
            { label: 'Jobs ativos',   value: String(activeJobs.length),                       sub: `${activeJobs.filter(j=>j.type==='evento').length} eventos · ${activeJobs.filter(j=>j.type==='ensaio').length} ensaios`, color: '#7c3aed' },
            { label: 'A receber',     value: `R$${totalPending.toLocaleString('pt-BR')}`,     sub: overdueAmt > 0 ? `R$${overdueAmt.toLocaleString('pt-BR')} em atraso` : 'Em dia',     color: overdueAmt > 0 ? '#ef4444' : '#059669' },
            { label: 'Inadimplência', value: `R$${overdueAmt.toLocaleString('pt-BR')}`,       sub: overdueAmt > 0 ? 'Parcelas vencidas' : 'Tudo em dia',       color: overdueAmt > 0 ? '#ef4444' : '#059669' },
            { label: 'SD pendentes',  value: String(sdPendentes),                             sub: sdPendentes > 0 ? 'Aguardando backup' : 'Todos com backup', color: sdPendentes > 0 ? '#f59e0b' : '#059669' },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${k.color}`, borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── 4. GRAFICOS ── */}
        <div style={{ marginBottom: 11 }}>
          <ChartsSection />
        </div>

        {/* ── 5. PIPELINE + JOBS POR MES ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* Pipeline */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '13px 15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px' }}>Pipeline de jobs</div>
              <a href="/jobs" style={{ fontSize: 10, color: '#7c3aed', textDecoration: 'none', fontWeight: 500 }}>Ver kanban</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pipelineGroups.map(p => (
                <div key={p.status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 10, color: '#374151', fontWeight: 500, width: 72, flexShrink: 0 }}>{p.status}</div>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: p.color, width: (p.count / pipelineTotal * 100) + '%', transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: p.color, width: 16, textAlign: 'right', flexShrink: 0 }}>{p.count}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '0.5px solid #f3f4f6', display: 'flex', gap: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: '#9ca3af' }}>Total pipeline</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{pipelineTotal} jobs</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#9ca3af' }}>Valor total</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>R${totalValue.toLocaleString('pt-BR')}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#9ca3af' }}>A receber</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>R${totalPending.toLocaleString('pt-BR')}</div>
              </div>
            </div>
          </div>

          {/* Jobs por mes — bar manual em SVG */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '13px 15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px' }}>Jobs por mes</div>
              <span style={{ fontSize: 9, color: '#9ca3af' }}>ultimos 6 meses</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 90, gap: 6, padding: '0 4px' }}>
              {MESES_JOBS.map((m, i) => (
                <div key={m.mes} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: i === MESES_JOBS.length - 1 ? '#7c3aed' : '#374151' }}>{m.jobs}</span>
                  <div style={{
                    width: '100%', borderRadius: 4,
                    background: i === MESES_JOBS.length - 1 ? '#7c3aed' : '#ddd6fe',
                    height: (m.jobs / maxJobs * 64) + 'px',
                    minHeight: 8,
                  }} />
                  <span style={{ fontSize: 9, color: '#9ca3af' }}>{m.mes}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

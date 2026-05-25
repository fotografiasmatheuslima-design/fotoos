'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import {
  JOB_KANBAN_COLUMNS, JOB_STATUS_LABELS, JOB_STATUS_COLORS,
  type JobStatus, type JobType,
} from '@/lib/db/schema/enums'
import type { JobFull } from '@/lib/services/jobs-data'
import { JobSlideOver } from '@/components/jobs/job-slide-over'
import { NewJobSlideOver } from '@/components/jobs/new-job-slide-over'
import { Plus, LayoutGrid, List, Search } from 'lucide-react'

const TYPE_LABEL: Record<JobType, string> = { ensaio: 'Ensaio', evento: 'Evento', diaria: 'Diaria' }
const TYPE_COLORS: Record<JobType, { bg: string; tc: string }> = {
  ensaio: { bg: '#dbeafe', tc: '#1e40af' },
  evento: { bg: '#ede9fe', tc: '#5b21b6' },
  diaria: { bg: '#ccfbf1', tc: '#0f766e' },
}

const FILTERS = [
  { id: 'todos',           label: 'Todos'          },
  { id: 'casamentos',      label: 'Casamentos'     },
  { id: 'ensaios',         label: 'Ensaios'        },
  { id: 'diarias',         label: 'Diarias'        },
  { id: 'entregue',        label: 'Entregues'      },
  { id: 'financeiro',      label: 'Ag. pagamento'  },
  { id: 'previa_pendente', label: 'Previa pend.'   },
]

export function JobsClient({ initialJobs }: { initialJobs: JobFull[] }) {
  const router = useRouter()
  const [view,   setView]   = useState<'kanban' | 'list'>('kanban')
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [jobs,   setJobs]   = useState<JobFull[]>(initialJobs)
  const [selectedJob, setSelectedJob] = useState<JobFull | null>(null)
  const [showNew, setShowNew] = useState(false)
  const dragRef  = useRef<{ id: string; fromCol: string } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  function filteredJobs() {
    return jobs.filter(j => {
      const q = search.toLowerCase()
      const matchSearch = !search ||
        j.title.toLowerCase().includes(q) ||
        (j.clientName ?? '').toLowerCase().includes(q)
      const matchFilter =
        filter === 'todos'           ? true
        : filter === 'casamentos'    ? j.tags.includes('casamento')
        : filter === 'ensaios'       ? j.type === 'ensaio'
        : filter === 'diarias'       ? j.type === 'diaria'
        : filter === 'entregue'      ? (j.status === 'entregue' || j.status === 'finalizado')
        : filter === 'financeiro'    ? j.pendingValue > 0
        : filter === 'previa_pendente' ? j.status === 'previa_pendente'
        : true
      return matchSearch && matchFilter
    })
  }

  function onDrop(toColId: string) {
    const drag = dragRef.current
    if (!drag || drag.fromCol === toColId) { setDragOver(null); dragRef.current = null; return }
    const col = JOB_KANBAN_COLUMNS.find(c => c.id === toColId)
    if (!col) return
    const newStatus = col.statuses[0]
    setJobs(prev => prev.map(j => j.id === drag.id ? { ...j, status: newStatus } : j))
    setDragOver(null); dragRef.current = null
  }

  const fj = filteredJobs()
  const pendingTasks = jobs.flatMap(j => j.tasks).filter(t => !t.completed).length
  const urgentCount  = jobs.flatMap(j => j.tasks).filter(t => !t.completed && t.priority === 'urgente').length

  return (
    <>
      <Header title="Jobs" chip={{ label: `${jobs.filter(j => !['finalizado','cancelado'].includes(j.status)).length} ativos`, color: 'purple' }} />
      <div className="flex-1 overflow-y-auto" style={{ background: '#f9fafb' }}>

        {/* Toolbar */}
        <div style={{ padding: '10px 14px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text" placeholder="Buscar job ou cliente..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 28, paddingRight: 10, height: 32, fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 7, outline: 'none', background: '#fff' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '5px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                border: '0.5px solid #e5e7eb',
                background: filter === f.id ? '#7c3aed' : '#fff',
                color:      filter === f.id ? '#fff'    : '#6b7280',
                fontWeight: filter === f.id ? 500 : 400,
              }}>{f.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 7, overflow: 'hidden' }}>
            {([['kanban', LayoutGrid], ['list', List]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 9px', cursor: 'pointer', border: 'none', background: view === v ? '#7c3aed' : 'transparent', color: view === v ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center' }}>
                <Icon size={14} />
              </button>
            ))}
          </div>
          <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px', fontSize: 12, fontWeight: 600, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={13} /> Novo job
          </button>
        </div>

        {/* Alert bar */}
        {(pendingTasks > 0 || urgentCount > 0) && (
          <div style={{ margin: '8px 14px 0', background: urgentCount > 0 ? '#fef2f2' : '#fef3c7', border: `0.5px solid ${urgentCount > 0 ? '#fca5a5' : '#fcd34d'}`, borderRadius: 7, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: urgentCount > 0 ? '#991b1b' : '#92400e' }}>
            {urgentCount > 0 && <><span style={{ fontWeight: 700 }}>{urgentCount} tasks urgentes</span> precisam de atenção imediata.</>}
            {urgentCount === 0 && <><span style={{ fontWeight: 600 }}>{pendingTasks} tasks pendentes</span> nos jobs ativos.</>}
          </div>
        )}

        {/* KANBAN */}
        {view === 'kanban' && (
          <div style={{ padding: '10px 14px 14px', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${JOB_KANBAN_COLUMNS.length}, minmax(210px, 1fr))`, gap: 8, minWidth: 1100 }}>
              {JOB_KANBAN_COLUMNS.map(col => {
                const colJobs = fj.filter(j => (col.statuses as readonly string[]).includes(j.status))
                const colValue = colJobs.reduce((s, j) => s + j.totalValue, 0)
                return (
                  <div key={col.id}
                    onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => onDrop(col.id)}
                    style={{
                      background: dragOver === col.id ? `${col.color}18` : '#f3f4f6',
                      borderRadius: 10, padding: 10, minHeight: 140,
                      border: dragOver === col.id ? `2px dashed ${col.color}` : '2px solid transparent',
                      transition: 'all .15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 9 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', flex: 1 }}>{col.label}</span>
                      <span style={{ fontSize: 9, color: '#9ca3af', marginRight: 4 }}>
                        {colValue > 0 ? `R$${(colValue/1000).toFixed(0)}k` : ''}
                      </span>
                      <span style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 9, padding: '1px 6px', fontSize: 10, color: '#6b7280' }}>{colJobs.length}</span>
                    </div>
                    {colJobs.map(job => (
                      <JobCard key={job.id} job={job}
                        onClick={() => setSelectedJob(job)}
                        onOpenDetail={() => router.push(`/jobs/${job.id}`)}
                        onDragStart={() => { dragRef.current = { id: job.id, fromCol: col.id } }}
                      />
                    ))}
                    {colJobs.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '16px 0', color: '#d1d5db', fontSize: 11 }}>Vazio</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* LIST */}
        {view === 'list' && (
          <div style={{ padding: '10px 14px 14px' }}>
            <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 110px 150px 80px', gap: 8, padding: '8px 14px', borderBottom: '0.5px solid #f3f4f6', background: '#f9fafb' }}>
                {['Job / Cliente', 'Tipo', 'Data', 'Valor', 'Status', ''].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</div>
                ))}
              </div>
              {fj.length === 0 && <div style={{ padding: '28px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Nenhum job encontrado</div>}
              {fj.map((job, i) => {
                const sc = JOB_STATUS_COLORS[job.status]
                const tc = TYPE_COLORS[job.type]
                const overduePmt = job.payments.some(p => p.status !== 'pago' && new Date(p.dueDate) < new Date())
                const pendingTasksN = job.tasks.filter(t => !t.completed).length
                return (
                  <div key={job.id}
                    onClick={() => setSelectedJob(job)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 110px 150px 80px', gap: 8, padding: '10px 14px', borderBottom: i < fj.length - 1 ? '0.5px solid #f3f4f6' : 'none', cursor: 'pointer', transition: 'background .1s', borderLeft: overduePmt ? '3px solid #ef4444' : '3px solid transparent' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f9fafb')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{job.title}</div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {job.clientName}
                        {pendingTasksN > 0 && <span style={{ padding: '1px 4px', borderRadius: 3, background: '#fee2e2', color: '#991b1b', fontSize: 9, fontWeight: 600 }}>{pendingTasksN} tasks</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: tc.bg, color: tc.tc }}>{TYPE_LABEL[job.type]}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                      {job.scheduledAt ? new Date(job.scheduledAt).toLocaleDateString('pt-BR') : '—'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>R${job.totalValue.toLocaleString('pt-BR')}</span>
                      {job.pendingValue > 0 && <span style={{ fontSize: 9, color: overduePmt ? '#ef4444' : '#f59e0b', fontWeight: 500 }}>R${job.pendingValue.toLocaleString('pt-BR')} pend.</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.tc }}>{JOB_STATUS_LABELS[job.status]}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={e => { e.stopPropagation(); setSelectedJob(job) }}
                        style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '0.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>
                        Abrir
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {selectedJob && (
        <JobSlideOver
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onStatusChange={newStatus => {
            setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, status: newStatus } : j))
            setSelectedJob(prev => prev ? { ...prev, status: newStatus } : null)
            router.refresh()
          }}
        />
      )}
      <NewJobSlideOver
        open={showNew}
        onClose={() => setShowNew(false)}
        onSave={job => { setJobs(prev => [job as JobFull, ...prev]); setShowNew(false); router.refresh() }}
      />
    </>
  )
}

// ─── JOB CARD ─────────────────────────────────────────────────────────────────
function JobCard({ job, onClick, onOpenDetail, onDragStart }: {
  job: JobFull
  onClick: () => void
  onOpenDetail: () => void
  onDragStart: () => void
}) {
  const sc           = JOB_STATUS_COLORS[job.status]
  const tc           = TYPE_COLORS[job.type]
  const pendingTasks = job.tasks.filter(t => !t.completed).length
  const urgentTasks  = job.tasks.filter(t => !t.completed && t.priority === 'urgente').length
  const overduePmt   = job.payments.some(p => p.status !== 'pago' && p.status !== 'estornado' && new Date(p.dueDate) < new Date())
  const daysUntil    = job.scheduledAt ? Math.ceil((new Date(job.scheduledAt).getTime() - Date.now()) / 86400_000) : null
  const isOverdue    = daysUntil !== null && daysUntil < 0 && !['entregue','finalizado','cancelado'].includes(job.status)

  return (
    <div
      draggable onDragStart={onDragStart} onClick={onClick}
      style={{
        background: '#fff',
        border: (isOverdue || overduePmt) ? '1px solid #fca5a5' : '0.5px solid #e5e7eb',
        borderLeft: urgentTasks > 0 ? '3px solid #ef4444' : isOverdue ? '3px solid #f59e0b' : '3px solid transparent',
        borderRadius: 9, padding: '10px 11px', marginBottom: 7,
        cursor: 'pointer', userSelect: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,.05)',
        transition: 'box-shadow .1s, transform .1s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.05)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: tc.bg, color: tc.tc }}>{TYPE_LABEL[job.type]}</span>
        <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 500, background: sc.bg, color: sc.tc }}>{JOB_STATUS_LABELS[job.status]}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 2, lineHeight: 1.3 }}>{job.title}</div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 7 }}>{job.clientName}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 10, color: isOverdue ? '#ef4444' : '#6b7280', fontWeight: isOverdue ? 600 : 400 }}>
          {job.scheduledAt
            ? isOverdue
              ? `Atrasado (${Math.abs(daysUntil!)}d)`
              : daysUntil !== null && daysUntil <= 30
                ? `em ${daysUntil}d`
                : new Date(job.scheduledAt).toLocaleDateString('pt-BR')
            : '—'}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>R${job.totalValue.toLocaleString('pt-BR')}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {job.pendingValue > 0 && (
          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: overduePmt ? '#fee2e2' : '#fef3c7', color: overduePmt ? '#991b1b' : '#92400e', fontWeight: 500 }}>
            R${job.pendingValue.toLocaleString('pt-BR')}
          </span>
        )}
        {job.sdCount > 0 && (
          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#f3f4f6', color: '#6b7280' }}>
            {job.sdCount} SD
          </span>
        )}
        {urgentTasks > 0 && (
          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>
            {urgentTasks} urgente
          </span>
        )}
        {urgentTasks === 0 && pendingTasks > 0 && (
          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#f3f4f6', color: '#6b7280' }}>
            {pendingTasks} tasks
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onOpenDetail() }}
          style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 7px', borderRadius: 4, border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#6b7280', cursor: 'pointer' }}
          title="Abrir pagina do job"
        >
          {job.editorName || '↗'}
        </button>
      </div>
    </div>
  )
}

'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Search, HardDrive, ArrowLeft, Monitor, Database, ExternalLink } from 'lucide-react'

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface HdJobEntry {
  jobId: string
  jobTitle: string
  clientName: string
  eventDate: string
  backedUpAt: string
  sizeGb: number
  photosCount: number
  jobType: 'evento' | 'ensaio' | 'diaria'
}

interface HdBackup {
  id: string
  name: string
  capacity: string
  usedGb: number
  type: 'SSD' | 'HD' | 'NAS'
  purpose: 'edicao' | 'arquivo' | 'ambos'
  jobs: HdJobEntry[]
}

// ─── DADOS ────────────────────────────────────────────────────────────────────
const INITIAL_HDS: HdBackup[] = []
const ALL_JOBS: { job: HdJobEntry; hds: { id: string; name: string; type: string }[] }[] = []

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const HD_TYPE_ICON: Record<string, React.ReactNode> = {
  SSD: <Monitor size={11} />,
  HD:  <HardDrive size={11} />,
  NAS: <Database size={11} />,
}

const JOB_TYPE_COLORS: Record<string, { bg: string; tc: string }> = {
  evento: { bg: '#ede9fe', tc: '#5b21b6' },
  ensaio: { bg: '#dbeafe', tc: '#1e40af' },
  diaria: { bg: '#ccfbf1', tc: '#0f766e' },
}

const HD_CHIP_COLORS: Record<string, { bg: string; tc: string; border: string }> = {
  SSD: { bg: '#f5f3ff', tc: '#5b21b6', border: '#c4b5fd' },
  HD:  { bg: '#f0f9ff', tc: '#0369a1', border: '#7dd3fc' },
  NAS: { bg: '#f0fdf4', tc: '#166534', border: '#86efac' },
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
export default function ArquivoPage() {
  const [search, setSearch]         = useState('')
  const [hdFilter, setHdFilter]     = useState('todos')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [anoFilter, setAnoFilter]   = useState('todos')

  const filtered = useMemo(() => {
    return ALL_JOBS.filter(entry => {
      const q = search.toLowerCase()
      if (q && !entry.job.clientName.toLowerCase().includes(q) && !entry.job.jobTitle.toLowerCase().includes(q)) return false
      if (hdFilter !== 'todos' && !entry.hds.some(h => h.id === hdFilter)) return false
      if (tipoFilter !== 'todos' && entry.job.jobType !== tipoFilter) return false
      if (anoFilter !== 'todos' && !entry.job.eventDate.startsWith(anoFilter)) return false
      return true
    })
  }, [search, hdFilter, tipoFilter, anoFilter])

  const totalJobs   = filtered.length
  const totalPhotos = filtered.reduce((s, e) => s + e.job.photosCount, 0)
  const totalGb     = filtered.reduce((s, e) => s + e.job.sizeGb, 0)
  const totalHds    = INITIAL_HDS.length

  const pillStyle = (active: boolean) => ({
    padding: '4px 11px', fontSize: 11, fontWeight: active ? 600 : 400,
    background: active ? '#7c3aed' : '#fff', color: active ? '#fff' : '#6b7280',
    border: `0.5px solid ${active ? '#7c3aed' : '#e5e7eb'}`, borderRadius: 20,
    cursor: 'pointer' as const,
  })

  return (
    <>
      <Header title="Arquivo de Jobs nos HDs" />
      <div className="flex-1 overflow-y-auto" style={{ padding: 14, background: '#f9fafb' }}>

        {/* ── Voltar ── */}
        <div style={{ marginBottom: 12 }}>
          <Link href="/sd-cards" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>
            <ArrowLeft size={13} /> SD Cards & HDs
          </Link>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 14 }}>
          {[
            { label: 'Jobs únicos',    value: totalJobs,                             border: '#7c3aed', vc: '#5b21b6' },
            { label: 'Total de fotos', value: totalPhotos.toLocaleString('pt-BR'),   border: '#2563eb', vc: '#1e40af' },
            { label: 'Total em GB',    value: `${totalGb} GB`,                       border: '#059669', vc: '#166534' },
            { label: 'HDs no arquivo', value: totalHds,                              border: '#f59e0b', vc: '#92400e' },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${k.border}`, borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.vc }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* ── Busca ── */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou título do job..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 8, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
        </div>

        {/* ── Filtros ── */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, width: 42 }}>HD:</span>
            <button style={pillStyle(hdFilter === 'todos')} onClick={() => setHdFilter('todos')}>Todos</button>
            {INITIAL_HDS.map(hd => (
              <button key={hd.id} style={pillStyle(hdFilter === hd.id)} onClick={() => setHdFilter(hd.id)}>{hd.name}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, width: 42 }}>Tipo:</span>
            {(['todos', 'evento', 'ensaio', 'diaria'] as const).map(t => (
              <button key={t} style={pillStyle(tipoFilter === t)} onClick={() => setTipoFilter(t)}>
                {t === 'todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, width: 42 }}>Ano:</span>
            {(['todos', '2026', '2025'] as const).map(a => (
              <button key={a} style={pillStyle(anoFilter === a)} onClick={() => setAnoFilter(a)}>
                {a === 'todos' ? 'Qualquer' : a}
              </button>
            ))}
          </div>
        </div>

        {/* ── Resultados ── */}
        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>
          {filtered.length} job{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </div>

        {/* ── Lista ── */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '40px 14px', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
              Nenhum job encontrado com os filtros selecionados.
            </div>
          )}
          {filtered.map((entry, idx) => {
            const tc = JOB_TYPE_COLORS[entry.job.jobType] ?? JOB_TYPE_COLORS.evento
            return (
              <div key={entry.job.jobId}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: idx < filtered.length - 1 ? '0.5px solid #f3f4f6' : 'none' }}>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '3px 7px', borderRadius: 4, background: tc.bg, color: tc.tc, flexShrink: 0, textTransform: 'capitalize' }}>
                  {entry.job.jobType}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.job.jobTitle}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                    {entry.job.clientName} · {fmtDate(entry.job.eventDate)} · {entry.job.photosCount.toLocaleString('pt-BR')} fotos · {entry.job.sizeGb} GB
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 220 }}>
                  {entry.hds.map(h => {
                    const chip = HD_CHIP_COLORS[h.type] ?? HD_CHIP_COLORS.HD
                    return (
                      <span key={h.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 4, background: chip.bg, color: chip.tc, border: `0.5px solid ${chip.border}` }}>
                        {HD_TYPE_ICON[h.type]} {h.name}
                      </span>
                    )
                  })}
                </div>
                <a href={`/jobs/${entry.job.jobId}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#7c3aed', textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>
                  <ExternalLink size={10} /> Ver job
                </a>
              </div>
            )
          })}
        </div>

      </div>
    </>
  )
}

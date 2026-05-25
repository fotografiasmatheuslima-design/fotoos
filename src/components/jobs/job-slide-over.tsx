'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_STATUS_TRANSITIONS,
  type JobStatus, type JobType,
} from '@/lib/db/schema/enums'
import {
  X, User, FileText, DollarSign, HardDrive, History,
  CheckSquare, Square, ExternalLink, Plus, Phone,
  MapPin, Navigation, AlertTriangle, ShieldCheck, Shield,
  Trash2, RotateCcw, CheckCircle2, Pencil,
} from 'lucide-react'
import type { JobSdUsage } from '@/lib/services/jobs-data'
import {
  deleteJobAction,
  deleteTaskAction,
  deletePaymentAction,
  saveJobNotesAction,
  updateJobAction,
} from '@/lib/actions/jobs'

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface EventLocations {
  makingOf?:   { name: string; address?: string; time?: string } | null
  ceremony?:   { name: string; address?: string; time?: string } | null
  reception?:  { name: string; address?: string; time?: string } | null
  arrivalTime?: string | null
}

interface MockJob {
  id: string; title: string; type: JobType; status: JobStatus
  clientName?: string | null; clientPhone?: string | null; clientEmail?: string | null
  scheduledAt?: string | null; endsAt?: string | null
  location?: { name: string; address?: string; city?: string } | string | null
  eventLocations?: EventLocations | null
  totalValue: number; paidValue: number
  sdCount: number; editorName?: string | null; editorInitials?: string | null
  sdUsages?: JobSdUsage[]
  tags: string[]; driveLink?: string | null; previewLink?: string | null; whatsappLink?: string | null
  notes?: string | null
  tasks: { id: string; title: string; completed: boolean; priority: string }[]
  payments: { id: string; type: string; amount: number; status: string; dueDate: string; paidAt?: string | null; method?: string | null }[]
  contract?: { id: string; status: string; sentAt?: string | null; signedAt?: string | null } | null
  history?: { id: string; action: string; description?: string | null; actorName?: string | null; createdAt: string; toStatus?: string | null }[]
}

interface Props { job: MockJob; onClose: () => void; onStatusChange: (s: JobStatus) => void; fullPage?: boolean; onDeleted?: () => void }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Visão Geral' },
  { id: 'financial', label: 'Pagamentos'  },
  { id: 'sd',        label: 'SD Cards'    },
  { id: 'contract',  label: 'Contrato'    },
  { id: 'history',   label: 'Histórico'   },
] as const

const TYPE_LABEL: Record<JobType, string> = { ensaio: 'Ensaio', evento: 'Evento', diaria: 'Diária' }
const TYPE_COLORS: Record<JobType, { bg: string; tc: string }> = {
  ensaio: { bg: '#dbeafe', tc: '#1e40af' },
  evento: { bg: '#ede9fe', tc: '#5b21b6' },
  diaria: { bg: '#ccfbf1', tc: '#0f766e' },
}
const PRIO: Record<string, { bg: string; tc: string; label: string }> = {
  urgente: { bg: '#fee2e2', tc: '#991b1b', label: 'urgente' },
  alta:    { bg: '#fef3c7', tc: '#92400e', label: 'alta'    },
  normal:  { bg: '#f3f4f6', tc: '#6b7280', label: 'normal'  },
  baixa:   { bg: '#f0fdf4', tc: '#166534', label: 'baixa'   },
}
const PAYMENT_LABEL: Record<string, string> = { sinal: 'Sinal', parcela: 'Parcela', saldo: 'Saldo', avulso: 'Avulso' }
const METHOD_LABEL:  Record<string, string> = { pix: 'PIX', cartao_credito: 'Cartão', cartao_debito: 'Débito', dinheiro: 'Dinheiro', transferencia: 'Transf.' }
const SD_STATUS_CFG: Record<string, { label: string; bg: string; tc: string; border: string }> = {
  pendente_backup:  { label: 'Backup pendente', bg: '#fee2e2', tc: '#991b1b', border: '#ef4444' },
  backup_realizado: { label: 'Backup OK',       bg: '#fef3c7', tc: '#92400e', border: '#f59e0b' },
  seguro_formatar:  { label: 'Seguro formatar', bg: '#dbeafe', tc: '#1e40af', border: '#2563eb' },
  formatado:        { label: 'Formatado',        bg: '#dcfce7', tc: '#166534', border: '#059669' },
}
const KNOWN_HDS = ['SSD Samsung 2TB', 'HD WD Backup', 'HD Arquivo', 'NAS Studio', 'SSD Portátil 1TB']

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return 'R$' + n.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }
function fmtDate(d: string) { const [y,m,day] = d.split('-'); return `${day}/${m}/${y}` }
function wazeUrl(q: string) { return `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes` }
function mapsUrl(q: string) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` }
function waLink(phone: string, name?: string | null) {
  const num = phone.replace(/\D/g,'')
  const msg = encodeURIComponent(`Olá${name ? ', ' + name.split(' ')[0] : ''}! `)
  return `https://wa.me/55${num}?text=${msg}`
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function Pill({ children, bg, tc }: { children: React.ReactNode; bg: string; tc: string }) {
  return <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: bg, color: tc }}>{children}</span>
}

function Divider() {
  return <div style={{ height: '0.5px', background: '#f3f4f6', margin: '14px 0' }} />
}

function SectionLabel({ children }: { children: string }) {
  return <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>{children}</div>
}

// Map link row
function LocationRow({ icon, label, name, address, time }: { icon: string; label: string; name: string; address?: string; time?: string }) {
  const query = address ? `${name}, ${address}` : name
  return (
    <div style={{ background: '#f9fafb', border: '0.5px solid #f3f4f6', borderRadius: 10, overflow: 'hidden', marginBottom: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px' }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginTop: 1 }}>{name}</div>
          {address && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{address}</div>}
        </div>
        {time && <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed', flexShrink: 0 }}>{time}h</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '0.5px solid #f3f4f6' }}>
        <a href={wazeUrl(query)} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', fontSize: 11, fontWeight: 600, color: '#00bcd4', textDecoration: 'none', borderRight: '0.5px solid #f3f4f6', background: '#f0fdfe' }}>
          <Navigation size={12} /> Waze
        </a>
        <a href={mapsUrl(query)} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', fontSize: 11, fontWeight: 600, color: '#ea4335', textDecoration: 'none', background: '#fff5f5' }}>
          <MapPin size={12} /> Google Maps
        </a>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
// ─── CONFIRM MODAL ───────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = 'Confirmar', danger = true, onConfirm, onCancel, loading = false }: {
  title: string; message: string; confirmLabel?: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 420, width: 'calc(100% - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={loading}
            style={{ padding: '8px 16px', fontSize: 13, background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: danger ? '#ef4444' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function JobSlideOver({ job, onClose, onStatusChange, fullPage = false, onDeleted }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [tasks, setTasks]         = useState(job.tasks)
  const [notes, setNotes]         = useState(job.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState('')
  const [editingJob, setEditingJob]       = useState(false)
  const [editSaving,  setEditSaving]      = useState(false)
  const [editForm, setEditForm] = useState({
    title:        job.title,
    scheduledAt:  job.scheduledAt ? job.scheduledAt.slice(0, 10) : '',
    totalValue:   String(job.totalValue),
    driveLink:    job.driveLink    ?? '',
    previewLink:  job.previewLink  ?? '',
    whatsappLink: job.whatsappLink ?? '',
  })

  useEffect(() => {
    if (!fullPage) document.body.style.overflow = 'hidden'
    return () => { if (!fullPage) document.body.style.overflow = '' }
  }, [fullPage])

  useEffect(() => { setTasks(job.tasks) }, [job.id])

  async function handleDeleteJob() {
    setDeleting(true)
    const result = await deleteJobAction(job.id)
    setDeleting(false)
    if (result.error) { setDeleteError(result.error); setConfirmDelete(false); return }
    setConfirmDelete(false)
    if (onDeleted) onDeleted()
    else { onClose(); router.refresh() }
  }

  async function saveEditJob() {
    if (!editForm.title.trim()) return
    setEditSaving(true)
    await updateJobAction(job.id, {
      title:       editForm.title.trim(),
      scheduledAt: editForm.scheduledAt || null,
      totalValue:  editForm.totalValue  || '0',
      driveLink:   editForm.driveLink   || null,
      previewLink: editForm.previewLink || null,
      whatsappLink: editForm.whatsappLink || null,
    })
    setEditSaving(false)
    setEditingJob(false)
    router.refresh()
  }

  const sc          = JOB_STATUS_COLORS[job.status]
  const tc          = TYPE_COLORS[job.type]
  const nextStatuses = JOB_STATUS_TRANSITIONS[job.status]
  const pendingValue = job.totalValue - job.paidValue
  const paidPct      = job.totalValue > 0 ? (job.paidValue / job.totalValue) * 100 : 0
  const pendingTasks = tasks.filter(t => !t.completed).length
  const urgentTasks  = tasks.filter(t => !t.completed && t.priority === 'urgente').length

  return (
    <div style={fullPage
      ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
      : { position: 'fixed', inset: 0, zIndex: 200 }
    }>
      {!fullPage && (
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(2px)' }} />
      )}

      <div style={{
        ...(fullPage ? {} : { position: 'absolute', right: 0, top: 0, bottom: 0 }),
        width: fullPage ? '100%' : 600,
        background: '#fff', display: 'flex', flexDirection: 'column',
        boxShadow: fullPage ? 'none' : '-8px 0 40px rgba(0,0,0,.15)',
      }}>

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <div style={{ padding: '14px 16px 0', background: '#fff', borderBottom: '0.5px solid #f0f0f0' }}>

          {/* Row 1: tipo + status + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <Pill bg={tc.bg} tc={tc.tc}>{TYPE_LABEL[job.type]}</Pill>
            <Pill bg={sc.bg} tc={sc.tc}>{JOB_STATUS_LABELS[job.status]}</Pill>
            {urgentTasks > 0 && (
              <Pill bg="#fee2e2" tc="#991b1b">⚠ {urgentTasks} urgente{urgentTasks > 1 ? 's' : ''}</Pill>
            )}
            <div style={{ flex: 1 }} />
            {job.clientPhone && (
              <a href={waLink(job.clientPhone, job.clientName)} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#dcfce7', color: '#166534', borderRadius: 7, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                <Phone size={12} /> WhatsApp
              </a>
            )}
            <button onClick={() => { setEditForm({ title: job.title, scheduledAt: job.scheduledAt ? job.scheduledAt.slice(0,10) : '', totalValue: String(job.totalValue), driveLink: job.driveLink ?? '', previewLink: job.previewLink ?? '', whatsappLink: job.whatsappLink ?? '' }); setEditingJob(true) }}
              title="Editar job"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 4, marginLeft: 2 }}>
              <Pencil size={14} />
            </button>
            <button onClick={() => { setDeleteError(''); setConfirmDelete(true) }}
              title="Excluir job"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: 4, marginLeft: 2 }}>
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, marginLeft: 2 }}>
              <X size={18} />
            </button>
          </div>

          {/* Row 2: title + client — or edit form */}
          {editingJob ? (
            <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Editar job</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 8 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Título *</div>
                  <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%', padding: '7px 9px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 7, outline: 'none', background: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Data do evento</div>
                  <input type="date" value={editForm.scheduledAt} onChange={e => setEditForm(p => ({ ...p, scheduledAt: e.target.value }))}
                    style={{ width: '100%', padding: '7px 9px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 7, outline: 'none', background: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Valor total (R$)</div>
                  <input type="number" value={editForm.totalValue} onChange={e => setEditForm(p => ({ ...p, totalValue: e.target.value }))}
                    style={{ width: '100%', padding: '7px 9px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 7, outline: 'none', background: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Link Drive</div>
                  <input value={editForm.driveLink} onChange={e => setEditForm(p => ({ ...p, driveLink: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    style={{ width: '100%', padding: '7px 9px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 7, outline: 'none', background: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Link Preview</div>
                  <input value={editForm.previewLink} onChange={e => setEditForm(p => ({ ...p, previewLink: e.target.value }))}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '7px 9px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 7, outline: 'none', background: '#fff' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={saveEditJob} disabled={editSaving || !editForm.title.trim()}
                  style={{ padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                  {editSaving ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button onClick={() => setEditingJob(false)}
                  style={{ padding: '6px 12px', background: 'transparent', color: '#6b7280', border: '0.5px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{job.title}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{job.clientName}</div>
              </div>

              {/* Row 3: key stats strip */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                {job.scheduledAt && (
                  <div>
                    <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px' }}>Data</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{new Date(job.scheduledAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px' }}>Total</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{fmt(job.totalValue)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px' }}>Recebido</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>{fmt(job.paidValue)}</div>
                </div>
                {pendingValue > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px' }}>Pendente</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{fmt(pendingValue)}</div>
                  </div>
                )}
                {pendingTasks > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px' }}>Tasks</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>{pendingTasks} pend.</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Financial progress bar */}
          <div style={{ height: 4, borderRadius: 2, background: '#f3f4f6', marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: paidPct === 100 ? '#059669' : '#7c3aed', width: paidPct + '%', transition: 'width .4s' }} />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginTop: 2 }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '8px 14px', fontSize: 11, cursor: 'pointer',
                    border: 'none', borderBottom: isActive ? '2px solid #7c3aed' : '2px solid transparent',
                    background: 'transparent',
                    color: isActive ? '#7c3aed' : '#9ca3af',
                    fontWeight: isActive ? 700 : 400,
                    whiteSpace: 'nowrap',
                  }}
                >{tab.label}</button>
              )
            })}
          </div>
        </div>

        {/* ══ CONTENT ═════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f9fafb' }}>
          {activeTab === 'overview'  && <TabOverview  job={job} tasks={tasks} setTasks={setTasks} nextStatuses={nextStatuses} onStatusChange={onStatusChange} notes={notes} setNotes={setNotes} />}
          {activeTab === 'financial' && <TabFinancial job={job} />}
          {activeTab === 'sd'        && <TabSD        job={job} />}
          {activeTab === 'contract'  && <TabContract  job={job} />}
          {activeTab === 'history'   && <TabHistory   job={job} />}
        </div>
      </div>

      {/* ─── MODAL: Erro ao excluir ─── */}
      {deleteError && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setDeleteError('')} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 420, width: 'calc(100% - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Não é possível excluir</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{deleteError}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteError('')}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Confirmar exclusão ─── */}
      {confirmDelete && (
        <ConfirmModal
          title="Excluir job?"
          message={`Tem certeza que deseja excluir "${job.title}"? Esta ação não pode ser desfeita. Jobs com pagamentos confirmados ou SD cards com backup pendente não podem ser excluídos.`}
          confirmLabel="Sim, excluir"
          onConfirm={handleDeleteJob}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: VISÃO GERAL
// ══════════════════════════════════════════════════════════════════════════════
function TabOverview({ job, tasks, setTasks, nextStatuses, onStatusChange, notes, setNotes }: {
  job: MockJob; tasks: MockJob['tasks']; setTasks: (t: MockJob['tasks']) => void
  nextStatuses: JobStatus[]; onStatusChange: (s: JobStatus) => void
  notes: string; setNotes: (s: string) => void
}) {
  const [newTask, setNewTask]       = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const locs = job.eventLocations

  function toggleTask(id: string) { setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)) }

  async function removeTask(id: string) {
    setTasks(tasks.filter(t => t.id !== id))
    // Se o ID não começa com 'nt' (local), persistir exclusão
    if (!id.startsWith('nt')) {
      await deleteTaskAction(id)
    }
  }

  function addTask() {
    if (!newTask.trim()) return
    setTasks([...tasks, { id: 'nt' + Date.now(), title: newTask, completed: false, priority: 'normal' }])
    setNewTask('')
  }

  async function handleNotesSave() {
    await saveJobNotesAction(job.id, notes)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const pending   = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)
  const overduePayments = job.payments.filter(p => p.status !== 'pago' && new Date(p.dueDate) < new Date())
  const nextPayment = job.payments.filter(p => p.status === 'pendente' || p.status === 'atrasado').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── ALERTAS ── */}
      {(overduePayments.length > 0 || pending.some(t => t.priority === 'urgente')) && (
        <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.4px' }}>⚠ Atenção</div>
          {overduePayments.map(p => (
            <div key={p.id} style={{ fontSize: 11, color: '#991b1b', marginBottom: 3 }}>
              Pagamento vencido: {PAYMENT_LABEL[p.type] ?? p.type} de {fmt(p.amount)} — {fmtDate(p.dueDate)}
            </div>
          ))}
          {pending.filter(t => t.priority === 'urgente').map(t => (
            <div key={t.id} style={{ fontSize: 11, color: '#991b1b', marginBottom: 3 }}>Task urgente: {t.title}</div>
          ))}
        </div>
      )}

      {/* ── CLIENTE + CONTATO ── */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px' }}>
        <SectionLabel>Cliente</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#ede9fe', color: '#5b21b6', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {(job.clientName ?? '?').split(' ').map(w => w[0]).slice(0,2).join('')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{job.clientName ?? '—'}</div>
            {job.clientPhone && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{job.clientPhone}</div>}
            {job.clientEmail && <div style={{ fontSize: 11, color: '#6b7280' }}>{job.clientEmail}</div>}
          </div>
          {job.clientPhone && (
            <a href={waLink(job.clientPhone, job.clientName)} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#25d366', color: '#fff', borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
              <Phone size={14} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* ── EVENTO + LOCAIS ── */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px' }}>
        <SectionLabel>Evento</SectionLabel>

        {/* Date + time strip */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {job.scheduledAt && (
            <div style={{ flex: 1, background: '#f5f3ff', borderRadius: 9, padding: '9px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>Data</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#5b21b6' }}>{new Date(job.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</div>
              <div style={{ fontSize: 10, color: '#7c3aed' }}>{new Date(job.scheduledAt).getFullYear()}</div>
            </div>
          )}
          {job.scheduledAt && (
            <div style={{ flex: 1, background: '#eff6ff', borderRadius: 9, padding: '9px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#2563eb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>Início</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1e40af' }}>{new Date(job.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</div>
              {job.endsAt && <div style={{ fontSize: 10, color: '#2563eb' }}>até {new Date(job.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</div>}
            </div>
          )}
          {locs?.arrivalTime && (
            <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 9, padding: '9px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#059669', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>Chegada</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#166534' }}>{locs.arrivalTime}h</div>
            </div>
          )}
        </div>

        {/* Locations from eventLocations */}
        {locs ? (
          <>
            {locs.makingOf  && <LocationRow icon="📷" label="Making-of / Preparativos" name={locs.makingOf.name}  address={locs.makingOf.address}  time={locs.makingOf.time} />}
            {locs.ceremony  && <LocationRow icon="💍" label="Cerimônia"                name={locs.ceremony.name}  address={locs.ceremony.address}  time={locs.ceremony.time} />}
            {locs.reception && <LocationRow icon="🥂" label="Recepção / Festa"         name={locs.reception.name} address={locs.reception.address} time={locs.reception.time} />}
          </>
        ) : job.location ? (
          <LocationRow
            icon="📍" label="Local"
            name={typeof job.location === 'string' ? job.location : job.location.name}
            address={typeof job.location === 'object' ? job.location.address ?? job.location.city : undefined}
          />
        ) : (
          <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>Locais não cadastrados</div>
        )}
      </div>

      {/* ── PRÓXIMA AÇÃO ── */}
      {nextStatuses.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px' }}>
          <SectionLabel>Próxima ação</SectionLabel>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {nextStatuses.map(s => {
              const sc2 = JOB_STATUS_COLORS[s]
              const isCritical = s === 'cancelado'
              return (
                <button key={s} onClick={() => onStatusChange(s)}
                  style={{
                    padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${isCritical ? '#fecaca' : '#e5e7eb'}`,
                    background: isCritical ? '#fff' : sc2.bg,
                    color: isCritical ? '#ef4444' : sc2.tc,
                  }}>
                  → {JOB_STATUS_LABELS[s]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── FINANCEIRO RESUMO ── */}
      {nextPayment && (
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px' }}>
          <SectionLabel>Próximo pagamento</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{PAYMENT_LABEL[nextPayment.type] ?? nextPayment.type}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                Vence {fmtDate(nextPayment.dueDate)}
                {nextPayment.method ? ' · ' + (METHOD_LABEL[nextPayment.method] ?? nextPayment.method) : ''}
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: new Date(nextPayment.dueDate) < new Date() ? '#ef4444' : '#111827' }}>
              {fmt(nextPayment.amount)}
            </div>
          </div>
        </div>
      )}

      {/* ── TASKS ── */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.7px' }}>
            Tasks {pending.length > 0 && <span style={{ color: '#f59e0b' }}>({pending.length} pendente{pending.length > 1 ? 's' : ''})</span>}
          </div>
        </div>

        {/* Pending */}
        {pending.map(t => (
          <div key={t.id}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 4px', borderBottom: '0.5px solid #f9fafb' }}>
            <div onClick={() => toggleTask(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, cursor: 'pointer' }}>
              <Square size={15} color="#d1d5db" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: '#374151' }}>{t.title}</span>
            </div>
            {t.priority !== 'normal' && (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: PRIO[t.priority]?.bg, color: PRIO[t.priority]?.tc, fontWeight: 600, flexShrink: 0 }}>
                {PRIO[t.priority]?.label}
              </span>
            )}
            <button onClick={() => removeTask(t.id)}
              title="Excluir task"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}>
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Completed (collapsed) */}
        {completed.length > 0 && (
          <div style={{ marginTop: 6 }}>
            {completed.map(t => (
              <div key={t.id}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 4px', opacity: .5 }}>
                <div onClick={() => toggleTask(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, cursor: 'pointer' }}>
                  <CheckSquare size={15} color="#059669" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: '#6b7280', textDecoration: 'line-through' }}>{t.title}</span>
                </div>
                <button onClick={() => removeTask(t.id)}
                  title="Excluir task"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add task */}
        <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
          <input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="+ Adicionar task..."
            style={{ flex: 1, padding: '7px 10px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 7, outline: 'none', background: '#f9fafb' }}
          />
          <button onClick={addTask}
            style={{ width: 30, height: 30, borderRadius: 7, background: '#7c3aed', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            +
          </button>
        </div>
      </div>

      {/* ── LINKS RÁPIDOS ── */}
      {(job.driveLink || job.previewLink) && (
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px' }}>
          <SectionLabel>Links</SectionLabel>
          <div style={{ display: 'flex', gap: 7 }}>
            {job.driveLink && (
              <a href={job.driveLink} target="_blank" rel="noreferrer"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px', background: '#f5f3ff', color: '#7c3aed', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                <ExternalLink size={12} /> Drive
              </a>
            )}
            {job.previewLink && (
              <a href={job.previewLink} target="_blank" rel="noreferrer"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px', background: '#eff6ff', color: '#2563eb', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                <ExternalLink size={12} /> Prévia
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── OBSERVAÇÕES ── */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.7px' }}>Observações</div>
          {notesSaved && <span style={{ fontSize: 10, color: '#059669', fontWeight: 500 }}>✓ Salvo</span>}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anotações internas sobre este job..."
          style={{
            width: '100%', minHeight: 80, padding: '9px 11px', fontSize: 12,
            border: '0.5px solid #e5e7eb', borderRadius: 9, resize: 'vertical',
            outline: 'none', fontFamily: 'inherit', lineHeight: 1.6,
            background: '#f9fafb', color: '#374151',
          }}
        />
        <button onClick={handleNotesSave}
          style={{ marginTop: 7, padding: '6px 14px', fontSize: 11, fontWeight: 600, background: '#f5f3ff', color: '#7c3aed', border: '0.5px solid #ddd6fe', borderRadius: 7, cursor: 'pointer' }}>
          Salvar observações
        </button>
      </div>

    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: PAGAMENTOS
// ══════════════════════════════════════════════════════════════════════════════
function TabFinancial({ job }: { job: MockJob }) {
  const [localPayments, setLocalPayments] = useState(job.payments)
  const [deletePayId,   setDeletePayId]   = useState<string | null>(null)
  const [deletingPay,   setDeletingPay]   = useState(false)
  const [payError,      setPayError]      = useState('')

  const total   = job.totalValue
  const paid    = job.paidValue
  const pending = total - paid
  const pct     = total > 0 ? (paid / total) * 100 : 0

  const deletingPayment = localPayments.find(p => p.id === deletePayId)

  async function confirmDeletePayment() {
    if (!deletePayId) return
    setDeletingPay(true)
    const result = await deletePaymentAction(deletePayId)
    setDeletingPay(false)
    if (result.error) { setPayError(result.error); setDeletePayId(null); return }
    setLocalPayments(prev => prev.filter(p => p.id !== deletePayId))
    setDeletePayId(null)
  }

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Summary */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Total', value: fmt(total), color: '#111827', border: '#7c3aed' },
            { label: 'Recebido', value: fmt(paid), color: '#059669', border: '#059669' },
            { label: 'Pendente', value: fmt(pending), color: pending > 0 ? '#ef4444' : '#059669', border: pending > 0 ? '#ef4444' : '#059669' },
          ].map(k => (
            <div key={k.label} style={{ background: '#f9fafb', borderRadius: 9, padding: '10px 12px', borderTop: `3px solid ${k.border}` }}>
              <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: pct === 100 ? '#059669' : '#7c3aed', width: pct + '%', transition: 'width .4s' }} />
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 5, textAlign: 'right' }}>{pct.toFixed(0)}% recebido</div>
      </div>

      {/* Payment list */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        {localPayments.map((p, i) => {
          const isPago  = p.status === 'pago'
          const isLate  = p.status !== 'pago' && new Date(p.dueDate) < new Date()
          const bg      = isPago ? '#dcfce7' : isLate ? '#fee2e2' : '#fef3c7'
          const tc2     = isPago ? '#166534' : isLate ? '#991b1b' : '#92400e'
          const label   = isPago ? 'Pago' : isLate ? 'Atrasado' : 'Pendente'
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < localPayments.length - 1 ? '0.5px solid #f3f4f6' : 'none', borderLeft: `3px solid ${isPago ? '#059669' : isLate ? '#ef4444' : '#f59e0b'}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{PAYMENT_LABEL[p.type] ?? p.type}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                  {p.method ? (METHOD_LABEL[p.method] ?? p.method) + ' · ' : ''}
                  {isPago && p.paidAt ? 'Pago em ' + fmtDate(p.paidAt.slice(0,10)) : (isLate ? 'Venceu ' : 'Vence ') + fmtDate(p.dueDate)}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: isPago ? '#059669' : isLate ? '#ef4444' : '#111827' }}>{fmt(p.amount)}</div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: bg, color: tc2 }}>{label}</span>
              {!isPago && (
                <button onClick={() => setDeletePayId(p.id)}
                  title="Excluir parcela"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#fca5a5')}>
                  <Trash2 size={13} />
                </button>
              )}
              {isPago && (
                <div style={{ width: 21, flexShrink: 0 }} title="Pagamentos confirmados não podem ser excluídos">
                  <CheckCircle2 size={13} color="#d1d5db" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Aviso de segurança */}
      <div style={{ display: 'flex', gap: 8, padding: '9px 12px', background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: 9 }}>
        <AlertTriangle size={13} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
          Pagamentos já <strong>confirmados (Pago)</strong> não podem ser excluídos para preservar o histórico financeiro.
        </span>
      </div>

      {/* Modal erro */}
      {payError && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setPayError('')} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 400, width: 'calc(100% - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Não é possível excluir</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>{payError}</div>
            <button onClick={() => setPayError('')} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Entendido</button>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {deletePayId && deletingPayment && (
        <ConfirmModal
          title="Excluir parcela?"
          message={`Excluir "${PAYMENT_LABEL[deletingPayment.type] ?? deletingPayment.type}" de ${fmt(deletingPayment.amount)}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={confirmDeletePayment}
          onCancel={() => setDeletePayId(null)}
          loading={deletingPay}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: SD CARDS
// ══════════════════════════════════════════════════════════════════════════════
function TabSD({ job }: { job: MockJob }) {
  const [cards, setCards]       = useState<JobSdUsage[]>(job.sdUsages ?? [])
  const [showAdd, setShowAdd]   = useState(false)
  const [expandedId, setExp]    = useState<string | null>(null)
  const [newCard, setNewCard]   = useState({ label: '', camera: '', backup1: '', backup2: '' })

  const pendingBackup = cards.filter(c => c.status === 'pendente_backup').length
  const totalPhotos   = cards.reduce((s, c) => s + (c.photosCount ?? 0), 0)
  const totalGb       = cards.reduce((s, c) => s + (c.rawSizeGb ?? 0), 0)

  function advanceStatus(id: string) {
    const next: Record<string,string> = { pendente_backup:'backup_realizado', backup_realizado:'seguro_formatar', seguro_formatar:'formatado' }
    setCards(p => p.map(c => c.id === id ? { ...c, status: next[c.status] ?? c.status, safeToFormat: next[c.status]==='formatado' } : c))
  }
  function addCard() {
    if (!newCard.label.trim()) return
    setCards(p => [...p, { id:'nc'+Date.now(), sdLabel:newCard.label.trim(), sdCamera:newCard.camera||null, status:'pendente_backup', backupPrimaryName:newCard.backup1||null, backupSecondaryName:newCard.backup2||null, safeToFormat:false }])
    setNewCard({ label:'',camera:'',backup1:'',backup2:'' }); setShowAdd(false)
  }

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {pendingBackup > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:10 }}>
          <AlertTriangle size={13} color="#ef4444" />
          <span style={{ fontSize:11, color:'#991b1b', fontWeight:600 }}>{pendingBackup} cartão(s) aguardando backup</span>
        </div>
      )}

      <div style={{ background:'#fff', border:'0.5px solid #e5e7eb', borderRadius:12, padding:'13px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', gap:12 }}>
            {totalPhotos > 0 && <div><div style={{ fontSize:9, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.4px' }}>Fotos</div><div style={{ fontSize:15, fontWeight:700, color:'#7c3aed' }}>{totalPhotos.toLocaleString('pt-BR')}</div></div>}
            {totalGb > 0    && <div><div style={{ fontSize:9, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.4px' }}>Volume</div><div style={{ fontSize:15, fontWeight:700, color:'#2563eb' }}>{totalGb} GB</div></div>}
          </div>
          <button onClick={() => setShowAdd(s => !s)}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer' }}>
            + Registrar SD
          </button>
        </div>

        {showAdd && (
          <div style={{ background:'#f9fafb', borderRadius:9, padding:'12px', marginBottom:10 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:8 }}>
              {[{k:'label',p:'SD-001'},{k:'camera',p:'Sony A7 IV'}].map(f => (
                <div key={f.k}>
                  <div style={{ fontSize:9, color:'#9ca3af', marginBottom:3 }}>{f.k === 'label' ? 'Label *' : 'Câmera'}</div>
                  <input value={(newCard as any)[f.k]} onChange={e => setNewCard(p => ({...p,[f.k]:e.target.value}))} placeholder={f.p}
                    style={{ width:'100%', padding:'7px 9px', fontSize:12, border:'0.5px solid #e5e7eb', borderRadius:6, outline:'none', background:'#fff' }} />
                </div>
              ))}
              {[{k:'backup1',label:'HD Backup 1'},{k:'backup2',label:'HD Backup 2'}].map(f => (
                <div key={f.k}>
                  <div style={{ fontSize:9, color:'#9ca3af', marginBottom:3 }}>{f.label}</div>
                  <select value={(newCard as any)[f.k]} onChange={e => setNewCard(p => ({...p,[f.k]:e.target.value}))}
                    style={{ width:'100%', padding:'7px 9px', fontSize:12, border:'0.5px solid #e5e7eb', borderRadius:6, outline:'none', background:'#fff' }}>
                    <option value="">Selecionar...</option>
                    {KNOWN_HDS.map(hd => <option key={hd} value={hd}>{hd}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={addCard} style={{ padding:'6px 14px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>Confirmar</button>
              <button onClick={() => setShowAdd(false)} style={{ padding:'6px 12px', background:'transparent', color:'#6b7280', border:'0.5px solid #e5e7eb', borderRadius:6, fontSize:11, cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}

        {cards.length === 0 && !showAdd && (
          <div style={{ textAlign:'center', padding:'20px 0', color:'#9ca3af' }}>
            <HardDrive size={26} color="#e5e7eb" style={{ marginBottom:6 }} />
            <div style={{ fontSize:12 }}>Nenhum SD registrado — clique em "Registrar SD"</div>
          </div>
        )}

        {cards.map(sd => {
          const sc2  = SD_STATUS_CFG[sd.status] ?? SD_STATUS_CFG['pendente_backup']
          const isEx = expandedId === sd.id
          const nextAction: Record<string,string> = { pendente_backup:'Confirmar backup', backup_realizado:'Marcar seguro formatar', seguro_formatar:'Marcar formatado' }
          return (
            <div key={sd.id} style={{ border:`0.5px solid ${sc2.border}`, borderRadius:10, overflow:'hidden', marginBottom:6 }}>
              <div onClick={() => setExp(isEx ? null : sd.id)}
                style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 12px', cursor:'pointer' }}>
                <HardDrive size={14} color={sc2.border} style={{ flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{sd.sdLabel}</span>
                    {sd.sdCamera && <span style={{ fontSize:10, color:'#6b7280' }}>{sd.sdCamera}</span>}
                    {sd.photosCount && <span style={{ fontSize:9, color:'#9ca3af' }}>{sd.photosCount.toLocaleString('pt-BR')} fotos · {sd.rawSizeGb}GB</span>}
                  </div>
                  <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                    {sd.backupPrimaryName
                      ? <span style={{ fontSize:9, padding:'1px 6px', background:'#f0fdf4', color:'#166534', borderRadius:4, display:'inline-flex', alignItems:'center', gap:3 }}><ShieldCheck size={9}/>{sd.backupPrimaryName}</span>
                      : <span style={{ fontSize:9, padding:'1px 6px', background:'#fef2f2', color:'#ef4444', borderRadius:4 }}>Backup 1 pendente</span>
                    }
                    {sd.backupSecondaryName
                      ? <span style={{ fontSize:9, padding:'1px 6px', background:'#eff6ff', color:'#1e40af', borderRadius:4, display:'inline-flex', alignItems:'center', gap:3 }}><Shield size={9}/>{sd.backupSecondaryName}</span>
                      : <span style={{ fontSize:9, padding:'1px 6px', background:'#f9fafb', color:'#9ca3af', borderRadius:4 }}>Sem backup 2</span>
                    }
                  </div>
                </div>
                <span style={{ fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:4, background:sc2.bg, color:sc2.tc, flexShrink:0 }}>{sc2.label}</span>
              </div>
              {isEx && (
                <div style={{ borderTop:`0.5px solid ${sc2.border}`, padding:'9px 12px', background:'#fafafa', display:'flex', gap:6, flexWrap:'wrap' }}>
                  {sd.status !== 'formatado' && (
                    <button onClick={() => advanceStatus(sd.id)}
                      style={{ padding:'5px 12px', fontSize:11, fontWeight:600, background:sc2.border, color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>
                      {nextAction[sd.status]}
                    </button>
                  )}
                  {sd.status === 'formatado' && <span style={{ fontSize:11, color:'#059669', display:'flex', alignItems:'center', gap:4 }}><CheckCircle2 size={13}/>Formatado e liberado</span>}
                  <button onClick={() => setCards(p => p.filter(c => c.id !== sd.id))}
                    style={{ display:'flex', alignItems:'center', gap:3, padding:'5px 10px', fontSize:11, background:'transparent', color:'#ef4444', border:'0.5px solid #fecaca', borderRadius:6, cursor:'pointer' }}>
                    <Trash2 size={10}/>Remover
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <a href="/sd-cards" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', background:'#fff', border:'0.5px solid #e5e7eb', borderRadius:10, fontSize:12, fontWeight:600, color:'#7c3aed', textDecoration:'none' }}>
        <HardDrive size={13}/> Ver inventário completo de SD Cards
      </a>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: CONTRATO
// ══════════════════════════════════════════════════════════════════════════════
function TabContract({ job }: { job: MockJob }) {
  const c = job.contract
  const statusCfg: Record<string,{label:string;bg:string;tc:string}> = {
    rascunho:   { label:'Rascunho',   bg:'#f3f4f6', tc:'#6b7280' },
    enviado:    { label:'Enviado',    bg:'#fef3c7', tc:'#92400e' },
    assinado:   { label:'Assinado',   bg:'#dcfce7', tc:'#166534' },
    cancelado:  { label:'Cancelado',  bg:'#fee2e2', tc:'#991b1b' },
  }
  const cs = c ? (statusCfg[c.status] ?? statusCfg['rascunho']) : null

  return (
    <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ background:'#fff', border:'0.5px solid #e5e7eb', borderRadius:12, padding:'14px' }}>
        <SectionLabel>Contrato</SectionLabel>
        {c ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:6, background:cs!.bg, color:cs!.tc }}>{cs!.label}</span>
              </div>
            </div>
            {c.sentAt   && <div style={{ fontSize:11, color:'#6b7280', marginBottom:4 }}>Enviado em: {fmtDate(c.sentAt.slice(0,10))}</div>}
            {c.signedAt && <div style={{ fontSize:11, color:'#059669', marginBottom:8 }}>✓ Assinado em: {fmtDate(c.signedAt.slice(0,10))}</div>}
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'16px 0', color:'#9ca3af' }}>
            <FileText size={28} color="#e5e7eb" style={{ marginBottom:8 }} />
            <div style={{ fontSize:12 }}>Nenhum contrato gerado</div>
          </div>
        )}
        <a href={`/contratos/gerar?jobId=${job.id}`}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px', background:'#7c3aed', color:'#fff', borderRadius:9, fontSize:12, fontWeight:600, textDecoration:'none', justifyContent:'center', marginTop:8 }}>
          <ExternalLink size={13}/> {c ? 'Abrir gerador de contrato' : 'Gerar contrato'}
        </a>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: HISTÓRICO
// ══════════════════════════════════════════════════════════════════════════════
function TabHistory({ job }: { job: MockJob }) {
  const history = job.history ?? []
  return (
    <div style={{ padding:14 }}>
      <div style={{ background:'#fff', border:'0.5px solid #e5e7eb', borderRadius:12, padding:'13px 14px' }}>
        <SectionLabel>Histórico de alterações</SectionLabel>
        {history.length === 0
          ? <div style={{ fontSize:12, color:'#9ca3af', textAlign:'center', padding:'16px 0' }}>Sem histórico</div>
          : [...history].reverse().map((h, i) => (
              <div key={h.id} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:i < history.length-1 ? '0.5px solid #f3f4f6' : 'none' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#ede9fe', color:'#5b21b6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
                  {(h.actorName ?? 'U').split(' ').map(w=>w[0]).slice(0,2).join('')}
                </div>
                <div>
                  <div style={{ fontSize:12, color:'#374151', fontWeight:500 }}>{h.description ?? h.action}</div>
                  <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>{h.actorName ?? '—'} · {fmtDate(h.createdAt.slice(0,10))}</div>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}

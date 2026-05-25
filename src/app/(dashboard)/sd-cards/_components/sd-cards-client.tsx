'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import type { SdCardData, HdBackupData } from '@/lib/services/sd'
import {
  HardDrive, Plus, AlertTriangle, Shield,
  Camera, RotateCcw, CheckCircle2,
  Monitor, Database, ExternalLink, Trash2,
} from 'lucide-react'
import { deleteSdCardAction, createStorageLocationAction, deleteStorageLocationAction } from '@/lib/actions/sd'

// ─── TIPOS LOCAIS ─────────────────────────────────────────────────────────────
interface JobOption { id: string; title: string; clientName: string | null }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const SD_STATUS: Record<string, { label: string; bg: string; tc: string; border: string }> = {
  disponivel:      { label: 'Disponível',      bg: '#f0fdf4', tc: '#166534', border: '#059669' },
  em_uso:          { label: 'Em uso',          bg: '#eff6ff', tc: '#1e40af', border: '#2563eb' },
  pendente_backup: { label: 'Backup pendente', bg: '#fee2e2', tc: '#991b1b', border: '#ef4444' },
  seguro_formatar: { label: 'Seguro formatar', bg: '#fef3c7', tc: '#92400e', border: '#f59e0b' },
}

const HD_TYPE_ICON: Record<string, React.ReactNode> = {
  SSD: <Monitor size={14} />,
  HD:  <HardDrive size={14} />,
  NAS: <Database size={14} />,
}

const PURPOSE_LABELS: Record<string, string> = { edicao: 'Edição', arquivo: 'Arquivo', ambos: 'Edição + Arquivo' }
const JOB_TYPE_COLORS: Record<string, { bg: string; tc: string }> = {
  evento: { bg: '#ede9fe', tc: '#5b21b6' },
  ensaio: { bg: '#dbeafe', tc: '#1e40af' },
  diaria: { bg: '#ccfbf1', tc: '#0f766e' },
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`
}
function gbBar(used: number, total: string) {
  const totalN = parseFloat(total.replace('TB','').replace('GB','')) * (total.includes('TB') ? 1024 : 1)
  return Math.min(100, (used / totalN) * 100)
}

// ─── SUBFORMS ─────────────────────────────────────────────────────────────────
function AddCardForm({ onSave, onCancel }: { onSave: (c: SdCardData) => void; onCancel: () => void }) {
  const [v, setV] = useState({ label: '', capacity: '64GB', type: 'SD' as SdCardData['type'], camera: '' })
  return (
    <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 9, padding: '13px 14px', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Adicionar cartão ao inventário</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 7, marginBottom: 9 }}>
        {[
          { label: 'Label *', key: 'label', placeholder: 'SD-001' },
          { label: 'Câmera',  key: 'camera', placeholder: 'Sony A7 IV' },
        ].map(f => (
          <div key={f.key}>
            <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>{f.label}</div>
            <input value={(v as any)[f.key]} onChange={e => setV(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              style={{ width: '100%', padding: '6px 8px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 6, outline: 'none', background: '#fff' }} />
          </div>
        ))}
        <div>
          <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Tipo</div>
          <select value={v.type} onChange={e => setV(p => ({ ...p, type: e.target.value as SdCardData['type'] }))}
            style={{ width: '100%', padding: '6px 8px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 6, outline: 'none', background: '#fff' }}>
            {['SD', 'CFexpress', 'CF'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Capacidade</div>
          <select value={v.capacity} onChange={e => setV(p => ({ ...p, capacity: e.target.value }))}
            style={{ width: '100%', padding: '6px 8px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 6, outline: 'none', background: '#fff' }}>
            {['32GB','64GB','128GB','256GB','512GB','1TB'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => { if (!v.label.trim()) return; onSave({ id: 'card_' + Date.now(), ...v, status: 'disponivel' }) }}
          style={{ padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Salvar</button>
        <button onClick={onCancel}
          style={{ padding: '6px 12px', background: 'transparent', color: '#6b7280', border: '0.5px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
      </div>
    </div>
  )
}

function RegisterUseForm({ cards, jobs, onSave, onCancel }: {
  cards: SdCardData[]
  jobs: JobOption[]
  onSave: (cardId: string, jobId: string) => void
  onCancel: () => void
}) {
  const [cardId, setCardId] = useState('')
  const [jobId, setJobId]   = useState('')
  const available = cards.filter(c => c.status === 'disponivel')
  return (
    <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 9, padding: '13px 14px', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Registrar uso em evento</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 9 }}>
        <div>
          <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Cartão *</div>
          <select value={cardId} onChange={e => setCardId(e.target.value)}
            style={{ width: '100%', padding: '6px 8px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 6, outline: 'none', background: '#fff' }}>
            <option value="">Selecionar cartão...</option>
            {available.map(c => <option key={c.id} value={c.id}>{c.label} — {c.type} {c.capacity} ({c.camera})</option>)}
          </select>
          {available.length === 0 && <div style={{ fontSize: 9, color: '#ef4444', marginTop: 3 }}>Nenhum cartão disponível</div>}
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Evento *</div>
          <select value={jobId} onChange={e => setJobId(e.target.value)}
            style={{ width: '100%', padding: '6px 8px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 6, outline: 'none', background: '#fff' }}>
            <option value="">Selecionar evento...</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.clientName ?? j.title}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => { if (cardId && jobId) onSave(cardId, jobId) }}
          style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Marcar em uso</button>
        <button onClick={onCancel}
          style={{ padding: '6px 12px', background: 'transparent', color: '#6b7280', border: '0.5px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
      </div>
    </div>
  )
}

function BackupToHdForm({ card, hds, onSave, onCancel }: {
  card: SdCardData; hds: HdBackupData[]
  onSave: (hdIds: string[]) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  return (
    <div style={{ background: '#fff5f5', border: '0.5px solid #fecaca', borderRadius: 9, padding: '13px 14px', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>Registrar backup — {card.label}</div>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 10 }}>
        {card.currentJobTitle} · {card.photosCount?.toLocaleString('pt-BR')} fotos · {card.usedGb} GB
      </div>
      <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 6 }}>Selecionar HDs que receberam o backup:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        {hds.map(hd => (
          <label key={hd.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: selected.includes(hd.id) ? '#f0fdf4' : '#fafafa', border: `0.5px solid ${selected.includes(hd.id) ? '#059669' : '#e5e7eb'}`, borderRadius: 7, cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.includes(hd.id)} onChange={() => toggle(hd.id)} style={{ accentColor: '#059669' }} />
            <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{hd.name}</span>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>{hd.capacity} · {PURPOSE_LABELS[hd.purpose]}</span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => { if (selected.length > 0) onSave(selected) }}
          style={{ padding: '6px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
          Confirmar backup ({selected.length} HD{selected.length !== 1 ? 's' : ''})
        </button>
        <button onClick={onCancel}
          style={{ padding: '6px 12px', background: 'transparent', color: '#6b7280', border: '0.5px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export function SdCardsClient({
  initialCards,
  initialHds,
  jobs,
}: {
  initialCards: SdCardData[]
  initialHds: HdBackupData[]
  jobs: JobOption[]
}) {
  const router = useRouter()
  const [cards, setCards] = useState<SdCardData[]>(initialCards)
  const [hds,   setHds]   = useState<HdBackupData[]>(initialHds)

  const [showAddCard,   setShowAddCard]  = useState(false)
  const [showUseForm,   setShowUseForm]  = useState(false)
  const [backupingId,   setBackupingId]  = useState<string | null>(null)
  const [showAddHd,     setShowAddHd]    = useState(false)
  const [deleteCardId,  setDeleteCardId] = useState<string | null>(null)
  const [deletingCard,  setDeletingCard] = useState(false)
  const [cardError,     setCardError]    = useState('')
  const [hdForm, setHdForm] = useState({ name: '', type: 'hd_externo' as const, capacity: '', notes: '' })
  const [savingHd, setSavingHd] = useState(false)
  const [deleteHdId,   setDeleteHdId]   = useState<string | null>(null)
  const [deletingHd,   setDeletingHd]   = useState(false)
  const [hdError,      setHdError]      = useState('')

  const kpi = useMemo(() => ({
    total:      cards.length,
    disponivel: cards.filter(c => c.status === 'disponivel').length,
    emUso:      cards.filter(c => c.status === 'em_uso').length,
    pendente:   cards.filter(c => c.status === 'pendente_backup').length,
    pronto:     cards.filter(c => c.status === 'seguro_formatar').length,
  }), [cards])

  function handleRegisterUse(cardId: string, jobId: string) {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return
    setCards(prev => prev.map(c => c.id === cardId
      ? { ...c, status: 'em_uso', currentJobId: jobId, currentJobTitle: job.title, currentJobClient: job.clientName ?? undefined, photosCount: 0, usedGb: 0 }
      : c
    ))
    setShowUseForm(false)
  }

  function handleBackup(card: SdCardData, hdIds: string[]) {
    if (!card.currentJobId) return
    const job = jobs.find(j => j.id === card.currentJobId)
    const entry = {
      jobId: card.currentJobId,
      jobTitle: card.currentJobTitle ?? '',
      clientName: card.currentJobClient ?? '',
      eventDate: new Date().toISOString().slice(0, 10),
      backedUpAt: new Date().toISOString(),
      sizeGb: card.usedGb ?? 0,
      photosCount: card.photosCount ?? 0,
      jobType: (job ? 'evento' : 'evento') as 'evento' | 'ensaio' | 'diaria',
    }
    setHds(prev => prev.map(hd => hdIds.includes(hd.id)
      ? { ...hd, usedGb: hd.usedGb + (card.usedGb ?? 0), jobs: hd.jobs.some(j => j.jobId === card.currentJobId) ? hd.jobs : [...hd.jobs, entry] }
      : hd
    ))
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: 'seguro_formatar' as const } : c))
    setBackupingId(null)
    router.refresh()
  }

  function handleFormat(cardId: string) {
    setCards(prev => prev.map(c => c.id === cardId
      ? { ...c, status: 'disponivel' as const, currentJobId: undefined, currentJobTitle: undefined, currentJobClient: undefined, photosCount: undefined, usedGb: undefined }
      : c
    ))
    router.refresh()
  }

  const backupingCard = cards.find(c => c.id === backupingId) ?? null
  const deletingCardObj = cards.find(c => c.id === deleteCardId) ?? null

  async function handleDeleteCard() {
    if (!deleteCardId) return
    setDeletingCard(true)
    const result = await deleteSdCardAction(deleteCardId)
    setDeletingCard(false)
    if (result.error) { setCardError(result.error); setDeleteCardId(null); return }
    setCards(prev => prev.filter(c => c.id !== deleteCardId))
    setDeleteCardId(null)
    router.refresh()
  }

  async function handleDeleteHd() {
    if (!deleteHdId) return
    setDeletingHd(true)
    const result = await deleteStorageLocationAction(deleteHdId)
    setDeletingHd(false)
    if (result.error) { setHdError(result.error); setDeleteHdId(null); return }
    setHds(prev => prev.filter(h => h.id !== deleteHdId))
    setDeleteHdId(null)
    router.refresh()
  }

  async function saveHd() {
    if (!hdForm.name.trim()) return
    setSavingHd(true)
    try {
      const result = await createStorageLocationAction({
        name:        hdForm.name,
        type:        hdForm.type as any,
        capacityGb:  hdForm.capacity || undefined,
        notes:       hdForm.notes || undefined,
      })
      // Optimistic: add to local HDs
      const typeMap: Record<string, string> = { hd_externo: 'HD', ssd_externo: 'SSD', nas: 'NAS', nuvem: 'Nuvem', outro: 'Outro' }
      const novoHd: HdBackupData = {
        id:       result.id,
        name:     hdForm.name,
        type:     typeMap[hdForm.type] as any ?? 'HD',
        capacity: hdForm.capacity || '1TB',
        purpose:  'arquivo',
        usedGb:   0,
        jobs:     [],
      }
      setHds(prev => [...prev, novoHd])
      setHdForm({ name: '', type: 'hd_externo', capacity: '', notes: '' })
      setShowAddHd(false)
      router.refresh()
    } catch {
      router.refresh()
    } finally {
      setSavingHd(false)
    }
  }

  return (
    <>
      <Header title="SD Cards & HDs de Backup" />
      <div className="flex-1 overflow-y-auto" style={{ padding: 14, background: '#f9fafb' }}>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 9, marginBottom: 12 }}>
          {[
            { label: 'Total no inventário', value: kpi.total,      border: '#7c3aed', vc: '#111827',                          sub: `${kpi.disponivel} livres` },
            { label: 'Disponíveis',         value: kpi.disponivel, border: '#059669', vc: '#059669',                          sub: 'prontos para usar' },
            { label: 'Em uso',              value: kpi.emUso,      border: '#2563eb', vc: '#1e40af',                          sub: 'em evento/ensaio' },
            { label: 'Backup pendente',     value: kpi.pendente,   border: '#ef4444', vc: kpi.pendente > 0 ? '#ef4444' : '#6b7280', sub: 'aguardando descarga' },
            { label: 'Seguro formatar',     value: kpi.pronto,     border: '#f59e0b', vc: '#92400e',                          sub: 'backup confirmado' },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${k.border}`, borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.vc }}>{k.value}</div>
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 3 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── ALERT ── */}
        {kpi.pendente > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 13px', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 9, marginBottom: 11 }}>
            <AlertTriangle size={14} color="#ef4444" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#991b1b' }}>{kpi.pendente} cartão(s) precisam de backup antes de serem formatados</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* ══ SD CARDS ══ */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                <Camera size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                Cartões SD — Inventário
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setShowUseForm(s => !s); setShowAddCard(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                  <Camera size={11} /> Registrar uso
                </button>
                <button onClick={() => { setShowAddCard(s => !s); setShowUseForm(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                  <Plus size={11} /> Novo cartão
                </button>
              </div>
            </div>

            {showAddCard && <AddCardForm onSave={c => { setCards(p => [...p, c]); setShowAddCard(false) }} onCancel={() => setShowAddCard(false)} />}
            {showUseForm && <RegisterUseForm cards={cards} jobs={jobs} onSave={handleRegisterUse} onCancel={() => setShowUseForm(false)} />}
            {backupingCard && (
              <BackupToHdForm
                card={backupingCard}
                hds={hds}
                onSave={hdIds => handleBackup(backupingCard, hdIds)}
                onCancel={() => setBackupingId(null)}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cards.map(card => {
                const sc = SD_STATUS[card.status]
                return (
                  <div key={card.id} style={{ background: '#fff', border: `0.5px solid ${sc.border}`, borderRadius: 10, padding: '11px 13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: card.status !== 'disponivel' ? 8 : 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <HardDrive size={16} color={sc.border} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{card.label}</span>
                          <span style={{ fontSize: 9, color: '#6b7280', background: '#f3f4f6', padding: '1px 5px', borderRadius: 3 }}>{card.type}</span>
                          <span style={{ fontSize: 9, color: '#6b7280' }}>{card.capacity}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{card.camera}</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: sc.bg, color: sc.tc, flexShrink: 0 }}>{sc.label}</span>
                    </div>

                    {card.status !== 'disponivel' && card.currentJobTitle && (
                      <div style={{ background: '#f9fafb', borderRadius: 7, padding: '8px 10px', marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.3px' }}>Conteúdo atual</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{card.currentJobTitle}</div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, display: 'flex', gap: 10 }}>
                          {card.currentJobClient && <span>{card.currentJobClient}</span>}
                          {card.photosCount !== undefined && card.photosCount > 0 && <span>{card.photosCount.toLocaleString('pt-BR')} fotos</span>}
                          {card.usedGb !== undefined && card.usedGb > 0 && <span>{card.usedGb} GB usados</span>}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {card.status === 'em_uso' && (
                        <button onClick={() => setCards(p => p.map(c => c.id === card.id ? { ...c, status: 'pendente_backup' as const } : c))}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 10, background: '#fee2e2', color: '#991b1b', border: '0.5px solid #fecaca', borderRadius: 6, cursor: 'pointer' }}>
                          <CheckCircle2 size={10} /> Evento finalizado
                        </button>
                      )}
                      {card.status === 'pendente_backup' && (
                        <button onClick={() => setBackupingId(card.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 10, background: '#dcfce7', color: '#166534', border: '0.5px solid #bbf7d0', borderRadius: 6, cursor: 'pointer' }}>
                          <Shield size={10} /> Registrar backup nos HDs
                        </button>
                      )}
                      {card.status === 'seguro_formatar' && (
                        <button onClick={() => handleFormat(card.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 10, background: '#fef3c7', color: '#92400e', border: '0.5px solid #fde68a', borderRadius: 6, cursor: 'pointer' }}>
                          <RotateCcw size={10} /> Formatar e liberar
                        </button>
                      )}
                      {card.status === 'disponivel' && (
                        <span style={{ fontSize: 10, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={11} /> Cartão livre para uso
                        </span>
                      )}
                      <button
                        onClick={() => setDeleteCardId(card.id)}
                        disabled={card.status === 'em_uso' || card.status === 'pendente_backup'}
                        title={
                          card.status === 'em_uso' ? 'Não é possível excluir: cartão em uso num evento'
                          : card.status === 'pendente_backup' ? 'Não é possível excluir: backup pendente'
                          : 'Excluir cartão do inventário'
                        }
                        style={{
                          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3,
                          padding: '4px 9px', fontSize: 10, borderRadius: 6, cursor: (card.status === 'em_uso' || card.status === 'pendente_backup') ? 'not-allowed' : 'pointer',
                          background: 'transparent', color: (card.status === 'em_uso' || card.status === 'pendente_backup') ? '#d1d5db' : '#fca5a5',
                          border: `0.5px solid ${(card.status === 'em_uso' || card.status === 'pendente_backup') ? '#e5e7eb' : '#fecaca'}`,
                          opacity: (card.status === 'em_uso' || card.status === 'pendente_backup') ? 0.5 : 1,
                        }}>
                        <Trash2 size={10} /> Excluir
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ══ HDs DE BACKUP ══ */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                <HardDrive size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                HDs de Backup — Arquivo
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowAddHd(s => !s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#f5f3ff', color: '#7c3aed', border: '0.5px solid #ddd6fe', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                  <Plus size={11} /> Novo HD
                </button>
                <Link href="/sd-cards/arquivo"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#7c3aed', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 500, textDecoration: 'none' }}>
                  Abrir arquivo →
                </Link>
              </div>
            </div>

            {showAddHd && (
              <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 9, padding: '13px 14px', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Adicionar HD/SSD ao inventário</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 9 }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Nome *</div>
                    <input value={hdForm.name} onChange={e => setHdForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: SSD Samsung 2TB"
                      style={{ width: '100%', padding: '6px 8px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 6, outline: 'none', background: '#fff' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Tipo</div>
                    <select value={hdForm.type} onChange={e => setHdForm(p => ({ ...p, type: e.target.value as any }))}
                      style={{ width: '100%', padding: '6px 8px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 6, outline: 'none', background: '#fff' }}>
                      <option value="hd_externo">HD Externo</option>
                      <option value="ssd_externo">SSD Externo</option>
                      <option value="nas">NAS</option>
                      <option value="nuvem">Nuvem</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Capacidade</div>
                    <input value={hdForm.capacity} onChange={e => setHdForm(p => ({ ...p, capacity: e.target.value }))}
                      placeholder="Ex: 2000 (GB)"
                      style={{ width: '100%', padding: '6px 8px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 6, outline: 'none', background: '#fff' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={saveHd} disabled={savingHd}
                    style={{ padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: savingHd ? 'not-allowed' : 'pointer', opacity: savingHd ? 0.7 : 1 }}>
                    {savingHd ? 'Salvando...' : 'Salvar HD'}
                  </button>
                  <button onClick={() => setShowAddHd(false)}
                    style={{ padding: '6px 12px', background: 'transparent', color: '#6b7280', border: '0.5px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hds.map(hd => {
                const pct = gbBar(hd.usedGb, hd.capacity)
                const totalPhotos = hd.jobs.reduce((s, j) => s + j.photosCount, 0)
                return (
                  <div key={hd.id} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#7c3aed' }}>
                        {HD_TYPE_ICON[hd.type]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{hd.name}</span>
                          <span style={{ fontSize: 9, background: '#ede9fe', color: '#5b21b6', padding: '1px 6px', borderRadius: 3, fontWeight: 500 }}>{hd.type}</span>
                          <span style={{ fontSize: 9, color: '#9ca3af' }}>{PURPOSE_LABELS[hd.purpose]}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 3, background: pct > 85 ? '#ef4444' : '#7c3aed', width: pct + '%' }} />
                          </div>
                          <span style={{ fontSize: 9, color: '#6b7280', flexShrink: 0 }}>{hd.usedGb} GB / {hd.capacity}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>{hd.jobs.length}</div>
                        <div style={{ fontSize: 9, color: '#9ca3af' }}>jobs armazenados</div>
                        <div style={{ fontSize: 9, color: '#9ca3af' }}>{totalPhotos.toLocaleString('pt-BR')} fotos</div>
                        <button
                          onClick={() => setDeleteHdId(hd.id)}
                          disabled={hd.jobs.length > 0}
                          title={hd.jobs.length > 0 ? 'Não é possível excluir: HD possui backups registrados. Remova os jobs primeiro.' : 'Excluir HD do inventário'}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 3, marginTop: 2,
                            padding: '3px 8px', fontSize: 9, borderRadius: 5,
                            cursor: hd.jobs.length > 0 ? 'not-allowed' : 'pointer',
                            background: 'transparent',
                            color: hd.jobs.length > 0 ? '#d1d5db' : '#fca5a5',
                            border: `0.5px solid ${hd.jobs.length > 0 ? '#e5e7eb' : '#fecaca'}`,
                            opacity: hd.jobs.length > 0 ? 0.5 : 1,
                          }}>
                          <Trash2 size={9} /> Excluir
                        </button>
                      </div>
                    </div>

                    <div style={{ borderTop: '0.5px solid #f3f4f6' }}>
                      {hd.jobs.length === 0 && (
                        <div style={{ padding: '12px 14px', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>Nenhum job armazenado</div>
                      )}
                      {hd.jobs.slice(0, 3).map((j, idx, arr) => {
                        const tc = JOB_TYPE_COLORS[j.jobType] ?? JOB_TYPE_COLORS.evento
                        return (
                          <div key={j.jobId + idx}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: idx < arr.length - 1 ? '0.5px solid #f9fafb' : 'none' }}>
                            <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: tc.bg, color: tc.tc, flexShrink: 0 }}>
                              {j.jobType}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.clientName || j.jobTitle}</div>
                              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>
                                {fmtDate(j.eventDate)} · {j.photosCount.toLocaleString('pt-BR')} fotos · {j.sizeGb} GB
                              </div>
                            </div>
                            <a href={`/jobs/${j.jobId}`}
                              style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#7c3aed', textDecoration: 'none', flexShrink: 0 }}>
                              <ExternalLink size={10} /> Ver job
                            </a>
                          </div>
                        )
                      })}
                      {hd.jobs.length > 0 && (
                        <div style={{ padding: '8px 14px', borderTop: '0.5px solid #f3f4f6' }}>
                          <Link href="/sd-cards/arquivo" style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
                            Ver todos {hd.jobs.length} jobs →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ─── MODAL: Confirmar exclusão de cartão ─── */}
      {deleteCardId && deletingCardObj && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setDeleteCardId(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 420, width: 'calc(100% - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Excluir cartão {deletingCardObj.label}?</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
              Tem certeza que deseja remover <strong>{deletingCardObj.label}</strong> ({deletingCardObj.type} {deletingCardObj.capacity}) do inventário? Esta ação não pode ser desfeita.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteCardId(null)} disabled={deletingCard}
                style={{ padding: '8px 16px', fontSize: 13, background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleDeleteCard} disabled={deletingCard}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: deletingCard ? 'not-allowed' : 'pointer', opacity: deletingCard ? 0.7 : 1 }}>
                {deletingCard ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Confirmar exclusão de HD ─── */}
      {deleteHdId && (() => { const hd = hds.find(h => h.id === deleteHdId); return hd ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setDeleteHdId(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 420, width: 'calc(100% - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Excluir HD {hd.name}?</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
              Tem certeza que deseja remover <strong>{hd.name}</strong> ({hd.type} · {hd.capacity}) do inventário? Esta ação não pode ser desfeita.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteHdId(null)} disabled={deletingHd}
                style={{ padding: '8px 16px', fontSize: 13, background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleDeleteHd} disabled={deletingHd}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: deletingHd ? 'not-allowed' : 'pointer', opacity: deletingHd ? 0.7 : 1 }}>
                {deletingHd ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      ) : null })()}

      {/* ─── MODAL: Erro de exclusão de HD ─── */}
      {hdError && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setHdError('')} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 420, width: 'calc(100% - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Não é possível excluir</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{hdError}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setHdError('')}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Erro de exclusão de SD ─── */}
      {cardError && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setCardError('')} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 420, width: 'calc(100% - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Não é possível excluir cartão</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{cardError}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setCardError('')}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { SlideOver, FormField, BtnPrimary, BtnSecondary, inputStyle, selectStyle } from '@/components/ui/slide-over'
import { Plus, Search, ExternalLink, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/lib/db/schema/enums'
import type { ClientFull } from '@/lib/services/clients'
import { createClientAction, updateClientAction, deleteClientAction } from '@/lib/actions/clients'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return 'R$' + n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const TYPE_LABELS: Record<string, string> = { ensaio: 'Ensaio', evento: 'Evento', diaria: 'Diaria' }
const TYPE_COLORS: Record<string, { bg: string; tc: string }> = {
  ensaio: { bg: '#ede9fe', tc: '#5b21b6' },
  evento: { bg: '#dbeafe', tc: '#1e40af' },
  diaria: { bg: '#ccfbf1', tc: '#0f766e' },
}

const AVATAR_PALETTES: [string, string][] = [
  ['#ede9fe', '#5b21b6'], ['#dbeafe', '#1e40af'], ['#dcfce7', '#166534'],
  ['#fef3c7', '#92400e'], ['#fce7f3', '#9d174d'], ['#ccfbf1', '#0f766e'],
]

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
export function ClientesClient({ initialClients }: { initialClients: ClientFull[] }) {
  const router = useRouter()
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<ClientFull | null>(null)
  const [showNew, setShowNew]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [newForm, setNewForm]   = useState({ n: '', email: '', phone: '', origem: 'Instagram', notes: '' })
  // Novos clientes adicionados localmente antes do refresh
  const [extras, setExtras]     = useState<ClientFull[]>([])

  // Edit state
  const [showEdit, setShowEdit]     = useState(false)
  const [editForm, setEditForm]     = useState({ n: '', email: '', phone: '', origem: 'Instagram', notes: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState('')

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState('')

  const allClients = useMemo(() => [...initialClients, ...extras], [initialClients, extras])

  const filtered = useMemo(() =>
    allClients.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    )
  , [allClients, search])

  const kpis = useMemo(() => ({
    total:     allClients.length,
    leads:     allClients.filter(c => c.jobs.some(j => j.status === 'lead')).length,
    ativos:    allClients.filter(c => c.jobs.some(j => !['finalizado','cancelado'].includes(j.status))).length,
    entregues: allClients.filter(c => c.jobs.some(j => j.status === 'finalizado')).length,
  }), [allClients])

  async function saveNew() {
    if (!newForm.n) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.set('fullName', newForm.n)
      fd.set('email', newForm.email)
      fd.set('phone', newForm.phone)
      fd.set('source', newForm.origem.toLowerCase() === 'instagram' ? 'instagram'
        : newForm.origem.toLowerCase() === 'indicacao' ? 'indicacao'
        : newForm.origem.toLowerCase() === 'google' ? 'google'
        : 'outro')
      fd.set('notes', newForm.notes)
      // Optimistic
      const words = newForm.n.split(' ')
      const initials = ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase()
      const [avatarBg, avatarColor] = AVATAR_PALETTES[allClients.length % AVATAR_PALETTES.length]
      const nova: ClientFull = {
        id: 'cl-' + Date.now(),
        name: newForm.n, phone: newForm.phone, email: newForm.email,
        origem: newForm.origem, notes: newForm.notes || null,
        initials, avatarBg, avatarColor,
        jobs: [], totalValue: 0,
      }
      setExtras(prev => [...prev, nova])
      setShowNew(false)
      setNewForm({ n: '', email: '', phone: '', origem: 'Instagram', notes: '' })
      await createClientAction(fd)
      router.refresh()
    } catch {
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function openEdit(cl: ClientFull) {
    setEditForm({ n: cl.name, email: cl.email, phone: cl.phone, origem: cl.origem || 'outro', notes: cl.notes ?? '' })
    setEditError('')
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!selected || !editForm.n) return
    setEditSaving(true)
    const result = await updateClientAction(selected.id, {
      fullName: editForm.n,
      email:    editForm.email,
      phone:    editForm.phone,
      source:   editForm.origem.toLowerCase(),
      notes:    editForm.notes,
    })
    setEditSaving(false)
    if (result.error) { setEditError(result.error); return }
    // Update local state
    const updated: ClientFull = { ...selected, name: editForm.n, email: editForm.email, phone: editForm.phone, origem: editForm.origem, notes: editForm.notes || null }
    setSelected(updated)
    setShowEdit(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    const result = await deleteClientAction(selected.id)
    setDeleting(false)
    if (result.error) { setDeleteError(result.error); setConfirmDelete(false); return }
    setConfirmDelete(false)
    setSelected(null)
    router.refresh()
  }

  return (
    <>
      <Header title="Clientes" />
      <div className="flex-1 overflow-y-auto" style={{ padding: 14, background: '#f9fafb' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 12 }}>
          {[
            { l: 'Total clientes',    v: kpis.total,     vc: '#111827' },
            { l: 'Com lead ativo',    v: kpis.leads,     vc: '#7c3aed' },
            { l: 'Jobs em andamento', v: kpis.ativos,    vc: '#d97706' },
            { l: 'Finalizados',       v: kpis.entregues, vc: '#059669' },
          ].map(k => (
            <div key={k.l} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: k.vc }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '13px 15px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text" placeholder="Buscar por nome, email ou telefone..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
            <button
              onClick={() => setShowNew(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}
            >
              <Plus size={14} /> Novo cliente
            </button>
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af', fontSize: 13 }}>Nenhum cliente encontrado</div>
          )}

          {filtered.map((cl, i) => {
            const latestJob = cl.jobs[0]
            const sc = latestJob ? (JOB_STATUS_COLORS[latestJob.status as keyof typeof JOB_STATUS_COLORS] ?? { bg: '#f3f4f6', tc: '#6b7280', dot: '#9ca3af' }) : { bg: '#f3f4f6', tc: '#6b7280', dot: '#9ca3af' }
            const sl = latestJob ? (JOB_STATUS_LABELS[latestJob.status as keyof typeof JOB_STATUS_LABELS] ?? latestJob.status) : 'Sem job'
            return (
              <div
                key={cl.id}
                onClick={() => setSelected(cl)}
                style={{ display: 'flex', alignItems: 'center', padding: '10px 4px', borderBottom: i < filtered.length - 1 ? '0.5px solid #f3f4f6' : 'none', cursor: 'pointer', borderRadius: 6, transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: cl.avatarBg, color: cl.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, marginRight: 12 }}>{cl.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{cl.name}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cl.jobs.length} job(s) · {latestJob?.title ?? 'Sem job'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginRight: 12, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#111827' }}>{fmt(cl.totalValue)}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>total faturado</div>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.tc, flexShrink: 0 }}>{sl}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail Modal */}
      <SlideOver
        open={!!selected} onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={selected?.email || selected?.phone}
        footer={
          <>
            <button onClick={() => { setDeleteError(''); setConfirmDelete(true) }}
              title="Excluir cliente"
              style={{ padding: '8px 10px', background: 'transparent', color: '#fca5a5', border: '1px solid #fee2e2', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <Trash2 size={13} /> Excluir
            </button>
            <button onClick={() => selected && openEdit(selected)}
              style={{ padding: '8px 12px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500 }}>
              <Pencil size={13} /> Editar
            </button>
            <div style={{ flex: 1 }} />
            {selected?.phone && (
              <a
                href={`https://wa.me/55${selected.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${selected.name.split(' ')[0]}! Tudo bem?`)}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#22c55e', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.556 4.118 1.528 5.847L.057 23.882l6.233-1.635A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.369l-.36-.214-3.7.971.986-3.607-.235-.372A9.818 9.818 0 1112 21.818z" />
                </svg>
                WhatsApp
              </a>
            )}
            <BtnPrimary onClick={() => { setSelected(null); router.push('/jobs') }} color="#7c3aed">Ver jobs</BtnPrimary>
          </>
        }
      >
        {selected && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: selected.avatarBg, color: selected.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, flexShrink: 0 }}>{selected.initials}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{selected.jobs.length} job(s) · {fmt(selected.totalValue)} faturado</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                ['Email', selected.email || '—'],
                ['Telefone', selected.phone || '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{v}</div>
                </div>
              ))}
            </div>

            {selected.jobs.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                  Historico de jobs
                </div>
                {selected.jobs.map(job => {
                  const sc = JOB_STATUS_COLORS[job.status as keyof typeof JOB_STATUS_COLORS] ?? { bg: '#f3f4f6', tc: '#6b7280', dot: '#9ca3af' }
                  const sl = JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ?? job.status
                  const typeStyle = TYPE_COLORS[job.type] ?? { bg: '#f3f4f6', tc: '#6b7280' }
                  const dateStr = job.scheduledAt ? new Date(job.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
                  return (
                    <div
                      key={job.id}
                      onClick={() => { setSelected(null); router.push('/jobs/' + job.id) }}
                      style={{ display: 'flex', alignItems: 'center', padding: '9px 8px', borderRadius: 8, marginBottom: 4, cursor: 'pointer', background: '#f9fafb', border: '0.5px solid #f3f4f6', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#f9fafb')}
                    >
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: typeStyle.bg, color: typeStyle.tc, flexShrink: 0, marginRight: 8 }}>
                        {TYPE_LABELS[job.type]}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                        {dateStr && <div style={{ fontSize: 10, color: '#9ca3af' }}>{dateStr}</div>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', margin: '0 8px', flexShrink: 0 }}>{'R$' + job.totalValue.toLocaleString('pt-BR')}</span>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 500, background: sc.bg, color: sc.tc, flexShrink: 0, marginRight: 4 }}>{sl}</span>
                      <ExternalLink size={11} style={{ color: '#9ca3af', flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </SlideOver>


      {/* Edit Client Modal */}
      <SlideOver
        open={showEdit} onClose={() => setShowEdit(false)}
        title={`Editar — ${selected?.name ?? ''}`}
        footer={
          <>
            <BtnSecondary onClick={() => setShowEdit(false)}>Cancelar</BtnSecondary>
            <BtnPrimary onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar alterações'}</BtnPrimary>
          </>
        }
      >
        {editError && (
          <div style={{ display: 'flex', gap: 8, padding: '9px 12px', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, marginBottom: 12 }}>
            <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#991b1b' }}>{editError}</span>
          </div>
        )}
        <FormField label="Nome completo" required>
          <input style={inputStyle} value={editForm.n} onChange={e => setEditForm(p => ({ ...p, n: e.target.value }))} />
        </FormField>
        <FormField label="Email">
          <input style={inputStyle} value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
        </FormField>
        <FormField label="Telefone">
          <input style={inputStyle} value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
        </FormField>
        <FormField label="Como nos encontrou">
          <select style={selectStyle} value={editForm.origem} onChange={e => setEditForm(p => ({ ...p, origem: e.target.value }))}>
            {['Instagram','Indicacao','Google','Facebook','Outro'].map(o => <option key={o}>{o}</option>)}
          </select>
        </FormField>
        <FormField label="Observacoes">
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
        </FormField>
      </SlideOver>

      {/* Delete confirmation */}
      {confirmDelete && selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setConfirmDelete(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 440, width: 'calc(100% - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Excluir cliente?</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                  Tem certeza que deseja excluir <strong>{selected.name}</strong>?
                  {selected.jobs.length > 0 && (
                    <span style={{ display: 'block', marginTop: 6, color: '#ef4444', fontWeight: 500 }}>
                      ⚠ Este cliente possui {selected.jobs.length} job(s). A exclusão será bloqueada se houver jobs vinculados.
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                style={{ padding: '8px 16px', fontSize: 13, background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete error */}
      {deleteError && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setDeleteError('')} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 420, width: 'calc(100% - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
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

      {/* New Client Modal */}
      <SlideOver
        open={showNew} onClose={() => setShowNew(false)}
        title="Novo Cliente"
        footer={
          <>
            <BtnSecondary onClick={() => setShowNew(false)}>Cancelar</BtnSecondary>
            <BtnPrimary onClick={saveNew} disabled={saving}>{saving ? 'Salvando...' : 'Salvar cliente'}</BtnPrimary>
          </>
        }
      >
        <FormField label="Nome completo" required>
          <input style={inputStyle} placeholder="Ex: Ana Paula Ferreira" value={newForm.n} onChange={e => setNewForm(p => ({ ...p, n: e.target.value }))} />
        </FormField>
        <FormField label="Email">
          <input style={inputStyle} placeholder="email@exemplo.com" value={newForm.email} onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))} />
        </FormField>
        <FormField label="Telefone">
          <input style={inputStyle} placeholder="(41) 99999-0000" value={newForm.phone} onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))} />
        </FormField>
        <FormField label="Como nos encontrou">
          <select style={selectStyle} value={newForm.origem} onChange={e => setNewForm(p => ({ ...p, origem: e.target.value }))}>
            {['Instagram','Indicacao','Google','Facebook','Outro'].map(o => <option key={o}>{o}</option>)}
          </select>
        </FormField>
        <FormField label="Observacoes">
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Anotacoes sobre o cliente..." value={newForm.notes} onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))} />
        </FormField>
      </SlideOver>
    </>
  )
}

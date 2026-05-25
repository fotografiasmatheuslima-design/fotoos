'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { JobType, JobStatus } from '@/lib/db/schema/enums'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (job: any) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 10px', fontSize: 13,
  border: '0.5px solid #e5e7eb', borderRadius: 7, outline: 'none',
  background: '#fff', fontFamily: 'inherit',
}
const selectStyle: React.CSSProperties = { ...inputStyle }
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 5,
}

export function NewJobSlideOver({ open, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    title: '', type: 'evento' as JobType, clientName: '', clientPhone: '',
    scheduledAt: '', totalValue: '', location: '', notes: '',
  })

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  function handleSave() {
    if (!form.title || !form.clientName) return
    onSave({
      id:            'j' + Date.now(),
      title:         form.title,
      type:          form.type,
      status:        'lead' as JobStatus,
      clientName:    form.clientName,
      clientPhone:   form.clientPhone || undefined,
      scheduledAt:   form.scheduledAt || undefined,
      totalValue:    parseFloat(form.totalValue) || 0,
      paidValue:     0,
      sdCount:       0,
      tags:          [form.type],
      tasks:         [
        { id: 'at1', title: 'Fazer primeiro contato / responder', completed: false, priority: 'urgente' },
        { id: 'at2', title: 'Verificar disponibilidade na agenda', completed: false, priority: 'alta' },
      ],
      payments:      [],
      location:      form.location || undefined,
      notes:         form.notes || undefined,
    })
    setForm({ title: '', type: 'evento', clientName: '', clientPhone: '', scheduledAt: '', totalValue: '', location: '', notes: '' })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 440,
        background: '#fff', display: 'flex', flexDirection: 'column',
        animation: 'slideIn .2s ease', boxShadow: '-8px 0 40px rgba(0,0,0,.15)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '0.5px solid #f3f4f6' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Novo Job</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Será criado como Lead</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <label style={labelStyle}>Título do job *</label>
              <input style={inputStyle} placeholder="Ex: Casamento Ana & João" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>

            <div>
              <label style={labelStyle}>Tipo *</label>
              <select style={selectStyle} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as JobType }))}>
                <option value="evento">Evento (casamento, formatura, corporativo)</option>
                <option value="ensaio">Ensaio (família, pré-wedding, newborn)</option>
                <option value="diaria">Diária (contratado por outro estúdio)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Nome do cliente *</label>
              <input style={inputStyle} placeholder="Ex: Ana Paula Ferreira" value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} />
            </div>

            <div>
              <label style={labelStyle}>WhatsApp do cliente</label>
              <input style={inputStyle} placeholder="(41) 99999-0000" value={form.clientPhone} onChange={e => setForm(p => ({ ...p, clientPhone: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Data do evento</label>
                <input type="date" style={inputStyle} value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Valor total (R$)</label>
                <input style={inputStyle} placeholder="Ex: 4800" type="number" value={form.totalValue} onChange={e => setForm(p => ({ ...p, totalValue: e.target.value }))} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Local</label>
              <input style={inputStyle} placeholder="Ex: Curitiba - PR" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            </div>

            <div>
              <label style={labelStyle}>Observações iniciais</label>
              <textarea
                style={{ ...inputStyle, height: 70, resize: 'vertical' } as React.CSSProperties}
                placeholder="Detalhes do briefing, acordos, referências..."
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '0.5px solid #f3f4f6', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 7, cursor: 'pointer', background: '#fff', color: '#374151' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!form.title || !form.clientName}
            style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: 'pointer',
              border: 'none', background: form.title && form.clientName ? '#7c3aed' : '#e5e7eb',
              color: form.title && form.clientName ? '#fff' : '#9ca3af',
            }}
          >
            Criar job
          </button>
        </div>
      </div>
    </div>
  )
}

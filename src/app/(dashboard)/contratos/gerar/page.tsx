'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { JobFull } from '@/lib/services/jobs-data'
import { Header } from '@/components/layout/header'

// Mapeamento tipo de job -> tipo de contrato
function tipoContrato(job: JobFull): string {
  const title = job.title.toLowerCase()
  if (title.includes('casamento'))  return 'Casamento'
  if (title.includes('15 anos') || title.includes('debutante')) return '15 anos'
  if (title.includes('formatura'))  return 'Formatura'
  if (title.includes('aniversario')) return 'Aniversario'
  if (title.includes('corporativo')) return 'Corporativo'
  if (job.type === 'ensaio')        return 'Ensaio'
  return 'Evento'
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, fontSize: 12,
  border: '0.5px solid #e5e7eb', outline: 'none', background: '#fff', color: '#111827',
}
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase',
  letterSpacing: '.4px', marginBottom: 4, display: 'block',
}

interface FormData {
  nome: string
  tipo: string
  data: string
  hora: string
  localCerimonia: string
  localFesta: string
  valor: string
  sinal: string
}

export default function GerarContratoPage() {
  const router       = useRouter()
  const params       = useSearchParams()
  const iframeRef    = useRef<HTMLIFrameElement>(null)
  const jobId        = params?.get('jobId')

  const [job, setJob]       = useState<JobFull | null>(null)
  const [mode, setMode]     = useState<'review' | 'generator'>('review')
  const [form, setForm]     = useState<FormData>({
    nome: '', tipo: '', data: '', hora: '10:30',
    localCerimonia: '', localFesta: '', valor: '', sinal: '20',
  })

  // Carregar dados do job se jobId existir
  useEffect(() => {
    if (!jobId) return
    async function loadJob() {
      const res = await fetch(`/api/jobs/${jobId}`)
      const found: JobFull | null = res.ok ? await res.json() : null
      if (found) {
        setJob(found)
        setForm({
          nome:           found.clientName ?? '',
          tipo:           tipoContrato(found),
          data:           found.scheduledAt ? found.scheduledAt.slice(0, 10) : '',
          hora:           found.scheduledAt ? found.scheduledAt.slice(11, 16) : '10:30',
          localCerimonia: found.location?.name ?? '',
          localFesta:     '',
          valor:          String(found.totalValue),
          sinal:          '20',
        })
      }
    }
    loadJob()
  }, [jobId])

  function set(key: keyof FormData, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  function buildIframeSrc() {
    const p = new URLSearchParams()
    if (form.nome)          p.set('nome',           form.nome)
    if (form.tipo)          p.set('tipo',            form.tipo)
    if (form.data)          p.set('data',            form.data)
    if (form.hora)          p.set('hora',            form.hora)
    if (form.localCerimonia) p.set('local_cerimonia', form.localCerimonia)
    if (form.localFesta)    p.set('local_festa',     form.localFesta)
    if (form.valor)         p.set('valor',           form.valor)
    if (form.sinal)         p.set('sinal',           form.sinal)
    return '/gerador-contrato-v2.html?' + p.toString()
  }

  function abrirGerador() {
    setMode('generator')
  }

  const fmtDate = (d: string) => d ? new Date(d + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
  const fmtValor = (v: string) => v ? 'R$' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'
  const sinalVal = form.valor && form.sinal ? parseFloat(form.valor) * parseFloat(form.sinal) / 100 : 0

  return (
    <>
      <Header title="Gerar Contrato" />
      <div className="flex-1 overflow-hidden" style={{ display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>

        {/* Topbar */}
        <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderBottom: '0.5px solid #e5e7eb', flexShrink: 0 }}>
          <button onClick={() => router.back()} style={{ fontSize: 12, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Voltar
          </button>
          <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />
          {/* Steps */}
          {['Revisar dados', 'Gerar PDF'].map((s, i) => {
            const active = (i === 0 && mode === 'review') || (i === 1 && mode === 'generator')
            const done   = i === 0 && mode === 'generator'
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: done ? '#dcfce7' : active ? '#7c3aed' : '#f3f4f6', color: done ? '#166534' : active ? '#fff' : '#9ca3af' }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? '#111827' : done ? '#059669' : '#9ca3af' }}>{s}</span>
                {i < 1 && <span style={{ color: '#d1d5db', fontSize: 12, marginLeft: 2 }}>›</span>}
              </div>
            )
          })}
          {job && (
            <>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: '#ede9fe', color: '#5b21b6' }}>{job.title}</span>
              </div>
            </>
          )}
        </div>

        {mode === 'review' ? (
          /* ── STEP 1: FORMULÁRIO DE REVISÃO ── */
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 16, alignItems: 'start' }}>

            {/* Formulário */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Origem dos dados */}
              {job ? (
                <div style={{ background: '#ede9fe', border: '0.5px solid #c4b5fd', borderRadius: 9, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>📋</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#5b21b6' }}>Dados carregados do job</div>
                    <div style={{ fontSize: 11, color: '#7c3aed' }}>{job.title} — confira e ajuste antes de gerar</div>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 9, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>✏️</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Preenchimento manual</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Preencha os dados do contrato abaixo</div>
                  </div>
                </div>
              )}

              {/* Dados do cliente */}
              <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginBottom: 12, paddingBottom: 8, borderBottom: '0.5px solid #f3f4f6' }}>
                  Dados do contratante
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Nome completo *</label>
                    <input style={inputStyle} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: Ana Paula Ferreira" />
                  </div>
                </div>
              </div>

              {/* Dados do evento */}
              <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginBottom: 12, paddingBottom: 8, borderBottom: '0.5px solid #f3f4f6' }}>
                  Dados do evento
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Tipo de evento *</label>
                    <select style={inputStyle} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                      <option value="">Selecione...</option>
                      {['Casamento','15 anos','Aniversario','Formatura','Corporativo','Ensaio','Outro'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Data do evento *</label>
                    <input type="date" style={inputStyle} value={form.data} onChange={e => set('data', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Hora de início</label>
                    <input type="time" style={inputStyle} value={form.hora} onChange={e => set('hora', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Local da cerimônia / ensaio</label>
                    <input style={inputStyle} value={form.localCerimonia} onChange={e => set('localCerimonia', e.target.value)} placeholder="Ex.: Igreja Bom Jesus — Curitiba" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Local da festa / recepção</label>
                    <input style={inputStyle} value={form.localFesta} onChange={e => set('localFesta', e.target.value)} placeholder="Ex.: Salão Versailles — Curitiba (deixe vazio se não houver)" />
                  </div>
                </div>
              </div>

              {/* Financeiro */}
              <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginBottom: 12, paddingBottom: 8, borderBottom: '0.5px solid #f3f4f6' }}>
                  Valores
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Valor total (R$) *</label>
                    <input type="number" style={inputStyle} value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="Ex.: 4800" min="0" step="0.01" />
                  </div>
                  <div>
                    <label style={labelStyle}>% do sinal</label>
                    <input type="number" style={inputStyle} value={form.sinal} onChange={e => set('sinal', e.target.value)} placeholder="20" min="0" max="100" />
                  </div>
                  {sinalVal > 0 && (
                    <div style={{ gridColumn: '1 / -1', background: '#f0fdf4', borderRadius: 7, padding: '8px 12px', fontSize: 11, color: '#166534' }}>
                      Sinal calculado: <strong>R${sinalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      {' '}· Restante: <strong>R${(parseFloat(form.valor || '0') - sinalVal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={abrirGerador}
                disabled={!form.nome || !form.data || !form.valor}
                style={{
                  padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 700,
                  background: (!form.nome || !form.data || !form.valor) ? '#e5e7eb' : '#7c3aed',
                  color: (!form.nome || !form.data || !form.valor) ? '#9ca3af' : '#fff',
                  border: 'none', cursor: (!form.nome || !form.data || !form.valor) ? 'not-allowed' : 'pointer',
                }}
              >
                Gerar contrato →
              </button>
            </div>

            {/* Preview lateral */}
            <div style={{ position: 'sticky', top: 0 }}>
              <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Resumo do contrato</div>
                {[
                  ['Contratante', form.nome || '—'],
                  ['Tipo', form.tipo || '—'],
                  ['Data', form.data ? fmtDate(form.data) : '—'],
                  ['Hora', form.hora || '—'],
                  ['Local cerimônia', form.localCerimonia || '—'],
                  ['Local festa', form.localFesta || '(não informado)'],
                  ['Valor total', fmtValor(form.valor)],
                  ['Sinal (' + form.sinal + '%)', sinalVal > 0 ? 'R$' + sinalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '0.5px solid #f9fafb', gap: 8 }}>
                    <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>{l}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#111827', textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: '#fef3c7', fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
                  <strong>Modelo:</strong> Contrato Matheus Lima Fotografias — CNPJ 60.085.955/0001-10
                </div>
              </div>
            </div>
          </div>

        ) : (
          /* ── STEP 2: GERADOR COM IFRAME ── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: '#f0fdf4', borderBottom: '0.5px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>
                Dados pre-preenchidos — revise no formulario abaixo e clique em Gerar PDF
              </span>
              <button
                onClick={() => setMode('review')}
                style={{ marginLeft: 'auto', fontSize: 11, color: '#7c3aed', background: 'none', border: '0.5px solid #c4b5fd', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
              >
                ← Editar dados
              </button>
            </div>
            <iframe
              ref={iframeRef}
              src={buildIframeSrc()}
              style={{ flex: 1, border: 'none', width: '100%' }}
              title="Gerador de Contrato"
            />
          </div>
        )}
      </div>
    </>
  )
}

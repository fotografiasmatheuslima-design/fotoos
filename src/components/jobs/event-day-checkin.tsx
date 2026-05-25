'use client'
import { useState, useMemo } from 'react'
import type { JobFull } from '@/lib/services/jobs-data'
import {
  Camera, MapPin, Clock, HardDrive, CheckCircle2,
  X, ChevronRight, Zap, Phone, Navigation,
} from 'lucide-react'

// ─── CARTÕES (inventário local) ───────────────────────────────────────────────
interface SdCard { id: string; label: string; type: string; capacity: string; camera: string }
const INVENTORY_CARDS: SdCard[] = [
  { id: 'sd1', label: 'SD-001', type: 'SD',        capacity: '128GB', camera: 'Sony A7 IV' },
  { id: 'sd3', label: 'CF-001', type: 'CFexpress', capacity: '256GB', camera: 'Canon EOS R5' },
  { id: 'sd5', label: 'CF-002', type: 'CFexpress', capacity: '128GB', camera: 'Canon EOS R5' },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function toYMD(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

function fmtPhone(phone?: string | null) {
  return phone?.replace(/\D/g, '') ?? ''
}

function wazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function whatsappUrl(phone: string, name?: string | null) {
  const num = fmtPhone(phone)
  const msg = encodeURIComponent(`Olá${name ? ', ' + name.split(' ')[0] : ''}! Estou a caminho do seu evento 📸`)
  return `https://wa.me/55${num}?text=${msg}`
}

// ─── LOCATION BLOCK ───────────────────────────────────────────────────────────
function LocationBlock({ icon, label, name, address, time }: {
  icon: string; label: string; name: string; address?: string; time?: string
}) {
  const [mapOpen, setMapOpen] = useState(false)
  const query = address ? `${name}, ${address}` : name

  return (
    <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 2 }}>{name}</div>
          {address && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{address}</div>}
        </div>
        {time && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>{time}h</div>
          </div>
        )}
      </div>

      {/* Map buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: '0.5px solid #f3f4f6' }}>
        <a
          href={wazeUrl(query)}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', fontSize: 12, fontWeight: 600, color: '#00bcd4', textDecoration: 'none', borderRight: '0.5px solid #f3f4f6', background: '#f0fdfe' }}
        >
          <Navigation size={14} /> Waze
        </a>
        <a
          href={mapsUrl(query)}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', fontSize: 12, fontWeight: 600, color: '#ea4335', textDecoration: 'none', background: '#fff5f5' }}
        >
          <MapPin size={14} /> Google Maps
        </a>
      </div>
    </div>
  )
}

// ─── BANNER ───────────────────────────────────────────────────────────────────
export function EventDayCheckin({ jobs: allJobs }: { jobs?: JobFull[] }) {
  const [open, setOpen] = useState(false)

  const todayJobs = useMemo(() => {
    const source = allJobs ?? []
    const today = toYMD(new Date())
    return source.filter(j =>
      j.scheduledAt &&
      j.scheduledAt.slice(0, 10) === today &&
      !['cancelado', 'finalizado'].includes(j.status)
    )
  }, [allJobs])

  if (todayJobs.length === 0) return null
  const job = todayJobs[0]

  const startTime = job.scheduledAt
    ? new Date(job.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : ''
  const mainLoc = typeof job.location === 'object' && job.location ? job.location.name : ''

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 16px', marginBottom: 11,
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          borderRadius: 12, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(124,58,237,.35)',
        }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={22} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            📸 {job.clientName ?? job.title}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>
            {startTime && `${startTime}h`}{mainLoc && ` · ${mainLoc}`} · Toque para abrir
          </div>
        </div>
        {job.clientPhone && (
          <a
            href={whatsappUrl(job.clientPhone, job.clientName)}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: '#25d366', flexShrink: 0 }}
          >
            <Phone size={16} color="#fff" />
          </a>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.2)', borderRadius: 8, padding: '6px 12px' }}>
          <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>Abrir</span>
          <ChevronRight size={14} color="#fff" />
        </div>
      </div>

      {open && <CheckinModal jobs={todayJobs} onClose={() => setOpen(false)} />}
    </>
  )
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function CheckinModal({ jobs, onClose }: { jobs: JobFull[]; onClose: () => void }) {
  const job = jobs[0]
  const locs = job.eventLocations
  const [step, setStep]               = useState(0)
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [done, setDone]               = useState(false)

  function toggleCard(id: string) {
    setSelectedCards(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  const STEPS = ['Evento', 'SD Cards', 'Confirmar']

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 12,
    }}>
      <div style={{
        background: '#f9fafb', borderRadius: 16, width: '100%', maxWidth: 520,
        maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,.3)',
      }}>

        {/* ── HEADER ── */}
        <div style={{ padding: '16px 18px 12px', background: '#fff', borderBottom: '0.5px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '.7px' }}>Hoje</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 2 }}>{job.clientName ?? job.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {job.scheduledAt && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
                    <Clock size={11} />
                    {new Date(job.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
                    {job.endsAt && ` – ${new Date(job.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`}
                  </span>
                )}
                {typeof job.location === 'object' && job.location?.city && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
                    <MapPin size={11} /> {job.location.city}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
              {job.clientPhone && (
                <a
                  href={whatsappUrl(job.clientPhone, job.clientName)}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#dcfce7', color: '#166534', borderRadius: 9, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                >
                  <Phone size={13} /> WhatsApp
                </a>
              )}
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Steps */}
          {!done && (
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{ flex: 1 }}>
                  <div style={{ height: 3, borderRadius: 2, background: i <= step ? '#7c3aed' : '#e5e7eb', transition: 'background .2s' }} />
                  <div style={{ fontSize: 9, color: i === step ? '#7c3aed' : '#9ca3af', marginTop: 3, fontWeight: i === step ? 700 : 400 }}>{s}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CONTENT ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {/* DONE */}
          {done && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={32} color="#059669" />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Tudo pronto!</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
                {selectedCards.length > 0 && `${selectedCards.length} cartão(s) SD registrado(s) em uso.`}
              </div>
              {job.clientPhone && (
                <a href={whatsappUrl(job.clientPhone, job.clientName)} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#25d366', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', marginBottom: 12 }}>
                  <Phone size={16} /> Avisar no WhatsApp
                </a>
              )}
            </div>
          )}

          {/* STEP 0 — Locais do evento */}
          {!done && step === 0 && (
            <div>
              {/* WhatsApp banner */}
              {job.clientPhone && (
                <a href={whatsappUrl(job.clientPhone, job.clientName)} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#dcfce7', border: '0.5px solid #bbf7d0', borderRadius: 12, marginBottom: 14, textDecoration: 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={17} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>Falar com {job.clientName?.split(' ')[0]}</div>
                    <div style={{ fontSize: 10, color: '#15803d' }}>{job.clientPhone}</div>
                  </div>
                  <ChevronRight size={14} color="#166534" style={{ marginLeft: 'auto' }} />
                </a>
              )}

              {/* Locais pré-preenchidos */}
              {locs ? (
                <>
                  {locs.arrivalTime && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>🕐</span>
                      <div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>Minha chegada</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>{locs.arrivalTime}h</div>
                      </div>
                    </div>
                  )}
                  {locs.makingOf && <LocationBlock icon="📷" label="Making-of / Preparativos" name={locs.makingOf.name} address={locs.makingOf.address} time={locs.makingOf.time} />}
                  {locs.ceremony && <LocationBlock icon="💍" label="Cerimônia" name={locs.ceremony.name} address={locs.ceremony.address} time={locs.ceremony.time} />}
                  {locs.reception && <LocationBlock icon="🥂" label="Recepção / Festa" name={locs.reception.name} address={locs.reception.address} time={locs.reception.time} />}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                  <MapPin size={28} color="#e5e7eb" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13 }}>Locais não cadastrados no contrato</div>
                  <a href={`/jobs/${job.id}`} style={{ fontSize: 11, color: '#7c3aed', textDecoration: 'none', marginTop: 8, display: 'block' }}>Adicionar no job →</a>
                </div>
              )}
            </div>
          )}

          {/* STEP 1 — SD Cards */}
          {!done && step === 1 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Quais cartões vai usar hoje?</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>Selecione todos que vai levar para o evento</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {INVENTORY_CARDS.map(card => {
                  const sel = selectedCards.includes(card.id)
                  return (
                    <div key={card.id} onClick={() => toggleCard(card.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                        border: `2px solid ${sel ? '#7c3aed' : '#e5e7eb'}`,
                        background: sel ? '#f5f3ff' : '#fff', transition: 'all .15s',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: sel ? '#ede9fe' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HardDrive size={18} color={sel ? '#7c3aed' : '#9ca3af'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{card.label}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{card.type} · {card.capacity} · {card.camera}</div>
                      </div>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: sel ? '#7c3aed' : 'transparent', border: `2px solid ${sel ? '#7c3aed' : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {sel && <CheckCircle2 size={15} color="#fff" />}
                      </div>
                    </div>
                  )
                })}
              </div>
              {selectedCards.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 9, border: '0.5px solid #bbf7d0' }}>
                  <CheckCircle2 size={13} color="#059669" />
                  <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
                    {selectedCards.length} cartão(s) — serão marcados como "Em uso"
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Confirmar */}
          {!done && step === 2 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>Confirmar e iniciar evento</div>
              {locs && (
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px', marginBottom: 12, border: '0.5px solid #e5e7eb' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Locais</div>
                  {[
                    locs.makingOf  && { icon: '📷', label: 'Making-of', val: `${locs.makingOf.name}${locs.makingOf.time  ? ' · ' + locs.makingOf.time  + 'h' : ''}` },
                    locs.ceremony  && { icon: '💍', label: 'Cerimônia', val: `${locs.ceremony.name}${locs.ceremony.time  ? ' · ' + locs.ceremony.time  + 'h' : ''}` },
                    locs.reception && { icon: '🥂', label: 'Recepção',  val: `${locs.reception.name}${locs.reception.time ? ' · ' + locs.reception.time + 'h' : ''}` },
                  ].filter(Boolean).map((item: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7 }}>
                      <span>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 9, color: '#9ca3af' }}>{item.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{item.val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background: '#f5f3ff', borderRadius: 12, padding: '14px', border: '0.5px solid #e5e7eb' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>SD Cards</div>
                {selectedCards.length === 0
                  ? <div style={{ fontSize: 11, color: '#9ca3af' }}>Nenhum cartão selecionado</div>
                  : INVENTORY_CARDS.filter(c => selectedCards.includes(c.id)).map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <HardDrive size={13} color="#7c3aed" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{c.label}</span>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>{c.type} · {c.capacity}</span>
                      </div>
                    ))
                }
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        {!done ? (
          <div style={{ padding: '12px 16px', background: '#fff', borderTop: '0.5px solid #e5e7eb', display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ flex: 1, padding: '13px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ← Voltar
              </button>
            )}
            {step < 2 ? (
              <button onClick={() => setStep(s => s + 1)}
                style={{ flex: 2, padding: '13px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Próximo →
              </button>
            ) : (
              <button onClick={() => setDone(true)}
                style={{ flex: 2, padding: '13px', background: 'linear-gradient(135deg, #7c3aed, #059669)', color: '#fff', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                ✓ Iniciar evento
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding: '12px 16px', background: '#fff', borderTop: '0.5px solid #e5e7eb' }}>
            <button onClick={onClose}
              style={{ width: '100%', padding: '13px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, RotateCcw, CheckCircle2 } from 'lucide-react'
import { clearAllDataAction } from '@/lib/actions/admin'

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export function ConfiguracoesClient() {
  const router = useRouter()

  // Estado do modal de reset
  const [showReset, setShowReset]     = useState(false)
  const [step, setStep]               = useState<1 | 2>(1)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [done, setDone]               = useState<Record<string, number> | null>(null)

  function openReset() {
    setShowReset(true)
    setStep(1)
    setConfirmText('')
    setError('')
    setDone(null)
  }

  function closeReset() {
    if (loading) return
    setShowReset(false)
    setStep(1)
    setConfirmText('')
    setError('')
  }

  async function handleReset() {
    if (confirmText !== 'LIMPAR TUDO') return
    setLoading(true)
    setError('')
    const res = await clearAllDataAction()
    setLoading(false)
    if (res.error) {
      setError(res.error)
    } else {
      setDone(res.counts ?? {})
      router.refresh()
    }
  }

  const ITEMS_DELETED = [
    'Jobs e eventos',
    'Clientes',
    'Pagamentos',
    'SD Cards',
    'Usos de SD Cards',
    'HDs e locais de armazenamento',
    'Tarefas dos jobs',
    'Contratos',
    'Histórico de atividades',
  ]

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: 14, background: '#f9fafb' }}>

      {/* ── Seção: Dados e Privacidade ── */}
      <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.7px' }}>
        Dados &amp; Sistema
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>

        {/* Reset de dados */}
        <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RotateCcw size={16} color="#dc2626" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
              Limpar todos os registros
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>
              Remove jobs, clientes, pagamentos, SD cards, HDs e todos os dados operacionais.
              Seu login e configurações de conta não são afetados.
            </div>
          </div>
          <button
            onClick={openReset}
            style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: '#fef2f2', color: '#dc2626',
              border: '1px solid #fecaca', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Trash2 size={13} />
            Limpar tudo
          </button>
        </div>

      </div>

      {/* ── Modal de confirmação ── */}
      {showReset && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeReset() }}
        >
          <div style={{
            background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440,
            boxShadow: '0 20px 60px rgba(0,0,0,.25)',
            overflow: 'hidden',
          }}>

            {/* Header */}
            <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #fee2e2', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>
                  {done ? 'Reset concluído' : 'Limpar todos os registros'}
                </div>
                <div style={{ fontSize: 11, color: '#b91c1c' }}>
                  {done ? 'Todos os dados foram removidos' : 'Esta ação é irreversível'}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px 18px' }}>

              {/* Tela de sucesso */}
              {done ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <CheckCircle2 size={18} color="#059669" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>Sistema limpo com sucesso!</span>
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                    {Object.entries({
                      'Jobs':             done.jobs,
                      'Clientes':         done.clients,
                      'Pagamentos':       done.payments,
                      'SD Cards':         done.sdCards,
                      'Usos de SD':       done.sdCardUsages,
                      'HDs':              done.storageLocations,
                      'Tarefas':          done.jobTasks,
                      'Contratos':        done.jobContracts,
                      'Histórico':        done.jobHistory,
                    }).map(([label, count]) => (
                      count > 0 && (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#166534', padding: '2px 0' }}>
                          <span>{label}</span>
                          <span style={{ fontWeight: 600 }}>{count} removido{count !== 1 ? 's' : ''}</span>
                        </div>
                      )
                    ))}
                  </div>
                  <button
                    onClick={closeReset}
                    style={{
                      width: '100%', padding: '9px', borderRadius: 8,
                      background: '#059669', color: '#fff',
                      border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Fechar
                  </button>
                </div>
              ) : step === 1 ? (
                /* Passo 1: Aviso */
                <div>
                  <p style={{ fontSize: 13, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                    Você está prestes a apagar <strong>permanentemente</strong> todos os registros do sistema. Os seguintes dados serão deletados:
                  </p>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                    {ITEMS_DELETED.map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#991b1b', padding: '2px 0' }}>
                        <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 10 }}>✕</span>
                        {item}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                    Seu login, senha e configurações de conta <strong>não serão afetados</strong>.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={closeReset}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8,
                        background: '#f9fafb', color: '#374151',
                        border: '1px solid #e5e7eb', cursor: 'pointer',
                        fontSize: 12, fontWeight: 500,
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8,
                        background: '#dc2626', color: '#fff',
                        border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600,
                      }}
                    >
                      Continuar mesmo assim →
                    </button>
                  </div>
                </div>
              ) : (
                /* Passo 2: Digitar confirmação */
                <div>
                  <p style={{ fontSize: 13, color: '#374151', marginBottom: 4, lineHeight: 1.5 }}>
                    Para confirmar, digite exatamente:
                  </p>
                  <div style={{
                    background: '#f3f4f6', borderRadius: 6, padding: '6px 10px',
                    fontSize: 13, fontWeight: 700, color: '#111827',
                    fontFamily: 'monospace', marginBottom: 12, letterSpacing: '.5px',
                  }}>
                    LIMPAR TUDO
                  </div>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="Digite LIMPAR TUDO"
                    autoFocus
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 10,
                      border: `1px solid ${confirmText === 'LIMPAR TUDO' ? '#dc2626' : '#e5e7eb'}`,
                      fontSize: 13, outline: 'none', boxSizing: 'border-box',
                      fontFamily: 'monospace', letterSpacing: '.5px',
                      background: confirmText === 'LIMPAR TUDO' ? '#fef2f2' : '#fff',
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && confirmText === 'LIMPAR TUDO') handleReset() }}
                  />
                  {error && (
                    <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>
                      {error}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setStep(1); setConfirmText(''); setError('') }}
                      disabled={loading}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8,
                        background: '#f9fafb', color: '#374151',
                        border: '1px solid #e5e7eb', cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: 12, fontWeight: 500, opacity: loading ? 0.5 : 1,
                      }}
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={confirmText !== 'LIMPAR TUDO' || loading}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8,
                        background: confirmText === 'LIMPAR TUDO' ? '#dc2626' : '#f3f4f6',
                        color: confirmText === 'LIMPAR TUDO' ? '#fff' : '#9ca3af',
                        border: 'none', cursor: confirmText === 'LIMPAR TUDO' && !loading ? 'pointer' : 'not-allowed',
                        fontSize: 12, fontWeight: 600,
                        transition: 'all .15s',
                      }}
                    >
                      {loading ? 'Limpando...' : '🗑 Apagar tudo'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

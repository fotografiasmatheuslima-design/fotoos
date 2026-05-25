'use client'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'

const STEPS = ['CRM preenche', 'Você revisa', 'Gera PDF', 'Envia cliente', 'Cliente retorna assinado']

export default function ContratosPage() {
  const router = useRouter()
  return (
    <>
      <Header title="Contratos" />
      <div className="flex-1 overflow-y-auto" style={{ padding: 14, background: '#f9fafb' }}>

        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '13px 15px', marginBottom: 11 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', marginBottom: 10 }}>
            Fluxo do motor de contratos
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                <div style={{ flex: 1, background: i === 4 ? '#dcfce7' : i === 0 ? '#dbeafe' : '#f3f4f6', borderRadius: 6, padding: 7, textAlign: 'center', fontSize: 10, fontWeight: 500, color: '#111827' }}>{s}</div>
                {i < 4 && <span style={{ color: '#9ca3af', flexShrink: 0 }}>{'>'}</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={() => router.push('/contratos/gerar')} style={{ fontSize: 12, padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            + Gerar contrato
          </button>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Nenhum contrato encontrado</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Use o gerador para criar e enviar contratos aos seus clientes.</div>
        </div>
      </div>
    </>
  )
}

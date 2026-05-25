import { Header } from '@/components/layout/header'

export default async function EquipePage() {
  return (
    <>
      <Header title="Equipe" />
      <div className="flex-1 overflow-y-auto" style={{ padding: 14, background: '#f9fafb' }}>

        {/* Info boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderLeft: '3px solid #7c3aed', borderRadius: 8, padding: '10px 13px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', marginBottom: 5 }}>👥 Sua equipe — trabalham para você</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Pessoas que você contrata para trabalhar nos seus jobs. Fotógrafos, editores, assistentes. Fixos ou freelancers. Você paga comissão ou cachê para eles.</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderLeft: '3px solid #0d9488', borderRadius: 8, padding: '10px 13px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', marginBottom: 5 }}>💲 Diárias — você trabalha para outros</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Quando você é contratado por outro estúdio. Registrado em <strong style={{ fontWeight: 500 }}>Trabalhos → Diárias</strong> — não é equipe, é uma fonte de renda sua.</div>
          </div>
        </div>

        {/* Empty state */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Nenhum membro cadastrado</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Adicione fotógrafos, editores e assistentes que trabalham com você.</div>
        </div>
      </div>
    </>
  )
}

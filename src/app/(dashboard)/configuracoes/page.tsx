import { Header } from '@/components/layout/header'
import { ConfiguracoesClient } from './_components/configuracoes-client'

export default function ConfiguracoesPage() {
  return (
    <>
      <Header title="Configurações" />
      <ConfiguracoesClient />
    </>
  )
}

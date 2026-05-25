import { getClients } from '@/lib/services/clients'
import { ClientesClient } from './_components/clientes-client'

export default async function ClientesPage() {
  const clients = await getClients()
  return <ClientesClient initialClients={clients} />
}

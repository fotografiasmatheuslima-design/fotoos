import { getJobs } from '@/lib/services/jobs'
import { FinanceiroClient } from './_components/financeiro-client'

export default async function FinanceiroPage() {
  const jobs = await getJobs()
  return <FinanceiroClient initialJobs={jobs} />
}

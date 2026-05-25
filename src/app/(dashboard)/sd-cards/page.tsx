import { getSdPageData } from '@/lib/services/sd'
import { getJobs } from '@/lib/services/jobs'
import { SdCardsClient } from './_components/sd-cards-client'

export default async function SDCardsPage() {
  const [{ cards, hds }, allJobs] = await Promise.all([
    getSdPageData(),
    getJobs(),
  ])

  // Simplified job list for the "register use" dropdown
  const jobs = allJobs
    .filter(j => !['cancelado', 'finalizado'].includes(j.status))
    .map(j => ({ id: j.id, title: j.title, clientName: j.clientName ?? null }))

  return <SdCardsClient initialCards={cards} initialHds={hds} jobs={jobs} />
}

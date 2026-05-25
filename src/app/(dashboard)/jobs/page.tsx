import { getJobs } from '@/lib/services/jobs'
import { JobsClient } from './_components/jobs-client'

export default async function JobsPage() {
  const jobs = await getJobs()
  return <JobsClient initialJobs={jobs} />
}

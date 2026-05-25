import { redirect } from 'next/navigation'
import { getJobById } from '@/lib/services/jobs'
import { JobDetailClient } from './_components/job-detail-client'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) redirect('/jobs')

  const job = await getJobById(id)
  if (!job) redirect('/jobs')

  return <JobDetailClient job={job} />
}

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JobSlideOver } from '@/components/jobs/job-slide-over'
import type { JobFull } from '@/lib/services/jobs-data'
import type { JobStatus } from '@/lib/db/schema/enums'

export function JobDetailClient({ job: initialJob }: { job: JobFull }) {
  const router = useRouter()
  const [job, setJob] = useState<JobFull>(initialJob)

  return (
    <JobSlideOver
      job={job as any}
      fullPage
      onClose={() => router.push('/jobs')}
      onStatusChange={(newStatus: JobStatus) => {
        setJob(prev => ({ ...prev, status: newStatus }))
        router.refresh()
      }}
    />
  )
}

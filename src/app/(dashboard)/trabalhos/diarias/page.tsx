'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DiariasPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/jobs?type=diaria') }, [router])
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 13, color: '#9ca3af' }}>
      Redirecionando para Jobs...
    </div>
  )
}

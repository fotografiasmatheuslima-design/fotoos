'use client'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

export function useOrg() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['org'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data } = await supabase
        .from('profiles')
        .select('org_id, role, full_name, organizations(*)')
        .eq('id', user.id)
        .single()

      return data
    },
  })
}

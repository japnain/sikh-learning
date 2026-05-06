import { useEffect } from 'react'
import { bootstrapCloudSync } from '../supabase/runtime'

export function useSupabaseBootstrap() {
  useEffect(() => {
    void bootstrapCloudSync()
  }, [])
}

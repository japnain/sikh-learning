import { useEffect } from 'react'
import { useBookmarksStore } from '../store/bookmarks'
import { useCloudSyncStore } from '../store/cloudSync'
import { getNaamrasSupabaseConfig } from '../supabase/config'

const CLOUD_RUNTIME_LOAD_ERROR =
  'Backup is unavailable right now. You can keep reading on this device and sign in later.'

export function useSupabaseBootstrap() {
  useEffect(() => {
    useBookmarksStore.getState().hydrateCachedBookmarks()

    if (!getNaamrasSupabaseConfig().enabled) return
    void import('../supabase/runtime')
      .then(({ bootstrapCloudSync }) => bootstrapCloudSync())
      .catch(() => {
        const syncStore = useCloudSyncStore.getState()
        syncStore.setConfigured(true)
        syncStore.setStatus('error')
        syncStore.setLastError(CLOUD_RUNTIME_LOAD_ERROR)
      })
  }, [])
}

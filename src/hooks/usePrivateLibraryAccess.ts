import { useEffect, useSyncExternalStore } from 'react'
import { getPrivateLibraryAccess, initializePrivateLibrarySession, recheckPrivateLibraryAccess, subscribePrivateLibraryAccess } from '../data/privateLibrary'

export function usePrivateLibraryAccess() {
  const access = useSyncExternalStore(subscribePrivateLibraryAccess, getPrivateLibraryAccess, getPrivateLibraryAccess)
  useEffect(() => { initializePrivateLibrarySession() }, [])
  return { ...access, recheck: recheckPrivateLibraryAccess }
}

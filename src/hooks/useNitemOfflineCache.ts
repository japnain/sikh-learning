import { useEffect } from 'react'
import { NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import { fetchAng } from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'

/**
 * Silently pre-fetches the first ang of each Nitnem bani on app start.
 * Since scriptureCache persists to localStorage, this seeds offline availability.
 */
export function useNitemOfflineCache() {
  const { getAng, setAng } = useScriptureCacheStore()

  useEffect(() => {
    const seen = new Set<string>()

    for (const bani of NITNEM_ROUTE_OPTIONS) {
      const cacheKey = `${bani.source}-${bani.startAng}`
      if (seen.has(cacheKey)) continue
      seen.add(cacheKey)

      if (!getAng(bani.source, bani.startAng)) {
        fetchAng(bani.startAng, bani.source)
          .then(data => setAng(bani.source, bani.startAng, data))
          .catch(() => {}) // silent — offline caching is best-effort
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

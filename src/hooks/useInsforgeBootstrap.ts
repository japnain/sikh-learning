import { useEffect } from 'react'
import { bootstrapCloudSync } from '../insforge/runtime'

export function useInsforgeBootstrap() {
  useEffect(() => {
    void bootstrapCloudSync()
  }, [])
}

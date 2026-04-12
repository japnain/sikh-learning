import { createClient, type InsForgeClient } from '@insforge/sdk'
import { getNaamrasInsforgeConfig } from './config'

let cachedClient: InsForgeClient | null | undefined

export function getNaamrasInsforgeClient() {
  if (cachedClient !== undefined) return cachedClient

  const config = getNaamrasInsforgeConfig()
  if (!config.enabled || !config.baseUrl) {
    cachedClient = null
    return cachedClient
  }

  cachedClient = createClient({
    baseUrl: config.baseUrl,
    anonKey: config.anonKey,
    functionsUrl: config.functionsUrl,
  })

  return cachedClient
}

export function resetNaamrasInsforgeClientForTests() {
  cachedClient = undefined
}

import { getNaamrasSupabaseClient } from './client'
import { getNaamrasSupabaseConfig } from './config'

const LOCAL_AMBIENT_ROOT = '/audio/ambient'

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '')
}

function joinStoragePath(prefix: string | undefined, fileName: string) {
  const normalizedFileName = trimSlashes(fileName)
  if (!prefix) return normalizedFileName
  return `${trimSlashes(prefix)}/${normalizedFileName}`
}

export function getLocalAmbientSoundSrc(fileName: string) {
  return `${LOCAL_AMBIENT_ROOT}/${trimSlashes(fileName)}`
}

export function resolveAmbientSoundSrc(fileName: string) {
  const config = getNaamrasSupabaseConfig()
  const localSrc = getLocalAmbientSoundSrc(fileName)

  if (!config.enabled || !config.audioBucket) {
    return localSrc
  }

  const client = getNaamrasSupabaseClient()
  if (!client) {
    return localSrc
  }

  return client.storage
    .from(config.audioBucket)
    .getPublicUrl(joinStoragePath(config.audioPrefix, fileName)).data.publicUrl
}

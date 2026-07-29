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

function getPublicStorageUrl(
  projectUrl: string,
  bucket: string,
  objectPath: string
) {
  const normalizedProjectUrl = projectUrl.replace(/\/+$/, '')
  const normalizedBucket = trimSlashes(bucket)
  const normalizedObjectPath = objectPath.replace(/^\/+/, '')

  return encodeURI(
    `${normalizedProjectUrl}/storage/v1/object/public/${normalizedBucket}/${normalizedObjectPath}`
  )
}

export function getLocalAmbientSoundSrc(fileName: string) {
  return `${LOCAL_AMBIENT_ROOT}/${trimSlashes(fileName)}`
}

export function resolveAmbientSoundSrc(fileName: string) {
  const config = getNaamrasSupabaseConfig()
  const localSrc = getLocalAmbientSoundSrc(fileName)

  if (!config.enabled || !config.url || !config.audioBucket) {
    return localSrc
  }

  return getPublicStorageUrl(
    config.url,
    config.audioBucket,
    joinStoragePath(config.audioPrefix, fileName)
  )
}

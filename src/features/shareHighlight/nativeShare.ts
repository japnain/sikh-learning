import { Capacitor, registerPlugin } from '@capacitor/core'
import type { ShareHighlightShareResult } from './types'

interface NativeImagePayload {
  files: { name: string; data: string }[]
  title?: string
  text?: string
  url?: string
}

interface NativeImageSharePlugin {
  share(payload: NativeImagePayload & { requestId: string }): Promise<{ status: 'shared' | 'cancelled' }>
  save(payload: NativeImagePayload & { requestId: string }): Promise<{ status: 'saved' | 'cancelled' }>
  cancel?(payload: { requestId: string }): Promise<{ status: 'cancelled' | 'ignored' }>
}

const nativeImages = registerPlugin<NativeImageSharePlugin>('NaamRasImageShare')
export const NATIVE_IMAGE_BYTE_LIMIT = 24 * 1024 * 1024

export function isNativeImagePlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

function abortedImagePreparation(): DOMException {
  return new DOMException('The image preparation was cancelled.', 'AbortError')
}

let nativeRequestSequence = 0

async function invokeNativeImageAction<T>(
  payload: NativeImagePayload,
  invoke: (payload: NativeImagePayload & { requestId: string }) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const requestId = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${++nativeRequestSequence}-${Math.random().toString(36).slice(2)}`
  const cancel = () => {
    // Older installed bridges may not yet expose cancellation. The original
    // action still owns its result; never turn an optional cancel error into it.
    try { void nativeImages.cancel?.({ requestId }).catch(() => undefined) } catch { /* Older bridge. */ }
  }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    if (signal?.aborted) throw abortedImagePreparation()
    return await invoke({ ...payload, requestId })
  } finally {
    signal?.removeEventListener('abort', cancel)
  }
}

async function imagePayload(files: readonly File[], signal?: AbortSignal): Promise<NativeImagePayload> {
  if (signal?.aborted) throw abortedImagePreparation()
  if (!files.length || files.length > 12
    || files.some(file => file.type !== 'image/png' || file.size === 0)
    || files.reduce((sum, file) => sum + file.size, 0) > NATIVE_IMAGE_BYTE_LIMIT) {
    throw new Error('The native image payload is invalid or too large.')
  }
  const images: NativeImagePayload['files'] = []
  // Encode sequentially to avoid holding several extra image buffers at once.
  for (const file of files) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      let settled = false
      const finish = (result: string | Error | DOMException) => {
        if (settled) return
        settled = true
        signal?.removeEventListener('abort', abortRead)
        reader.onload = null
        reader.onerror = null
        reader.onabort = null
        if (typeof result === 'string') resolve(result)
        else reject(result)
      }
      const abortRead = () => {
        finish(abortedImagePreparation())
        reader.abort()
      }
      reader.onerror = () => finish(new Error('The image could not be read.'))
      reader.onabort = () => finish(abortedImagePreparation())
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : ''
        const prefix = 'data:image/png;base64,'
        if (!result.startsWith(prefix)) finish(new Error('The image could not be encoded.'))
        else finish(result.slice(prefix.length))
      }
      signal?.addEventListener('abort', abortRead, { once: true })
      if (signal?.aborted) {
        abortRead()
        return
      }
      try {
        reader.readAsDataURL(file)
      } catch (error) {
        finish(error instanceof Error ? error : new Error('The image could not be read.'))
      }
    })
    images.push({ name: file.name, data })
  }
  return { files: images }
}

export async function shareNativeHighlightFiles(
  files: readonly File[],
  options: { title?: string; text?: string; url?: string; signal?: AbortSignal } = {},
): Promise<ShareHighlightShareResult> {
  if (!Capacitor.isPluginAvailable('NaamRasImageShare')) {
    return { status: 'unsupported', method: 'native-share', reason: 'api-unavailable' }
  }
  try {
    const { signal, ...shareOptions } = options
    const payload = await imagePayload(files, signal)
    if (signal?.aborted) throw abortedImagePreparation()
    const result = await invokeNativeImageAction(
      { ...payload, ...shareOptions },
      value => nativeImages.share(value),
      signal,
    )
    if (result.status === 'cancelled') return { status: 'cancelled', method: 'native-share' }
    if (result.status !== 'shared') throw new Error('Sharing did not complete.')
    return { status: 'shared', method: 'native-share', payload: 'full' }
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      return { status: 'cancelled', method: 'native-share' }
    }
    return { status: 'failed', method: 'native-share', error }
  }
}

export async function saveNativeHighlightFiles(
  files: readonly File[],
  options: { signal?: AbortSignal } = {},
): Promise<void> {
  if (!Capacitor.isPluginAvailable('NaamRasImageShare')) {
    throw new Error('Native image saving is unavailable.')
  }
  const payload = await imagePayload(files, options.signal)
  if (options.signal?.aborted) throw abortedImagePreparation()
  const result = await invokeNativeImageAction(payload, value => nativeImages.save(value), options.signal)
  if (result.status === 'cancelled') throw abortedImagePreparation()
  if (result.status !== 'saved') throw new Error('The image was not saved.')
}

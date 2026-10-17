import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isNativeImagePlatform, NATIVE_IMAGE_BYTE_LIMIT, saveNativeHighlightFiles, shareNativeHighlightFiles } from './nativeShare'
import { shareHighlightFiles } from './share'

const native = vi.hoisted(() => ({
  isNativePlatform: vi.fn(), getPlatform: vi.fn(), isPluginAvailable: vi.fn(),
  share: vi.fn(), save: vi.fn(), cancel: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: native,
  registerPlugin: () => ({ share: native.share, save: native.save, cancel: native.cancel }),
}))
const file = () => new File(['png'], 'hukamnama.png', { type: 'image/png' })

function controlImageEncoding() {
  const readers: ControlledReader[] = []
  class ControlledReader {
    result: string | null = null
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    onabort: (() => void) | null = null
    readAsDataURL = vi.fn()
    abort = vi.fn()
    constructor() { readers.push(this) }
  }
  vi.stubGlobal('FileReader', ControlledReader)
  return readers
}

beforeEach(() => {
  vi.clearAllMocks()
  native.isNativePlatform.mockReturnValue(true)
  native.getPlatform.mockReturnValue('ios')
  native.isPluginAvailable.mockReturnValue(true)
  native.share.mockResolvedValue({ status: 'shared' })
  native.save.mockResolvedValue({ status: 'saved' })
  native.cancel.mockResolvedValue({ status: 'ignored' })
})

afterEach(() => vi.unstubAllGlobals())

describe('native image delivery', () => {
  it('only selects the iOS installed-app path', () => {
    expect(isNativeImagePlatform()).toBe(true)
    native.getPlatform.mockReturnValue('android')
    expect(isNativeImagePlatform()).toBe(false)
    native.getPlatform.mockReturnValue('ios')
    native.isNativePlatform.mockReturnValue(false)
    expect(isNativeImagePlatform()).toBe(false)
  })

  it('passes the exact PNG and companion text through the native bridge', async () => {
    const options = { title: 'Hukamnama', text: 'ਸਤਿ ਨਾਮੁ', url: 'https://naamras.xyz/h/2026-10-09' }
    expect(await shareHighlightFiles([file()], options)).toEqual({
      status: 'shared', method: 'native-share', payload: 'full',
    })
    expect(native.share).toHaveBeenCalledWith({
      files: [{ name: 'hukamnama.png', data: btoa('png') }], requestId: expect.any(String), ...options,
    })
  })

  it('never treats dismissing the native sheet as a successful share', async () => {
    native.share.mockResolvedValue({ status: 'cancelled' })
    expect(await shareNativeHighlightFiles([file()])).toEqual({ status: 'cancelled', method: 'native-share' })
  })

  it('does not begin encoding or invoke native delivery after cancellation', async () => {
    const readers = controlImageEncoding()
    const controller = new AbortController()
    controller.abort()

    await expect(shareHighlightFiles([file()], { signal: controller.signal }))
      .resolves.toMatchObject({ status: 'cancelled', method: 'native-share' })
    await expect(saveNativeHighlightFiles([file()], { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' })
    expect(readers).toHaveLength(0)
    expect(native.share).not.toHaveBeenCalled()
    expect(native.save).not.toHaveBeenCalled()
  })

  it.each(['share', 'save'] as const)('aborts a pending %s encoding before opening any native action', async action => {
    const readers = controlImageEncoding()
    const controller = new AbortController()
    const pending = action === 'share'
      ? shareHighlightFiles([file()], { signal: controller.signal })
      : saveNativeHighlightFiles([file()], { signal: controller.signal })
    const result = action === 'share'
      ? expect(pending).resolves.toMatchObject({ status: 'cancelled', method: 'native-share' })
      : expect(pending).rejects.toMatchObject({ name: 'AbortError' })

    expect(readers).toHaveLength(1)
    controller.abort()
    await result
    expect(readers[0]!.abort).toHaveBeenCalledOnce()
    expect(readers[0]!.onload).toBeNull()
    expect(native.share).not.toHaveBeenCalled()
    expect(native.save).not.toHaveBeenCalled()
  })

  it('does not invoke native delivery if cancellation follows the final encoded image', async () => {
    const readers = controlImageEncoding()
    const controller = new AbortController()
    const pending = shareHighlightFiles([file()], { signal: controller.signal })
    readers[0]!.result = `data:image/png;base64,${btoa('png')}`
    readers[0]!.onload?.()
    controller.abort()

    await expect(pending).resolves.toMatchObject({ status: 'cancelled' })
    expect(native.share).not.toHaveBeenCalled()
  })

  it.each(['share', 'save'] as const)('forwards cancellation of an invoked %s to its exact native request', async action => {
    const readers = controlImageEncoding()
    const controller = new AbortController()
    let complete!: (value: { status: 'cancelled' }) => void
    native[action].mockReturnValueOnce(new Promise(resolve => { complete = resolve }))
    const pending = action === 'share'
      ? shareHighlightFiles([file()], { signal: controller.signal })
      : saveNativeHighlightFiles([file()], { signal: controller.signal })
    const result = action === 'share'
      ? expect(pending).resolves.toMatchObject({ status: 'cancelled', method: 'native-share' })
      : expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    readers[0]!.result = `data:image/png;base64,${btoa('png')}`
    readers[0]!.onload?.()
    await vi.waitFor(() => expect(native[action]).toHaveBeenCalledOnce())
    const { requestId } = native[action].mock.calls[0]![0]

    controller.abort()
    expect(native.cancel).toHaveBeenCalledOnce()
    expect(native.cancel).toHaveBeenCalledWith({ requestId })
    complete({ status: 'cancelled' })
    await result
  })

  it('preserves the original OS result when an older bridge lacks optional cancellation', async () => {
    const readers = controlImageEncoding()
    const controller = new AbortController()
    let complete!: (value: { status: 'shared' }) => void
    native.share.mockReturnValueOnce(new Promise(resolve => { complete = resolve }))
    native.cancel.mockRejectedValueOnce(Object.assign(new Error('Not implemented'), { code: 'UNIMPLEMENTED' }))
    const pending = shareHighlightFiles([file()], { signal: controller.signal })
    readers[0]!.result = `data:image/png;base64,${btoa('png')}`
    readers[0]!.onload?.()
    await vi.waitFor(() => expect(native.share).toHaveBeenCalledOnce())

    controller.abort()
    expect(native.cancel).toHaveBeenCalledOnce()
    complete({ status: 'shared' })
    await expect(pending).resolves.toMatchObject({ status: 'shared', method: 'native-share' })
  })

  it('stops forwarding cancellation once the native action has completed', async () => {
    const controller = new AbortController()
    await expect(shareHighlightFiles([file()], { signal: controller.signal }))
      .resolves.toMatchObject({ status: 'shared' })
    controller.abort()
    expect(native.cancel).not.toHaveBeenCalled()
  })

  it('reports an old installed build missing the bridge as unsupported', async () => {
    native.isPluginAvailable.mockReturnValue(false)
    expect(await shareHighlightFiles([file()])).toEqual({
      status: 'unsupported', method: 'native-share', reason: 'api-unavailable',
    })
    await expect(saveNativeHighlightFiles([file()])).rejects.toThrow('unavailable')
    expect(native.share).not.toHaveBeenCalled()
    expect(native.save).not.toHaveBeenCalled()
  })

  it('reports native errors and unexpected responses as failures', async () => {
    native.share.mockRejectedValue(new Error('busy'))
    expect(await shareNativeHighlightFiles([file()])).toMatchObject({ status: 'failed', method: 'native-share' })
    native.share.mockResolvedValue({ status: 'unknown' })
    expect(await shareNativeHighlightFiles([file()])).toMatchObject({ status: 'failed' })
  })

  it('rejects empty, non-PNG, excessive-count, and excessive-size payloads before encoding', async () => {
    const oversized = file()
    Object.defineProperty(oversized, 'size', { value: NATIVE_IMAGE_BYTE_LIMIT + 1 })
    for (const files of [[], [new File([], 'empty.png', { type: 'image/png' })],
      [new File(['data'], 'text.txt', { type: 'text/plain' })], Array.from({ length: 13 }, file), [oversized]]) {
      expect(await shareNativeHighlightFiles(files)).toMatchObject({ status: 'failed' })
      await expect(saveNativeHighlightFiles(files)).rejects.toThrow()
    }
    expect(native.share).not.toHaveBeenCalled()
    expect(native.save).not.toHaveBeenCalled()
  })

  it('does not claim a Photos save until the native operation succeeds', async () => {
    await expect(saveNativeHighlightFiles([file()])).resolves.toBeUndefined()
    expect(native.save).toHaveBeenCalledWith({
      files: [{ name: 'hukamnama.png', data: btoa('png') }], requestId: expect.any(String),
    })
    native.save.mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'PHOTO_PERMISSION' }))
    await expect(saveNativeHighlightFiles([file()])).rejects.toMatchObject({ code: 'PHOTO_PERMISSION' })
    native.save.mockResolvedValue({ status: 'cancelled' })
    await expect(saveNativeHighlightFiles([file()])).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('keeps an explicitly provided browser environment on the Web Share path', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    expect(await shareHighlightFiles([file()], { navigator: { canShare: () => true, share } }))
      .toMatchObject({ status: 'shared', method: 'web-share' })
    expect(share).toHaveBeenCalledOnce()
    expect(native.share).not.toHaveBeenCalled()
  })
})

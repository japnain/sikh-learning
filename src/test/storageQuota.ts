import { vi } from 'vitest'

/** Model browser capacity across all keys, including replacement/rollback writes. */
export function limitLocalStorageToCurrentSize() {
  const size = () => Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!)
    .reduce((total, key) => total + key.length + localStorage.getItem(key)!.length, 0)
  const limit = size()
  const write = localStorage.setItem.bind(localStorage)
  return vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    const previous = localStorage.getItem(key)
    const replacedSize = previous === null ? 0 : key.length + previous.length
    if (size() - replacedSize + key.length + value.length > limit) {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    }
    write(key, value)
  })
}

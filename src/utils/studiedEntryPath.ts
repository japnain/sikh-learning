import type { ScriptureEntry } from '../types'
import { isSafeSavedReturnPath } from './savedRouteIdentity'

/** Recently studied exact readings must reopen in the provider that supplied them. */
export function getStudiedEntryPath(entry: ScriptureEntry) {
  if (isSafeSavedReturnPath(entry.readerReturnPath)) return entry.readerReturnPath
  return `/study?source=${entry.source}&ang=${entry.ang}`
}

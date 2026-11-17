import { getPersonalStorageOwner, LOCAL_DATA_OWNER } from './ownerStorage'

/** Session drafts/queues contain personal choices even though they never sync. */
export function personalSessionKey(key: string): string {
  const owner = getPersonalStorageOwner()
  return owner === LOCAL_DATA_OWNER ? key : `naamras-owner-v1:${encodeURIComponent(owner)}:${key}`
}

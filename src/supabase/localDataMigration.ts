import { getPersonalStorage, getPersonalStorageForOwner, getPersonalStorageGeneration, getPersonalStorageOwner, LOCAL_DATA_OWNER } from '../utils/ownerStorage'
import { useActivityEventsStore } from '../store/activityEvents'
import type { CloudActivityEvent } from './types'
const CLAIM = 'naamras-local-data-claim-v1'
const CHOICE = 'naamras-local-data-choice'
type Claim = { version: 1; owner: string; status: 'pending' | 'imported' }
function readClaim(): Claim | null {
  const raw = localStorage.getItem(CLAIM)
  if (!raw) return null
  const value = JSON.parse(raw) as Claim
  if (value.version !== 1 || typeof value.owner !== 'string' || !['pending', 'imported'].includes(value.status)) throw new Error('local-data-claim-invalid')
  return value
}
export function canOfferLocalDataMigration() {
  const owner = getPersonalStorageOwner()
  if (owner === LOCAL_DATA_OWNER) return false
  try {
    const claim = readClaim()
    if (claim) return claim.owner === owner && claim.status === 'pending'
    if (getPersonalStorage().getItem(CHOICE) === 'separate') return false
    return ['sikh-bookmarks', 'sikh-favorites', 'sikh-vocab', 'sikh-progress', 'sikh-nitnem', 'naamras-story-state-v1']
      .some(key => localStorage.getItem(key) !== null)
  } catch { return false }
}
export function keepLocalDataSeparate() {
  const storage = getPersonalStorage()
  storage.setItem(CHOICE, 'separate')
  if (storage.getItem(CHOICE) !== 'separate') throw new Error('local-data-choice-not-persisted')
}
function pendingEvents(storage: Storage): CloudActivityEvent[] {
  const raw = storage.getItem('naamras-cloud-activity-events')
  if (!raw) return []
  const value = JSON.parse(raw)
  if (value?.version !== 0 || !Array.isArray(value.state?.pendingEvents)) throw new Error('local-events-invalid')
  const events = value.state.pendingEvents as CloudActivityEvent[]
  if (events.length > 250 || events.some(event => !event || typeof event.id !== 'string' || !event.id
    || typeof event.eventType !== 'string' || !event.payload || typeof event.payload !== 'object'
    || !Number.isFinite(Date.parse(event.occurredAt)) || !Number.isFinite(Date.parse(event.clientUpdatedAt)))) throw new Error('local-events-invalid')
  return events.map(event => ({ ...event, userId: null }))
}
/** Explicit, owner-bound import; original local data is never deleted. The Web
 * Lock serializes claims across tabs. Pending claims can only retry for A. */
export async function importLocalDataIntoCurrentAccount() {
  if (!navigator.locks) throw new Error('local-data-import-lock-unavailable')
  const owner = getPersonalStorageOwner(), generation = getPersonalStorageGeneration()
  const current = () => owner !== LOCAL_DATA_OWNER && owner === getPersonalStorageOwner() && generation === getPersonalStorageGeneration()
  return navigator.locks.request(CLAIM, async () => {
    if (!current()) throw new Error('local-data-owner-changed')
    const previous = readClaim()
    if (previous && (previous.owner !== owner || previous.status === 'imported')) return false
    const source = getPersonalStorageForOwner(LOCAL_DATA_OWNER)
    const module = await import('../utils/personalDataBackup')
    if (!current()) throw new Error('local-data-owner-changed')
    const backup = module.createPersonalDataBackup(source)
    const events = pendingEvents(source)
    const claim: Claim = { version: 1, owner, status: 'pending' }
    const writeClaim = () => {
      const encoded = JSON.stringify(claim)
      localStorage.setItem(CLAIM, encoded)
      if (localStorage.getItem(CLAIM) !== encoded) throw new Error('local-data-claim-not-persisted')
    }
    writeClaim()
    await module.restorePersonalDataBackup(backup, 'merge')
    if (!current()) throw new Error('local-data-owner-changed')
    const combined = [...new Map([...events, ...useActivityEventsStore.getState().pendingEvents].map(event => [event.id, event])).values()]
    // Don't silently discard an older pending queue just to fit the current cap.
    if (combined.length > 250) throw new Error('local-data-events-capacity')
    useActivityEventsStore.setState({ pendingEvents: combined })
    const expected = JSON.stringify({ state: { pendingEvents: combined }, version: 0 })
    if (getPersonalStorage().getItem('naamras-cloud-activity-events') !== expected) throw new Error('local-data-events-not-persisted')
    claim.status = 'imported'
    writeClaim()
    return true
  })
}

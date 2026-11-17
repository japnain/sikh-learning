import { afterEach, expect, test, vi } from 'vitest'
const m = vi.hoisted(() => ({ invoke: vi.fn(), listener: null as null | ((event: string, session: unknown) => void) }))
vi.mock('./config', () => ({getNaamrasSupabaseConfig: () => ({enabled: true, url: 'https://audit.invalid', anonKey: 'synthetic', mergeFunctionSlug: 'merge-local-state'})}))
vi.mock('./authProviders', () => ({ discoverAuthProviders: async () => ['email'] }))
vi.mock('./client', () => ({getNaamrasSupabaseClient: () => ({
 auth: {getSession: async () => ({data:{session:{access_token:'synthetic-token-a',user:{id:'audit-account-a',app_metadata:{},user_metadata:{}}}},error:null}),
 onAuthStateChange: (fn: typeof m.listener) => {m.listener=fn;return {data:{subscription:{unsubscribe(){}}}}},
 signOut: async () => ({error:null})}, functions:{invoke:m.invoke}
})}))
vi.mock('../qa/runtime', () => ({withQaControl: (_key: string, fn: () => unknown) => fn()}))
import { bootstrapCloudSync, signOutOfCloud, syncNow, resetCloudSyncRuntimeForTests } from './runtime'
import { useBookmarksStore } from '../store/bookmarks'
import { useCloudSyncStore } from '../store/cloudSync'

afterEach(() => { resetCloudSyncRuntimeForTests(); localStorage.clear(); vi.useRealTimers() })
test('AUDIT: account A bookmark must not be uploaded automatically to account B', async () => {
 vi.useFakeTimers(); localStorage.clear(); useCloudSyncStore.getState().reset()
 const bookmark = {id:'audit-a-bookmark',type:'bani',source:'G',ang:1,title:'Synthetic account A bookmark',savedAt:'2026-11-16T12:00:00.000Z'}
 localStorage.setItem('sikh-bookmarks',JSON.stringify([bookmark]))
 useBookmarksStore.getState().hydrateCachedBookmarks()
 m.invoke.mockImplementation(async (_slug, {body}) => ({error:null,data:{version:3,complete:true,
 acknowledgedEventIds:body.snapshot.activityEvents.map((e:{id:string})=>e.id), mergedAt:new Date().toISOString(),
 snapshot:{...body.snapshot,generatedAt:new Date().toISOString()}}}))
 await bootstrapCloudSync()
 await signOutOfCloud()
 m.invoke.mockClear()
 m.listener!('SIGNED_IN',{access_token:'synthetic-token-b',user:{id:'audit-account-b',app_metadata:{},user_metadata:{}}})
 await syncNow('audit-account-switch')
 expect(m.invoke).toHaveBeenCalledTimes(1)
 const uploaded = m.invoke.mock.calls[0][1].body.snapshot.savedItems
 expect(uploaded.some((item:{id:string})=>item.id==='audit-a-bookmark')).toBe(false)
})

import { useFavoritesStore } from '../store/favorites'
import { useVocabStore } from '../store/vocab'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useNitemStore } from '../store/nitnem'
import { useActivityEventsStore } from '../store/activityEvents'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { getPersonalStorage, getPersonalStorageForOwner, getPersonalStorageOwner } from '../utils/ownerStorage'
import { exportLocalSnapshot } from './snapshot'
import { resolveLocalDataMigration } from './runtime'
const account = (id: string) => ({ access_token: `synthetic-token-${id}`, user: { id, app_metadata: {}, user_metadata: {} } })
async function initialize() {
 vi.useFakeTimers(); localStorage.clear(); useCloudSyncStore.getState().reset()
 m.invoke.mockImplementation(async (_slug, { body }) => ({ error: null, data: { version: 3, complete: true,
   acknowledgedEventIds: body.snapshot.activityEvents.map((e: { id: string }) => e.id), mergedAt: new Date().toISOString(),
   snapshot: { ...body.snapshot, generatedAt: new Date().toISOString() } } }))
 await bootstrapCloudSync(); m.invoke.mockClear()
}
test('all outgoing domains and clocks remain with A across logout, B, and return to A', async () => {
 await initialize()
 useBookmarksStore.getState().addBookmark({ type:'bani', source:'G', ang:1, title:'A-private-bookmark' })
 useFavoritesStore.setState({ favorites:[{ id:'A-private-favorite', type:'shabad', source:'G', ang:1, title:'A-private-favorite', savedAt:'2026-11-16T12:00:00.000Z' }] })
 // setState is a public memory setter for this collection; use replace for durability.
 useFavoritesStore.getState().replaceFavorites(useFavoritesStore.getState().favorites)
 useVocabStore.getState().addWord({ word:'A-private-word', transliteration:'test', meaning_en:'test', meaning_hi:'', meaning_pa:'', scripture:'G', sourceId:'1', savedAt:'2026-11-16T12:00:00.000Z' })
 useProgressStore.getState().updateSession({ scriptureId:'A-private-progress', resumePath:'/study?source=G&ang=1', updatedAt:'2026-11-16T12:00:00.000Z' })
 useReadingProgressStore.setState({ progress:{ 'A-private-reading':[1] } })
 useNitemStore.setState({ selectedIds:['kirtan-sohila'], completedIds:['kirtan-sohila'] })
 useActivityEventsStore.getState().appendEvent('A-private-event', { note:'A-private-payload' })
 const a = exportLocalSnapshot()
 const metadata = getPersonalStorage().getItem('naamras-cloud-sync-export-metadata')
 expect(JSON.stringify(a)).toContain('A-private-')
 await signOutOfCloud()
 expect(getPersonalStorageOwner()).toBe('local')
 expect(JSON.stringify(exportLocalSnapshot())).not.toContain('A-private-')
 m.listener!('SIGNED_IN', account('audit-account-b'))
 expect(JSON.stringify(exportLocalSnapshot())).not.toContain('A-private-')
 expect(useReadingPlacesStore.getState().places).toEqual({})
 await syncNow()
 expect(JSON.stringify(m.invoke.mock.calls.at(-1)![1])).not.toContain('A-private-')
 useBookmarksStore.getState().addBookmark({ type:'bani', source:'G', ang:2, title:'B-private-bookmark' })
 m.listener!('SIGNED_IN', account('audit-account-a'))
 const restored = exportLocalSnapshot()
 expect(restored.savedItems.map(row => row.payload?.title)).toContain('A-private-bookmark')
 expect(JSON.stringify(restored)).toContain('A-private-word')
 expect(JSON.stringify(restored)).toContain('A-private-progress')
 expect(JSON.stringify(restored)).toContain('A-private-reading')
 expect(restored.activityEvents.some(event=>event.eventType==='A-private-event')).toBe(true)
 expect(JSON.stringify(restored)).not.toContain('B-private-bookmark')
 expect(JSON.parse(getPersonalStorageForOwner('audit-account-a').getItem('naamras-cloud-sync-export-metadata')!)['saved-item:bookmark:G:1:shabad:ang']).toEqual(JSON.parse(metadata!)['saved-item:bookmark:G:1:shabad:ang'])
 m.listener!('SIGNED_IN', account('audit-account-b'))
 expect(useBookmarksStore.getState().bookmarks.map(row=>row.title)).toEqual(['B-private-bookmark'])
})

test('bad ownership marker fails closed and removes outgoing owner from memory', async () => {
 await initialize()
 useBookmarksStore.getState().addBookmark({ type:'bani', source:'G', ang:1, title:'A-private-bookmark' })
 localStorage.setItem('naamras-owner-v1:audit-account-b:owner', '{"version":99}')
 m.listener!('SIGNED_IN', account('audit-account-b'))
 expect(useBookmarksStore.getState().bookmarks).toEqual([])
 await expect(syncNow()).resolves.toMatchObject({ skipped:true })
 expect(m.invoke).not.toHaveBeenCalled()
 expect(useCloudSyncStore.getState().lastError).toBe('personal-data-owner-recovery-required')
 expect(getPersonalStorageForOwner('audit-account-a').getItem('sikh-bookmarks')).toContain('A-private-bookmark')
})

test('a stale A response never modifies B or acknowledges its event queue', async () => {
 await initialize()
 let finish!: (value: unknown) => void
 m.invoke.mockImplementationOnce(() => new Promise(resolve => { finish=resolve }))
 const pending=syncNow()
 expect(m.invoke.mock.calls.at(-1)![1].headers.Authorization).toBe('Bearer synthetic-token-a')
 m.listener!('SIGNED_IN', account('audit-account-b'))
 useActivityEventsStore.getState().appendEvent('B-retained-event')
 const before=getPersonalStorage().getItem('naamras-cloud-activity-events')
 finish({ error:null, data:{ version:3, complete:true, acknowledgedEventIds:[], mergedAt:new Date().toISOString(), snapshot:{...exportLocalSnapshot(),generatedAt:new Date().toISOString()} } })
 await expect(pending).resolves.toMatchObject({skipped:true})
 expect(getPersonalStorage().getItem('naamras-cloud-activity-events')).toBe(before)
})

test('guest/legacy import requires choice, keeps original, and cannot retarget a second account', async () => {
 await initialize()
 const local=getPersonalStorageForOwner('local')
 local.setItem('sikh-bookmarks', JSON.stringify([{ id:'legacy-bookmark',type:'bani',source:'G',ang:1,title:'Legacy retained',savedAt:'2026-11-16T12:00:00.000Z' }]))
 Object.defineProperty(navigator, 'locks', { configurable:true, value:{ request: async (_name: string, callback: () => unknown) => callback() } })
 expect(useBookmarksStore.getState().bookmarks).toEqual([])
 await expect(resolveLocalDataMigration(true)).resolves.toMatchObject({ok:true})
 expect(useBookmarksStore.getState().bookmarks.map(row=>row.title)).toContain('Legacy retained')
 expect(local.getItem('sikh-bookmarks')).toContain('Legacy retained')
 await expect(resolveLocalDataMigration(true)).resolves.toMatchObject({ok:true})
 expect(useBookmarksStore.getState().bookmarks.filter(row=>row.title==='Legacy retained')).toHaveLength(1)
 m.listener!('SIGNED_IN', account('audit-account-b'))
 await resolveLocalDataMigration(true)
 expect(useBookmarksStore.getState().bookmarks).toEqual([])
})

test('unreadable incoming data cannot synthesize deletions or upload a default snapshot', async () => {
 await initialize()
 useBookmarksStore.getState().addBookmark({ type:'bani', source:'G', ang:1, title:'A-private-bookmark' })
 getPersonalStorageForOwner('audit-account-b').setItem('sikh-bookmarks','{bad-json')
 const invalidPreference = JSON.stringify({version:0,state:{mode:'not-a-theme',dark:false}})
 getPersonalStorageForOwner('audit-account-b').setItem('sikh-theme',invalidPreference)
 m.listener!('SIGNED_IN', account('audit-account-b'))
 expect(useBookmarksStore.getState().bookmarks).toEqual([])
 await expect(syncNow()).resolves.toMatchObject({skipped:true})
 expect(m.invoke).not.toHaveBeenCalled()
 expect(useCloudSyncStore.getState().lastError).toBe('personal-data-owner-recovery-required')
 expect(getPersonalStorageForOwner('audit-account-b').getItem('sikh-bookmarks')).toBe('{bad-json')
 expect(getPersonalStorageForOwner('audit-account-b').getItem('sikh-theme')).toBe(invalidPreference)
})

test('fresh owner has no base revisions or tombstones that can replace existing server records', async () => {
 await initialize()
 useBookmarksStore.getState().addBookmark({ type:'bani', source:'G', ang:1, title:'A-private-bookmark' })
 exportLocalSnapshot()
 m.listener!('SIGNED_IN', account('audit-account-b'))
 const fresh = exportLocalSnapshot()
 expect(fresh.savedItems).toEqual([])
 expect(fresh.vocabEntries).toEqual([])
 expect(fresh.profile.baseUpdatedAt).toBeNull()
 expect(fresh.learningProgress.every(record=>record.baseUpdatedAt===null && record.deletedAt===null)).toBe(true)
})

test('quota failure preserves A pending bookmark while B is isolated', async () => {
 await initialize()
 const write=vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw new DOMException('Full','QuotaExceededError')})
 const result=useBookmarksStore.getState().addBookmark({type:'bani',source:'G',ang:1,title:'A-session-only'})
 expect(result.persisted).toBe(false)
 write.mockRestore()
 m.listener!('SIGNED_IN',account('audit-account-b'))
 expect(useBookmarksStore.getState().bookmarks).toEqual([])
 m.listener!('SIGNED_IN',account('audit-account-a'))
 expect(useBookmarksStore.getState().bookmarks.map(row=>row.title)).toContain('A-session-only')
})

test('reload signed out never reads retained account data; returning A restores it', async () => {
 await initialize()
 useBookmarksStore.getState().addBookmark({type:'bani',source:'G',ang:1,title:'A-durable'})
 await signOutOfCloud()
 resetCloudSyncRuntimeForTests()
 expect(getPersonalStorage().getItem('sikh-bookmarks') ?? '').not.toContain('A-durable')
 await bootstrapCloudSync()
 expect(useBookmarksStore.getState().bookmarks.map(row=>row.title)).toContain('A-durable')
})

test('same-owner storage event updates the collection but foreign-owner event cannot', async () => {
 await initialize()
 const a=getPersonalStorageForOwner('audit-account-a'), b=getPersonalStorageForOwner('audit-account-b')
 const row={id:'tab-a',type:'bani',source:'G',ang:1,title:'A-other-tab',savedAt:'2026-11-16T12:00:00.000Z'}
 a.setItem('sikh-bookmarks',JSON.stringify([row]))
 const event=new Event('storage')
 Object.defineProperties(event,{key:{value:'naamras-owner-v1:audit-account-a:sikh-bookmarks'},storageArea:{value:localStorage}})
 window.dispatchEvent(event)
 expect(useBookmarksStore.getState().bookmarks.map(item=>item.title)).toContain('A-other-tab')
 b.setItem('sikh-bookmarks',JSON.stringify([{...row,title:'B-other-tab'}]))
 const foreign=new Event('storage')
 Object.defineProperties(foreign,{key:{value:'naamras-owner-v1:audit-account-b:sikh-bookmarks'},storageArea:{value:localStorage}})
 window.dispatchEvent(foreign)
 expect(useBookmarksStore.getState().bookmarks.map(item=>item.title)).not.toContain('B-other-tab')
})

test('metadata quota failure prevents outbound writes and retains personal records', async () => {
 await initialize()
 useBookmarksStore.getState().addBookmark({type:'bani',source:'G',ang:1,title:'A-metadata-retry'})
 const original=localStorage.setItem.bind(localStorage)
 const failure=vi.spyOn(localStorage,'setItem').mockImplementation((key,value)=>{
   if(key.endsWith('naamras-cloud-sync-export-metadata')) throw new DOMException('Full','QuotaExceededError')
   original(key,value)
 })
 await expect(syncNow()).resolves.toMatchObject({ok:false})
 expect(m.invoke).not.toHaveBeenCalled()
 expect(useBookmarksStore.getState().bookmarks.map(row=>row.title)).toContain('A-metadata-retry')
 failure.mockRestore()
 await expect(syncNow()).resolves.toMatchObject({ok:true})
})


test('same-owner pending conflict retains both versions and blocks outbound sync', async () => {
 await initialize()
 const { useLanguageStore } = await import('../store/language')
 useLanguageStore.getState().setFontSize(24)
 const rawKey='naamras-owner-v1:audit-account-a:sikh-language'
 const before=localStorage.getItem(rawKey)!
 const failure=vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw new DOMException('Full','QuotaExceededError')})
 expect(()=>useLanguageStore.getState().setFontSize(34)).toThrow()
 failure.mockRestore()
 m.listener!('SIGNED_IN',account('audit-account-b'))
 m.listener!('SIGNED_IN',account('audit-account-a'))
 expect(useLanguageStore.getState().fontSize).toBe(34)
 const changed=JSON.parse(before);changed.state.fontSize=20
 localStorage.setItem(rawKey,JSON.stringify(changed))
 window.dispatchEvent(new StorageEvent('storage',{key:rawKey,oldValue:before,newValue:JSON.stringify(changed)}))
 expect(useLanguageStore.getState().fontSize).toBe(34)
 expect(JSON.parse(localStorage.getItem(rawKey)!).state.fontSize).toBe(20)
 await expect(syncNow()).resolves.toMatchObject({skipped:true})
 expect(m.invoke).not.toHaveBeenCalled()
 expect(useCloudSyncStore.getState().lastError).toBe('personal-data-restore-recovery-required')
})

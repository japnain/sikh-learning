#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { installDeterministicFixtures, resolveBrowserExecutable } from './browser-fixtures.mjs'
// Real browser storage events, mounted UI and Web Locks; synthetic owner changes
// deliberately bypass Auth. This is not evidence of live backend ownership.
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4328'
const output = path.resolve(process.env.QA_OUTPUT_DIR || 'tmp/account-owner-acceptance')
const browser = await chromium.launch({ executablePath: resolveBrowserExecutable(), headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
await installDeterministicFixtures(context, base)
const results = [], errors = []
try {
  await context.addInitScript(() => {
    sessionStorage.setItem('splash-shown','1')
    if (!localStorage.getItem('sikh-onboarding')) localStorage.setItem('sikh-onboarding',JSON.stringify({version:0,state:{hasCompletedOnboarding:true,isOnboardingOpen:false}}))
  })
  const page = await context.newPage(), other = await context.newPage()
  for (const tab of [page, other]) {
    tab.on('pageerror', error=>errors.push(error.message))
    await tab.goto(new URL('/saved',base).href)
    await tab.evaluate(async () => {
      globalThis.ownerModule=await import('/src/utils/ownerStorage.ts')
      globalThis.bookmarkModule=await import('/src/store/bookmarks.ts')
      globalThis.cloudModule=await import('/src/store/cloudSync.ts')
      globalThis.ownerSelect=id=>{
        globalThis.ownerModule.selectPersonalStorageOwner(id)
        globalThis.cloudModule.useCloudSyncStore.getState().setCurrentUser(id==='local'?null:{id,email:'synthetic@example.invalid',name:null,providers:[]})
      }
    })
  }
  const titles = tab => tab.evaluate(()=>globalThis.bookmarkModule.useBookmarksStore.getState().bookmarks.map(row=>row.title))
  await page.evaluate(()=>{
    globalThis.ownerSelect('synthetic-a')
    globalThis.bookmarkModule.useBookmarksStore.getState().addBookmark({type:'bani',source:'G',ang:1,title:'Synthetic A reading'})
  })
  assert.deepEqual(await titles(page),['Synthetic A reading'])
  await other.evaluate(()=>globalThis.ownerSelect('synthetic-a'))
  assert.deepEqual(await titles(other),['Synthetic A reading'])
  await other.evaluate(()=>globalThis.bookmarkModule.useBookmarksStore.getState().addBookmark({type:'bani',source:'G',ang:2,title:'Same owner second tab'}))
  await page.waitForFunction(()=>globalThis.bookmarkModule.useBookmarksStore.getState().bookmarks.length===2)
  results.push('same-owner real storage event reaches other tab')
  await page.evaluate(()=>globalThis.ownerSelect('local'))
  assert.deepEqual(await titles(page),[])
  await page.evaluate(()=>globalThis.ownerSelect('synthetic-b'))
  assert.deepEqual(await titles(page),[])
  await page.evaluate(()=>globalThis.bookmarkModule.useBookmarksStore.getState().addBookmark({type:'bani',source:'G',ang:3,title:'Synthetic B reading'}))
  assert.deepEqual(await titles(other),['Synthetic A reading','Same owner second tab'])
  await page.evaluate(()=>globalThis.ownerSelect('synthetic-a'))
  assert.deepEqual(await titles(page),['Synthetic A reading','Same owner second tab'])
  results.push('A → guest → B → A preserves separate mounted collections')
  await page.reload()
  assert.equal(await page.evaluate(async()=> (await import('/src/store/bookmarks.ts')).useBookmarksStore.getState().bookmarks.length),0)
  await page.evaluate(async()=>{
    globalThis.ownerModule=await import('/src/utils/ownerStorage.ts'); globalThis.bookmarkModule=await import('/src/store/bookmarks.ts')
    globalThis.ownerModule.selectPersonalStorageOwner('synthetic-b')
  })
  assert.deepEqual(await titles(page),['Synthetic B reading'])
  results.push('signed-out reload hides accounts; selecting B restores retained B')
  // Real Web Lock serializes simultaneous explicit import in same account tabs.
  await page.evaluate(async()=>{
    const source=globalThis.ownerModule.getPersonalStorageForOwner('local')
    source.setItem('sikh-bookmarks',JSON.stringify([{id:'legacy-fixture',type:'bani',source:'G',ang:4,title:'Local import fixture',savedAt:'2026-11-16T12:00:00.000Z'}]))
    globalThis.migrationModule=await import('/src/supabase/localDataMigration.ts')
  })
  await other.evaluate(async()=>{globalThis.ownerSelect('synthetic-b');globalThis.migrationModule=await import('/src/supabase/localDataMigration.ts')})
  const imported=await Promise.all([page.evaluate(()=>globalThis.migrationModule.importLocalDataIntoCurrentAccount()),other.evaluate(()=>globalThis.migrationModule.importLocalDataIntoCurrentAccount())])
  assert.equal(imported.filter(Boolean).length,1)
  assert.equal((await titles(page)).filter(title=>title==='Local import fixture').length,1)
  assert.match(await page.evaluate(()=>localStorage.getItem('sikh-bookmarks')),/Local import fixture/)
  await other.evaluate(()=>globalThis.ownerSelect('synthetic-c'))
  assert.equal(await other.evaluate(()=>globalThis.migrationModule.importLocalDataIntoCurrentAccount()),false)
  assert.deepEqual(await titles(other),[])
  results.push('simultaneous explicit import is idempotent, retains source and cannot retarget C')
  assert.deepEqual(errors,[])
  await fs.mkdir(output,{recursive:true})
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({passed:results,errors,method:'Chromium/dev module owner fixture; no live Auth or backend writes'},null,2))
  console.log(JSON.stringify({passed:results.length,results,errors}))
} finally { await context.close(); await browser.close() }

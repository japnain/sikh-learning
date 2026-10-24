import assert from 'node:assert/strict'
import test from 'node:test'
import { deterministicProviderResponse, installDeterministicFixtures } from './browser-fixtures.mjs'

test('production, dev proxy and hosted proxy use the same BaniDB fixtures', () => {
  const production = deterministicProviderResponse('https://api.banidb.com/v2/shabads/544')
  const dev = deterministicProviderResponse('http://127.0.0.1:4187/__banidb/v2/shabads/544')
  const proxy = deterministicProviderResponse('https://qa.supabase.co/functions/v1/banidb-proxy', JSON.stringify({path:'/v2/shabads/544'}))
  assert.equal(production.status, 200)
  assert.deepEqual(dev, production)
  assert.deepEqual(proxy, production)
  assert.equal(production.data.verses[0].verseId, 7718)
  assert.equal(deterministicProviderResponse('https://api.banidb.com/v2/no-fixture').status, 404)
})

test('daily Hukamnama and dictionary fixtures are stable and known', () => {
  const latest = deterministicProviderResponse('https://api.banidb.com/v2/hukamnamas')
  assert.deepEqual(latest.data.date.gregorian, {year:2026,month:4,date:5})
  const dictionary = deterministicProviderResponse('https://backend.searchgurbani.com/api/res/mahan-kosh/view?keyword=%E0%A9%B4')
  assert.equal(dictionary.data.lines[0].description, 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ.')
})

test('hosted-proxy preflight is local and deep-reader content has stable unique keys', () => {
  assert.deepEqual(deterministicProviderResponse('https://qa.supabase.co/functions/v1/banidb-proxy', null, 'OPTIONS'), { status: 204, data: null })
  const response = deterministicProviderResponse('https://api.banidb.com/v2/hukamnamas', null, 'GET', { longHukamnama: true })
  const verses = response.data.shabads[0].verses
  assert.equal(verses.length, 18)
  assert.equal(new Set(verses.map(verse => verse.verseId)).size, 18)
  assert.equal(deterministicProviderResponse('https://api.banidb.com/v2/hukamnamas').data.shabads[0].verses.length, 1)
})

test('browser routes fulfill providers, pass only app-origin assets, and fail closed for other external requests', async () => {
  let handler
  const context = { addInitScript: async () => {}, route: async (_pattern, callback) => { handler = callback } }
  const fixtures = await installDeterministicFixtures(context, 'http://127.0.0.1:4187')
  const makeRoute = url => {
    const actions = []
    return {actions, request:()=>({url:()=>url,method:()=> 'GET',postData:()=>null}),fulfill:async value=>actions.push(['fulfill',value.status]),continue:async()=>actions.push(['continue']),abort:async code=>actions.push(['abort',code])}
  }
  const api = makeRoute('https://api.banidb.com/v2/banis/2')
  await handler(api)
  assert.deepEqual(api.actions, [['fulfill',200]])
  assert.equal(fixtures.providerRequests, 1)
  const asset = makeRoute('http://127.0.0.1:4187/assets/app.js')
  await handler(asset)
  assert.deepEqual(asset.actions, [['continue']])
  fixtures.assertNoUnexpectedRequests()
  const external = makeRoute('https://unmocked.example/scripture')
  await handler(external)
  assert.deepEqual(external.actions, [['abort','blockedbyclient']])
  assert.throws(()=>fixtures.assertNoUnexpectedRequests(), /unmocked external request/)
})

import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { resolveBrowserExecutable } from './browser-fixtures.mjs'

// Exercises production reader components in Chromium, with synthetic book data
// and a local persistence adapter. This does not certify authentication or RLS.
// Run against an existing Vite dev server: QA_PRIVATE_BASE_URL=... node this-file.
const baseUrl = process.env.QA_PRIVATE_BASE_URL || 'http://127.0.0.1:4319'
const root = process.cwd()
const fixture = path.join(root, 'artifacts/private-reader-fixture')
const output = path.resolve(process.env.QA_PRIVATE_OUTPUT || 'artifacts/private-reader-acceptance')
await fs.mkdir(fixture, { recursive: true })
await fs.mkdir(output, { recursive: true })
await fs.writeFile(path.join(fixture, 'index.html'), '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>')
await fs.writeFile(path.join(fixture, 'entry.tsx'), `import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateBookReader from '/src/pages/books/PrivateBookReader';
import '/src/index.css';
import '/src/styles/tokens.css';
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/books/private/synthetic/read']}><Routes><Route path="/books/private/:bookId/read" element={<PrivateBookReader />} /></Routes></MemoryRouter>);`)

const book = {
  id: 'synthetic', title: 'Synthetic Reader Verification', authors: ['QA fixture'],
  description: 'Original synthetic text used only for browser verification.', category: 'Test',
  language: 'en', formats: ['epub'], editionVersion: 'fixture-v1', renderer: 'chapters',
  contents: ['Opening', 'Middle', 'Closing'].map((title, index) => ({ id: `section-${index}`, title, assetId: `chapter-${index}` })),
}
const chapters = Object.fromEntries(book.contents.map((entry, index) => [entry.assetId, {
  id: entry.id, title: entry.title, blocks: [
    { id: `heading-${index}`, type: 'heading', text: `${entry.title} fixture` },
    ...Array.from({ length: 24 }, (_, row) => ({ id: `paragraph-${index}-${row}`, type: 'paragraph', text: `Passage ${row + 1}. This original test paragraph checks that the same meaningful reading position survives layout changes. It includes enough words to wrap across several lines on a narrow screen. No sacred text or private book is used in this fixture.` })),
  ],
}]))
const limits = (await fs.readFile(path.join(root, 'src/data/privateLibrary.ts'), 'utf8')).match(/^export const PRIVATE_[A-Z_]+ = [\d *]+$/gm)
assert.equal(limits?.length, 4, 'Fixture retains the production annotation limits')
const dataModule = `${limits.join('\n')}
const book=${JSON.stringify(book)}; const chapters=${JSON.stringify(chapters)};
export const getPrivateLibraryAccess=()=>({allowed:true,loading:false,epoch:1,error:null});
export const loadPrivateBook=async()=>book;
export const loadPrivateReadingState=async()=>JSON.parse(localStorage.getItem('qa-private-reading-state')||'null');
export const savePrivateReadingState=async(_book,_edition,state)=>{localStorage.setItem('qa-private-reading-state',JSON.stringify(state));return state};
export const registerPrivateReadingSnapshot=()=>()=>{};
export const fetchPrivateAsset=async(_book,asset)=>new Blob([JSON.stringify(chapters[asset])],{type:'application/json'});
export const createPrivateObjectUrl=blob=>URL.createObjectURL(blob);
export const revokePrivateObjectUrl=url=>URL.revokeObjectURL(url);
export const fetchPrivateAssetRange=async()=>{throw new Error('No PDF in text fixture')};
export const getPrivateAssetInfo=async()=>{throw new Error('No PDF in text fixture')};`

const browser = await chromium.launch({ executablePath: resolveBrowserExecutable(), headless: true })
const results = []
let failurePage
let failureDiagnostics
try {
  for (const configuration of [{ width: 320, height: 568, text: 100 }, { width: 390, height: 844, text: 200 }, { width: 844, height: 390, text: 100 }]) {
    const context = await browser.newContext({ viewport: { width: configuration.width, height: configuration.height }, serviceWorkers: 'block', reducedMotion: 'reduce' })
    const errors = []
    const externalRequests = []
    await context.addInitScript(() => {
      if (!localStorage.getItem('sikh-epub-reader-preferences')) localStorage.setItem('sikh-epub-reader-preferences', JSON.stringify({ version: 2, state: { fontScale: 1, lineHeight: 'comfortable', measure: 'standard', palette: 'paper', fontFamily: 'literary', paragraphSpacing: 'comfortable', readingMode: 'scroll', pageTurn: 'fade' } }))
    })
    await context.addInitScript(percent => {
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = `${percent}%` }, { once: true })
    }, configuration.text)
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin !== new URL(baseUrl).origin) { externalRequests.push(url.origin); return route.abort() }
      if (url.pathname === '/src/data/privateLibrary.ts') return route.fulfill({ contentType: 'text/javascript', body: dataModule })
      if (url.pathname === '/src/hooks/usePrivateLibraryAccess.ts') return route.fulfill({ contentType: 'text/javascript', body: 'export function usePrivateLibraryAccess(){return {allowed:true,loading:false,error:null,epoch:1,recheck(){}}}' })
      return route.continue()
    })
    const page = await context.newPage()
    failurePage = page
    failureDiagnostics = { configuration, errors, externalRequests, consoleErrors: [] }
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') failureDiagnostics.consoleErrors.push(message.text()) })
    const reveal = async () => { const button = page.getByRole('button', { name: 'Show reading controls' }); if (await button.count()) await button.click() }
    const tool = async name => { await reveal(); await page.getByRole('button', { name: 'Reading options', exact: true }).click(); await page.getByRole('button', { name, exact: true }).click() }
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('qa-private-reading-state') || 'null'))
    await page.goto(`${baseUrl}/artifacts/private-reader-fixture/index.html`)
    await page.getByRole('heading', { name: 'Opening fixture', exact: true }).waitFor()
    await page.evaluate(percent => { document.documentElement.style.fontSize = `${percent}%` }, configuration.text)
    assert.equal(await page.getByRole('slider', { name: 'Reading position' }).getAttribute('aria-valuetext'), 'Section 1 of 3, Opening')
    await page.getByRole('button', { name: 'Next section' }).click()
    await page.getByRole('heading', { name: 'Middle fixture', exact: true }).waitFor()
    assert.equal(await page.getByRole('slider', { name: 'Reading position' }).getAttribute('aria-valuetext'), 'Section 2 of 3, Middle')
    await page.getByRole('button', { name: 'Previous section' }).click()
    await page.getByRole('heading', { name: 'Opening fixture', exact: true }).waitFor()
    await page.locator('[data-source-id="paragraph-0-5"]').evaluate(element => element.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(1000)
    const before = await saved()
    assert(before?.blockId, 'Scrolling stores a semantic source block')
    await tool('Reading appearance')
    await page.getByRole('button', { name: 'Close reading panel' }).click()
    await page.waitForTimeout(1000)
    assert.equal((await saved()).blockId, before.blockId, 'Closing appearance without a change preserves the source block')
    await tool('Reading appearance')
    await page.getByRole('combobox', { name: 'Reading mode', exact: true }).selectOption('paged')
    await page.getByRole('button', { name: 'Close reading panel' }).click()
    await page.waitForTimeout(1000)
    assert.match(await page.getByRole('slider', { name: 'Reading position' }).getAttribute('aria-valuetext'), /^Page \d+ of \d+, Opening$/)
    assert.equal((await saved()).blockId, before.blockId, 'Scroll-to-pages preserves the source block')
    const pageBefore = Number(await page.locator('.private-reader-book-viewport').getAttribute('data-reader-page'))
    await reveal()
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
    assert.equal(Number(await page.locator('.private-reader-book-viewport').getAttribute('data-reader-page')), pageBefore + 1)
    await tool('Reading appearance')
    await page.getByRole('combobox', { name: 'Reading mode', exact: true }).selectOption('scroll')
    await page.getByRole('button', { name: 'Close reading panel' }).click()
    await page.waitForTimeout(1000)
    await page.locator('[data-source-id="paragraph-0-5"] [data-source-text]').evaluate(element => {
      element.scrollIntoView({ block: 'center' })
      const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode()
      const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 10)
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range)
      document.dispatchEvent(new Event('selectionchange'))
    })
    await page.getByRole('button', { name: 'Highlight blue' }).click()
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('qa-private-reading-state') || '{}').annotations?.length === 1)
    await tool('Highlights & notes')
    await page.getByRole('button', { name: /^Edit note:/ }).click()
    await page.getByRole('textbox', { name: 'Your note' }).fill('Synthetic retained note.')
    await page.getByRole('button', { name: 'Save note', exact: true }).click()
    await page.getByText('Synthetic retained note.', { exact: true }).waitFor()
    await page.keyboard.press('Escape')
    await page.reload()
    await page.getByRole('heading', { name: 'Opening fixture', exact: true }).waitFor()
    await tool('Highlights & notes')
    await page.getByText('Synthetic retained note.', { exact: true }).waitFor()
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('dialog').count(), 0)
    // ModalSheet's cleanup restores focus on the next animation frame.
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Reading options', null, { timeout: 500 })
    assert(await page.getByRole('button', { name: 'Reading options', exact: true }).evaluate(element => element === document.activeElement), 'Escape returns focus to persistent reading-options opener')
    assert.deepEqual(errors, [])
    assert.deepEqual(externalRequests, [])
    await page.screenshot({ path: path.join(output, `reader-${configuration.width}-${configuration.text}.png`), fullPage: false })
    results.push({ ...configuration, checks: ['section-navigation', 'sheet-position-preservation', 'scroll-paged-semantic-resume', 'page-turn', 'highlight', 'note', 'reload-persistence', 'escape-focus'], status: 'passed' })
    await context.close()
  }
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ method: 'Chromium production components; synthetic book/local persistence; no backend', results }, null, 2))
  console.log(JSON.stringify({ configurations: results.length, status: 'passed', output }))
} catch (error) {
  if (failurePage && !failurePage.isClosed()) {
    await failurePage.screenshot({ path: path.join(output, 'failure.png'), fullPage: false }).catch(() => {})
    await fs.writeFile(path.join(output, 'failure.html'), await failurePage.content()).catch(() => {})
    failureDiagnostics.body = await failurePage.locator('body').innerText().catch(() => '')
    failureDiagnostics.activeElement = await failurePage.evaluate(() => document.activeElement?.outerHTML).catch(() => '')
  }
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ ...failureDiagnostics, error: String(error) }, null, 2))
  console.error(JSON.stringify(failureDiagnostics))
  throw error
} finally {
  await browser.close()
  await fs.rm(fixture, { recursive: true, force: true })
}

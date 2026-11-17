#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { installDeterministicFixtures, resolveBrowserExecutable } from './browser-fixtures.mjs'

// Uses a disposable guest context and real download/upload controls. No accounts
// or existing browser profiles are touched. Works against dev or built preview.
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4328'
const output = path.resolve(process.env.QA_OUTPUT_DIR || 'tmp/reader-backup-acceptance')
const key = 'sikh-epub-reader-preferences'
const appearance = { fontScale: 1.7, lineHeight: 'spacious', measure: 'wide', palette: 'sepia', fontFamily: 'sans', paragraphSpacing: 'compact', readingMode: 'scroll', pageTurn: 'fade' }
const defaults = { fontScale: 1, lineHeight: 'comfortable', measure: 'standard', palette: 'app', fontFamily: 'literary', paragraphSpacing: 'comfortable', readingMode: 'paged', pageTurn: 'curl' }
const readerPath = '/library/panth-prakash-english/chapters/episode-001'
const browser = await chromium.launch({ executablePath: resolveBrowserExecutable(), headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce', acceptDownloads: true })
const fixture = await installDeterministicFixtures(context, base)
const errors = []
try {
  await context.addInitScript(({ key, appearance }) => {
    sessionStorage.setItem('splash-shown', '1')
    if (sessionStorage.getItem('reader-backup-fixture')) return
    sessionStorage.setItem('reader-backup-fixture', '1')
    localStorage.setItem('sikh-onboarding', JSON.stringify({ version: 0, state: { hasCompletedOnboarding: true, isOnboardingOpen: false } }))
    localStorage.setItem('sikh-ui-locale', JSON.stringify({ version: 0, state: { locale: 'en' } }))
    localStorage.setItem(key, JSON.stringify({ version: 2, state: appearance }))
  }, { key, appearance })
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)
  page.on('pageerror', error => errors.push(error.message))
  const openBackup = async () => {
    await page.goto(new URL('/more', base).href)
    await page.getByTestId('more-open-backup').click()
    await page.getByTestId('personal-data-panel').waitFor()
  }
  const renderedAppearance = async () => {
    await page.goto(new URL(readerPath, base).href)
    const reader = page.getByTestId('panth-chapter-reader')
    await reader.waitFor()
    return reader.evaluate(element => ({
      palette: element.dataset.palette,
      lineHeight: element.dataset.lineHeight,
      measure: element.dataset.measure,
      fontScale: element.style.getPropertyValue('--epub-font-scale'),
      computedFontSize: getComputedStyle(element.querySelector('.epub-reading-body')).fontSize,
    }))
  }
  const before = await renderedAppearance()
  await openBackup()
  const pendingDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup', exact: true }).click()
  const download = await pendingDownload
  const json = await fs.readFile(await download.path(), 'utf8')
  assert.deepEqual(JSON.parse(json).data[key], { version: 2, state: appearance })
  await page.evaluate(({ key, defaults }) => localStorage.setItem(key, JSON.stringify({ version: 2, state: defaults })), { key, defaults })
  await page.reload()
  await page.getByTestId('more-open-backup').click()
  await page.getByLabel('Restore from a file', { exact: true }).setInputFiles({ name: 'synthetic-reader-backup.json', mimeType: 'application/json', buffer: Buffer.from(json) })
  await page.getByRole('radio', { name: /Replace this device/ }).check()
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click()
  await page.getByText('Your backup has been restored.', { exact: true }).waitFor()
  await page.reload()
  const restored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  assert.deepEqual(restored, { version: 2, state: appearance })
  const after = await renderedAppearance()
  assert.deepEqual(after, before, 'public reader must render the same shared four-field appearance after restore and refresh')
  await openBackup()
  const pendingReexport = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup', exact: true }).click()
  const reexport = await pendingReexport
  assert.deepEqual(JSON.parse(await fs.readFile(await reexport.path(), 'utf8')).data[key], { version: 2, state: appearance })
  fixture.assertNoUnexpectedRequests()
  assert.deepEqual(errors, [])
  const report = { passed: true, viewport: { width: 390, height: 844 }, persistedFields: Object.keys(appearance), before, after, errors,
    method: 'Disposable Chromium guest; real export/upload/replace/refresh/re-export UI; public reader renders its four supported shared fields. Private-only typography/paging fields verified in persisted state, not authenticated private rendering.' }
  await fs.mkdir(output, { recursive: true })
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await context.close()
  await browser.close()
}

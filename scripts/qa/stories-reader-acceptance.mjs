#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { installDeterministicFixtures, resolveBrowserExecutable } from './browser-fixtures.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const storyStateKey = 'naamras-story-state-v1'

/** Runs in the page; checks the story surface and an open sheet without scrolling it. */
export function measureStoryReaderUi() {
  const describe = element => ({
    tag: element.tagName.toLowerCase(),
    name: (element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/gu, ' ').trim().slice(0, 100),
  })
  const box = element => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }
  }
  const hidden = element => Boolean(element.closest('[hidden],[inert],[aria-hidden="true"]'))
    || getComputedStyle(element).display === 'none' || getComputedStyle(element).visibility === 'hidden'
  const viewport = { width: document.documentElement.clientWidth, height: window.visualViewport?.height ?? innerHeight }
  const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
  const issues = []
  const warnings = []
  const controls = []
  if (documentWidth > viewport.width + 2) issues.push({ kind: 'document-horizontal-overflow', documentWidth, viewportWidth: viewport.width })
  const selectors = [
    '.story-browser :is(button,a,input)', '.story-reader :is(button,a,input)',
    '.story-reader-panel :is(button,a,input)', '[data-page="story-draft-preview"] :is(button,a)',
  ]
  for (const control of document.querySelectorAll(selectors.join(','))) {
    if (!(control instanceof HTMLElement) || hidden(control)) continue
    const bounds = box(control)
    if (!bounds.width || !bounds.height) continue
    const identity = describe(control)
    controls.push({ ...identity, ...bounds })
    if (bounds.width < 43.9 || bounds.height < 43.9) warnings.push({ kind: 'small-target-review-spacing', control: identity, ...bounds })
    let canScrollVertically = false
    for (let ancestor = control.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor)
      const ancestorBounds = box(ancestor)
      if (!ancestorBounds.width || !ancestorBounds.height) continue
      if (['auto', 'scroll'].includes(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 2) canScrollVertically = true
      if (['hidden', 'clip'].includes(style.overflowX)
        && (bounds.x < ancestorBounds.x - 2 || bounds.right > ancestorBounds.right + 2)) {
        issues.push({ kind: 'control-clipped-horizontally', control: identity, ancestor: describe(ancestor), bounds, ancestorBounds })
        break
      }
      if (!canScrollVertically && ['hidden', 'clip'].includes(style.overflowY)
        && (bounds.y < ancestorBounds.y - 2 || bounds.bottom > ancestorBounds.bottom + 2)) {
        issues.push({ kind: 'control-clipped-vertically', control: identity, ancestor: describe(ancestor), bounds, ancestorBounds })
        break
      }
    }
  }
  const active = document.activeElement
  const focus = active instanceof HTMLElement && active !== document.body
    ? { ...describe(active), id: active.id, hidden: hidden(active), ...box(active) } : null
  if (focus?.hidden) issues.push({ kind: 'focus-hidden-or-inert', focus })
  const sheet = document.querySelector('.story-reader-panel')
  if (sheet instanceof HTMLElement) {
    const bounds = box(sheet)
    if (bounds.x < -2 || bounds.right > viewport.width + 2) issues.push({ kind: 'sheet-outside-horizontal-viewport', ...bounds })
    if (bounds.y < -2 || bounds.bottom > viewport.height + 2) issues.push({ kind: 'sheet-outside-vertical-viewport', ...bounds })
  }
  return { viewport, documentWidth, rootFontPx: Number.parseFloat(getComputedStyle(document.documentElement).fontSize), focus, controls, issues, warnings }
}

function argumentsMap() {
  return new Map(process.argv.slice(2).map(argument => {
    const separator = argument.indexOf('=')
    return separator < 0 ? [argument, 'true'] : [argument.slice(0, separator), argument.slice(separator + 1)]
  }))
}

async function settled(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}

async function applyTextScale(page, scale) {
  await page.addStyleTag({ content: `html { font-size: ${scale * 100}% !important; }` })
  await settled(page)
}

async function persistedStoryState(page) {
  return page.evaluate(key => localStorage.getItem(key), storyStateKey)
}

async function main() {
  const args = argumentsMap()
  if (!args.has('--url')) {
    process.stdout.write('Use --url=http://127.0.0.1:PORT/ [--width=320] [--height=568] [--draft-id=becoming-the-khalsa] [--output=tmp/stories-qa/acceptance.json]. Runs isolated Chromium in light/dark and 100/200% text. Use --published-only for production preview; default also checks development-only drafts. Add --deterministic to intercept external providers.\n')
    return
  }
  const publishedOnly = args.has('--published-only')
  const deterministic = args.has('--deterministic') || process.env.QA_DETERMINISTIC === '1'
  const base = new URL(args.get('--url'))
  const width = Number(args.get('--width') ?? 320)
  const height = Number(args.get('--height') ?? 568)
  assert(Number.isSafeInteger(width) && width >= 240 && Number.isSafeInteger(height) && height >= 240, 'Use a viewport of at least 240 × 240 pixels.')
  const output = path.resolve(args.get('--output') ?? path.join(projectRoot, 'tmp/stories-qa/acceptance.json'))
  const outputDirectory = path.dirname(output)
  fs.mkdirSync(outputDirectory, { recursive: true })
  const draftDirectory = path.join(projectRoot, 'content/stories/drafts')
  const draftCandidates = fs.existsSync(draftDirectory) ? fs.readdirSync(draftDirectory)
    .filter(name => name.endsWith('.json')).map(name => JSON.parse(fs.readFileSync(path.join(draftDirectory, name), 'utf8')))
    .filter(story => story.sections?.length > 1).sort((a, b) => b.wordCount - a.wordCount) : []
  const draft = args.has('--draft-id')
    ? draftCandidates.find(story => story.id === args.get('--draft-id')) : draftCandidates[0]
  if (!publishedOnly) assert(draft, 'A local sectioned pilot draft is required for development-only checks; use --published-only for the production build.')
  const { chromium } = await import('playwright-core')
  const require = createRequire(import.meta.url)
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
  const executablePath = resolveBrowserExecutable()
  const report = { checkedAt: new Date().toISOString(), baseUrl: base.href, deterministic, publishedOnly, draftId: publishedOnly ? null : draft.id, cases: [] }
  let browser
  try {
    browser = await chromium.launch({ executablePath, headless: true })
  } catch (error) {
    report.status = 'blocked'
    report.blockedAt = 'isolated-browser-launch'
    report.error = error instanceof Error ? error.message : String(error)
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ status: report.status, blockedAt: report.blockedAt, output, error: report.error }, null, 2)}\n`)
    process.exitCode = 1
    return
  }
  let failureCount = 0
  try {
    for (const dark of [false, true]) {
      for (const scale of [1, 2]) {
        const failuresBeforeCase = failureCount
        const caseId = `${dark ? 'dark' : 'light'}-${scale * 100}`
        const result = { id: caseId, width, height, theme: dark ? 'dark' : 'light', textScale: scale, checks: [], surfaces: [], pageErrors: [] }
        report.cases.push(result)
        const context = await browser.newContext({ viewport: { width, height }, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce', timezoneId: 'America/Toronto', serviceWorkers: deterministic ? 'block' : 'allow' })
        const fixtures = deterministic ? await installDeterministicFixtures(context, base.href) : null
        await context.addInitScript(({ dark }) => {
          sessionStorage.setItem('splash-shown', '1')
          localStorage.setItem('sikh-onboarding', JSON.stringify({ state: { hasCompletedOnboarding: true, isOnboardingOpen: false, presentationMode: 'overlay' }, version: 0 }))
          localStorage.setItem('sikh-ui-locale', JSON.stringify({ state: { locale: 'en' }, version: 0 }))
          localStorage.setItem('sikh-theme', JSON.stringify({ state: { dark, mode: dark ? 'dark' : 'light' }, version: 0 }))
          localStorage.setItem('naamras-reader-presentation', 'read')
        }, { dark })
        const page = await context.newPage()
        page.on('pageerror', error => result.pageErrors.push(error.message))
        const capture = async name => {
          await settled(page)
          await page.addScriptTag({ content: axeSource })
          const layout = await page.evaluate(measureStoryReaderUi)
          const violations = await page.evaluate(async () => (await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'],
          })).violations.map(rule => ({ id: rule.id, impact: rule.impact, help: rule.help, targets: rule.nodes.map(node => node.target) })))
          const screenshot = path.join(outputDirectory, `${caseId}-${name}.png`)
          await page.screenshot({ path: screenshot })
          result.surfaces.push({ name, layout, violations, screenshot })
          if (layout.issues.length || violations.length || layout.rootFontPx < 15.9 * scale) failureCount += 1
        }
        try {
          await page.goto(new URL('/banis?collection=stories', base).href, { waitUntil: 'domcontentloaded', timeout: 30_000 })
          await page.getByTestId('story-browser').waitFor({ state: 'visible', timeout: 30_000 })
          await applyTextScale(page, scale)
          const catalogResponse = await page.request.get(new URL('/data/stories/catalog.json', base).href)
          assert.equal(catalogResponse.status(), 200)
          const catalog = await catalogResponse.json()
          assert.equal(catalog.stories.length, 8, 'The published starter shelf remains eight; drafts must stay unpublished.')
          assert.equal(await page.locator('.story-card').count(), catalog.stories.length)
          result.checks.push('Published catalog and rendered shelf contain eight readings.')
          await capture('browse')
          if (!dark && scale === 1) {
            await page.getByRole('button', { name: 'Download stories', exact: true }).click()
            await page.getByRole('button', { name: 'Available offline', exact: true }).waitFor({ state: 'visible' })
            result.checks.push('All eight story texts downloaded into durable device storage.')
          }
          await page.locator('.story-card-link[href="/stories/bhai-lalo"]').click()
          await page.locator('[data-page="story-reader"] #story-title').waitFor({ state: 'visible' })
          await applyTextScale(page, scale)
          assert.equal(await page.getByTestId('primary-nav').count(), 0, 'Focused reader should hide primary navigation.')
          await capture('published-reader')
          const accountButton = page.getByRole('button', { name: 'About this account', exact: true })
          await accountButton.click()
          const account = page.getByRole('dialog', { name: 'About this account', exact: true })
          await account.waitFor({ state: 'visible' })
          assert.match(await account.innerText(), /1909/u)
          assert.match(await account.innerText(), /Independent review pending/u)
          assert(await account.locator('.story-source-role').count() > 0, 'Source role should render from migrated metadata.')
          result.checks.push('Source sheet renders edition, source role and honest pending review status.')
          await capture('source-sheet')
          await page.keyboard.press('Escape')
          await account.waitFor({ state: 'hidden' })
          await settled(page)
          assert(await accountButton.evaluate(element => document.activeElement === element), 'Account close should restore opener focus.')

          if (!dark && scale === 1) {
            await page.locator('#p5').evaluate(element => element.scrollIntoView({ block: 'start' }))
            await page.getByRole('button', { name: 'Reading appearance', exact: true }).click()
            await page.getByRole('dialog', { name: 'Reading appearance', exact: true }).waitFor({ state: 'visible' })
            const savedBefore = JSON.parse(await persistedStoryState(page))
            assert(savedBefore.positions['bhai-lalo']?.progress > 0)
            const savedParagraph = savedBefore.positions['bhai-lalo'].paragraphId
            await page.keyboard.press('Escape')
            await page.getByRole('button', { name: 'Save story', exact: true }).click()
            await page.getByRole('button', { name: 'Remove story from Saved', exact: true }).waitFor({ state: 'visible' })
            await page.getByRole('link', { name: /Back to stories/iu }).click()
            await page.getByTestId('story-browser').waitFor({ state: 'visible' })
            await page.locator('.story-card-link[href="/stories/bhai-lalo"]').click()
            await page.locator('[data-page="story-reader"] #story-title').waitFor({ state: 'attached' })
            await settled(page)
            const anchor = await page.locator(`[id="${savedParagraph}"]`).boundingBox()
            assert(anchor && anchor.y < 260 && anchor.y > -40, 'Reopening restores the saved paragraph near the reading line.')
            result.checks.push(`Saved state and paragraph resume survive leaving and reopening (${savedParagraph}).`)
            // Block text transport while retaining the running app shell. This verifies the
            // content-cache fallback, without claiming service-worker installed-app coverage.
            await page.route('**/data/stories/**', route => route.abort('internetdisconnected'))
            await page.reload({ waitUntil: 'domcontentloaded' })
            await page.locator('[data-page="story-reader"] #story-title').waitFor({ state: 'attached', timeout: 30_000 })
            assert.match(await page.locator('#story-title').innerText(), /Lalo/u)
            await page.unroute('**/data/stories/**')
            result.checks.push('Downloaded story renders after reload with all story JSON requests blocked.')
          }

          if (!publishedOnly) {
          await page.goto(new URL(`/stories/drafts/${draft.id}`, base).href, { waitUntil: 'domcontentloaded', timeout: 30_000 })
          await page.locator('[data-page="story-reader"] #story-title').waitFor({ state: 'visible', timeout: 30_000 })
          await applyTextScale(page, scale)
          const stateBeforePreview = await persistedStoryState(page)
          assert.equal(await page.getByRole('button', { name: 'Save story', exact: true }).count(), 0)
          assert.equal(await page.getByRole('button', { name: 'Finish story', exact: true }).count(), 0)
          await capture('pilot-reader')
          await page.getByRole('button', { name: 'Story contents', exact: true }).click()
          const contents = page.getByRole('dialog', { name: 'In this story', exact: true })
          await contents.waitFor({ state: 'visible' })
          await capture('contents-sheet')
          const chosenSection = draft.sections[1]
          await contents.getByRole('button', { name: chosenSection.title, exact: true }).click()
          await contents.waitFor({ state: 'hidden' })
          const target = page.locator(`#story-section-${chosenSection.id}`)
          await page.waitForFunction(id => document.activeElement?.id === id, `story-section-${chosenSection.id}`)
          const targetBox = await target.boundingBox()
          assert(targetBox && targetBox.y >= 0 && targetBox.y < 260, 'Contents selection should position and focus the chosen section.')
          result.checks.push(`Contents selects and focuses the semantic section heading: ${chosenSection.title}.`)
          const appearanceButton = page.getByRole('button', { name: 'Reading appearance', exact: true })
          await appearanceButton.click()
          const appearance = page.getByRole('dialog', { name: 'Reading appearance', exact: true })
          await appearance.waitFor({ state: 'visible' })
          await appearance.getByRole('button', { name: 'Increase text size', exact: true }).click()
          await capture('appearance-sheet')
          await page.keyboard.press('Escape')
          await appearance.waitFor({ state: 'hidden' })
          await settled(page)
          assert(await appearanceButton.evaluate(element => document.activeElement === element), 'Appearance close should restore opener focus.')
          assert.equal(await persistedStoryState(page), stateBeforePreview, 'Preview reading, section navigation and appearance changes must not alter Saved or reading positions.')
          result.checks.push('Appearance restores focus; pilot preview leaves published Saved/reading position state unchanged.')
          } else {
            await page.getByRole('button', { name: 'Reading appearance', exact: true }).click()
            await page.getByRole('dialog', { name: 'Reading appearance', exact: true }).waitFor({ state: 'visible' })
            await capture('appearance-sheet')
            await page.keyboard.press('Escape')
            result.checks.push('Production-only run: unpublished pilot routes remain excluded; published reading appearance checked.')
          }
          fixtures?.assertNoUnexpectedRequests()
          result.providerRequests = fixtures?.providerRequests
          assert.equal(result.pageErrors.length, 0, 'No unhandled browser exceptions.')
          result.status = failureCount > failuresBeforeCase ? 'failed' : 'passed'
        } catch (error) {
          result.status = 'failed'
          result.error = error instanceof Error ? error.stack : String(error)
          failureCount += 1
          await page.screenshot({ path: path.join(outputDirectory, `${caseId}-failure.png`) }).catch(() => {})
        } finally {
          await context.close()
        }
      }
    }
  } finally {
    await browser.close()
  }
  report.failureCount = failureCount
  report.status = failureCount === 0 ? 'passed' : 'failed'
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify({ status: report.status, failureCount, output, cases: report.cases.map(item => ({ id: item.id, status: item.status, checks: item.checks, error: item.error, surfaces: item.surfaces.map(surface => ({ name: surface.name, issues: surface.layout.issues, violations: surface.violations })) })) }, null, 2)}\n`)
  if (failureCount) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.stack : error}\n`); process.exitCode = 1 })
}

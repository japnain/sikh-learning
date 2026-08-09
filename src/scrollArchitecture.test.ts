import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

const indexCss = fs.readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf8')
const navigationCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/navigation.css'), 'utf8')
const catalogCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/catalog.css'), 'utf8')
const readerCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/reader.css'), 'utf8')
const tokensCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/tokens.css'), 'utf8')
const navBarSource = fs.readFileSync(path.join(process.cwd(), 'src/components/NavBar.tsx'), 'utf8')
const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8')
const appScrollSource = fs.readFileSync(path.join(process.cwd(), 'src/utils/appScroll.ts'), 'utf8')
const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')
const sourceRoot = path.join(process.cwd(), 'src')

function listProductionSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return listProductionSourceFiles(absolutePath)
    if (!/\.(?:ts|tsx)$/.test(entry.name)) return []
    if (/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name) || entry.name === 'test-setup.ts') return []
    return [absolutePath]
  })
}

test('uses the native document as the sole primary vertical scroller', () => {
  expect(indexCss).toMatch(
    /html\s*\{[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior-y:\s*none;/s
  )
  expect(indexCss).toMatch(
    /body,\s*#root\s*\{[^}]*min-height:\s*100vh;[^}]*min-height:\s*100svh;[^}]*overflow-y:\s*visible;/s
  )
  expect(indexCss).toMatch(
    /\.page-shell\s*\{[^}]*min-height:\s*100vh;[^}]*min-height:\s*100svh;[^}]*overflow-y:\s*visible;/s
  )
  expect(indexCss).toMatch(
    /\.app-shell\s*\{[^}]*min-height:\s*100vh;[^}]*min-height:\s*100svh;[^}]*overflow-y:\s*visible;/s
  )
  expect(catalogCss).toMatch(
    /\.epub-reader-shell\s*\{[^}]*min-height:\s*100vh;[^}]*min-height:\s*100svh;/s
  )
  expect(indexCss).not.toContain('.app-scroll-viewport')
  expect(appSource).not.toContain('APP_SCROLL_VIEWPORT_ID')
  expect(appSource).not.toContain('app-scroll-viewport')
  expect(appScrollSource).not.toContain('APP_SCROLL_VIEWPORT_ID')
  expect(appScrollSource).not.toContain('getAppScrollViewport')
  expect(indexCss).not.toContain('-webkit-overflow-scrolling')
})

test('keeps touch-reader chrome document-attached and out of WebKit viewport-layer failure modes', () => {
  expect(indexHtml).toContain(
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />'
  )
  expect(tokensCss).toContain('--fixed-ui-safe-bottom: var(--safe-area-bottom);')
  expect(tokensCss).toMatch(
    /html\[data-ios-standalone-viewport='short'\]\s*\{[^}]*--fixed-ui-safe-bottom:\s*max\(/s
  )
  expect(tokensCss).not.toMatch(
    /html\[data-ios-standalone-viewport='short'\]\s*\{[^}]*--safe-area-bottom:/s
  )
  expect(navigationCss).toMatch(
    /\.app-nav-stack\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*var\(--nav-bottom-offset\);/s
  )
  expect(navigationCss).toMatch(
    /\.app-nav-scrim\s*\{[^}]*height:\s*calc\(var\(--nav-stack-height,\s*4\.25rem\)\s*\+\s*var\(--nav-bottom-offset\)\s*\+\s*2rem\);/s
  )
  expect(navBarSource).not.toContain('app-nav-stack z-50')
  expect(indexCss).toMatch(
    /\.app-shell\s*>\s*\*\s*\{[^}]*position:\s*relative;/s
  )

  expect(catalogCss).toMatch(
    /\.epub-reader-topbar\s*\{[^}]*position:\s*fixed;[^}]*height:\s*var\(--epub-reader-topbar-height\);/s
  )
  expect(catalogCss).toMatch(
    /\.epub-reader-main\s*\{[^}]*padding:\s*calc\(var\(--epub-reader-topbar-height\)\s*\+/s
  )
  expect(catalogCss).not.toMatch(/\.epub-reader-topbar\s*\{[^}]*position:\s*sticky;/s)
  expect(catalogCss).not.toMatch(
    /\.epub-reader-topbar\s*\{[^}]*(?:backface-visibility|contain|filter|perspective|transform|will-change)\s*:/s
  )
  expect(catalogCss).toMatch(
    /@media \(hover:\s*none\) and \(pointer:\s*coarse\)\s*\{\s*\.epub-reader-topbar\s*\{\s*position:\s*absolute;/s
  )

  expect(readerCss).toMatch(
    /\.study-reader-topbar\s*\{[^}]*position:\s*fixed;[^}]*height:\s*var\(--study-reader-topbar-height\);/s
  )
  expect(readerCss).not.toMatch(/\.study-reader-topbar\s*\{[^}]*position:\s*sticky;/s)
  expect(readerCss).not.toMatch(
    /\.study-reader-topbar\s*\{[^}]*(?:backface-visibility|contain|filter|perspective|transform|will-change)\s*:/s
  )
  expect(readerCss).toMatch(
    /@media \(hover:\s*none\) and \(pointer:\s*coarse\)[\s\S]*?\.study-reader-topbar\s*\{[^}]*position:\s*absolute;/s
  )
  expect(readerCss).toMatch(
    /@media \(hover:\s*none\) and \(pointer:\s*coarse\)[\s\S]*?\.study-reader-ang-navigation\s*\{[^}]*position:\s*static;/s
  )
  expect(readerCss).toMatch(
    /@media \(hover:\s*none\) and \(pointer:\s*coarse\)[\s\S]*?\.study-reader-rail\s*\{[^}]*position:\s*static\s*!important;[^}]*max-height:\s*none\s*!important;[^}]*overflow:\s*visible\s*!important;/s
  )
  expect(readerCss).toMatch(
    /@media \(hover:\s*none\) and \(pointer:\s*coarse\)[\s\S]*?\.study-entry-navigator--top\s*\{[^}]*position:\s*static;/s
  )
  expect(readerCss).toMatch(
    /@media \(hover:\s*none\) and \(pointer:\s*coarse\)[\s\S]*?\.read-room-hero\s*\{[^}]*position:\s*static;[^}]*max-height:\s*none;[^}]*overflow-y:\s*visible;/s
  )
  expect(readerCss).toMatch(
    /@media \(hover:\s*none\) and \(pointer:\s*coarse\)[\s\S]*?\.read-collection-tabs,\s*\.read-collection-intro\s*\{[^}]*position:\s*static;/s
  )
})

test('keeps global scroll APIs behind the app-scroll utility', () => {
  const centralUtility = path.join(sourceRoot, 'utils/appScroll.ts')
  const forbiddenGlobalScrollPatterns = [
    /window\.scrollTo\s*\(/,
    /window\.scrollY\b/,
    /(?:window|document)\.addEventListener\(\s*['"]scroll(?:end)?['"]/,
    /\.scrollIntoView\s*\(/,
  ]
  const offenders = listProductionSourceFiles(sourceRoot)
    .filter(filePath => filePath !== centralUtility)
    .filter(filePath => {
      const source = fs.readFileSync(filePath, 'utf8')
      return forbiddenGlobalScrollPatterns.some(pattern => pattern.test(source))
    })
    .map(filePath => path.relative(process.cwd(), filePath))

  expect(offenders).toEqual([])
})

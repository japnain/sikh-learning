import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

const indexCss = fs.readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf8')
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

test('keeps the document root fixed and delegates scrolling to the app viewport', () => {
  expect(indexCss).toMatch(
    /html,\s*body,\s*#root\s*\{[^}]*overflow:\s*hidden;[^}]*overscroll-behavior:\s*none;/s
  )
  expect(indexCss).toMatch(
    /\.app-scroll-viewport\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior-y:\s*none;[^}]*-webkit-overflow-scrolling:\s*touch;/s
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

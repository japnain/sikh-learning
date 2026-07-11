#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import postcss from 'postcss'

const SOURCE_EXTENSIONS = new Set(['.html', '.ts', '.tsx'])
const CUSTOM_CLASS_PATTERN = /(?<!\\)\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      const entryPath = path.join(directory, entry.name)
      return entry.isDirectory() ? walk(entryPath) : [entryPath]
    })
}

function getClassNames(selector) {
  return [...selector.matchAll(CUSTOM_CLASS_PATTERN)].map(match => match[1])
}

const sourceText = walk('src')
  .filter(file => SOURCE_EXTENSIONS.has(path.extname(file)))
  .map(file => fs.readFileSync(file, 'utf8'))
  .join('\n')

const cssFiles = [
  'src/index.css',
  ...walk('src/styles').filter(file => file.endsWith('.css')).sort(),
]

const findings = []

for (const file of cssFiles) {
  const root = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file })

  root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') return

    for (const selector of postcss.list.comma(rule.selector)) {
      const classNames = [...new Set(getClassNames(selector))]
      if (classNames.length === 0) continue
      if (classNames.every(className => sourceText.includes(className))) continue

      findings.push({
        file,
        line: rule.source?.start?.line ?? 1,
        selector: selector.replace(/\s+/g, ' '),
      })
    }
  })
}

if (findings.length > 0) {
  console.error('Custom CSS selector branches with missing source classes:')
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.selector}`)
  }
  process.exitCode = 1
} else {
  console.log(`CSS selector audit passed for ${cssFiles.length} files.`)
}

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

function getDynamicClassNames(source) {
  const classNames = new Set()
  // Resolve simple template modifiers only when the same source explicitly
  // handles the interpolated value, e.g. kind === 'river'. Do not exempt an
  // entire dynamic prefix: a misspelled or removed variant must still fail.
  for (const [, template] of source.matchAll(/\bclassName=\{`([^`]+)`\}/g)) {
    for (const [, prefix, variable] of template.matchAll(/([_a-zA-Z][_a-zA-Z0-9-]*)\$\{([_$a-zA-Z][_$a-zA-Z0-9]*)\}/g)) {
      const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const literalComparison = new RegExp(`\\b${escapedVariable}\\s*===\\s*(['"])([_a-zA-Z0-9-]+)\\1`, 'g')
      for (const [, , value] of source.matchAll(literalComparison)) classNames.add(`${prefix}${value}`)
    }
  }
  return classNames
}

const sources = walk('src')
  .filter(file => SOURCE_EXTENSIONS.has(path.extname(file)))
  .map(file => fs.readFileSync(file, 'utf8'))
const sourceText = sources.join('\n')
const dynamicClassNames = new Set(sources.flatMap(source => [...getDynamicClassNames(source)]))

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
      if (classNames.every(className => sourceText.includes(className) || dynamicClassNames.has(className))) continue

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

#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatFindings, scanText } from './secret-scan.mjs'

// Scan the final publish directory, including copied public files. This is a
// targeted leak-prevention gate, not a complete PII or credential detector.
// Unlike Git, browser output legitimately contains Supabase public API keys.
const consumerEmailDomains = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.ca', 'yahoo.co.uk',
  'yahoo.co.in', 'ymail.com', 'rocketmail.com', 'outlook.com', 'outlook.ca',
  'hotmail.com', 'hotmail.ca', 'hotmail.co.uk', 'live.com', 'live.ca',
  'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'mail.com',
  'proton.me', 'protonmail.com', 'pm.me', 'gmx.com', 'gmx.de', 'gmx.net',
  'tuta.com', 'tutanota.com', 'fastmail.com', 'zoho.com', 'yandex.com',
])
const emailPattern = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?)/gi
const appTextExtension = /\.(?:[cm]?js|html?|css|json|webmanifest)$/i
const appEmailExtension = /\.(?:[cm]?js|html?)$/i

function isAttributionDocument(file) {
  // Preserve published third-party credits. Executable JS/CSS never receives
  // this exception merely because it is placed in a licenses directory.
  if (!/\.(?:txt|md|html?|json)$/i.test(file)) return false
  return /(?:^|\/)(?:licenses?|attributions?|third[-_]party[-_](?:licenses?|notices?))\//i.test(file)
    || /(?:^|\/)(?:LICENSE(?:S)?|COPYING|NOTICE(?:S)?|ATTRIBUTIONS?|THIRD[-_]PARTY[-_](?:LICENSES?|NOTICES?))(?:[.-][^/]*)?$/i.test(file)
}

function homePathInLine(line) {
  const normalized = line
    .replace(/\\(?:u002f|x2f|\/)/gi, '/')
    .replace(/\\(?:u005c|x5c)/gi, '/')
    .replace(/\\+/g, '/')
  return /(?:^|[^A-Za-z0-9_])(?:[A-Za-z]:)?\/(?:Users|home)\/[^/\s"'<>]+(?:\/|(?=[\s"'<>]|$))/i.test(normalized)
    || /(?:^|[^A-Za-z0-9_])\/root\/(?:[^/\s"'<>]+)/.test(normalized)
}

export function scanArtifactText(file, text) {
  const findings = scanText(file, text).filter(finding =>
    !['supabase-publishable-key', 'supabase-legacy-api-key'].includes(finding.kind))

  // The shared repository scanner groups anon and service-role JWTs together;
  // public output allows anon, while a service-role key must still fail.
  for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'))
      if (payload.iss === 'supabase' && payload.role === 'service_role') {
        findings.push({ file, line: text.slice(0, match.index).split('\n').length, kind: 'supabase-service-role-key' })
      }
    } catch { /* Non-JWT text is handled by the shared credential detectors. */ }
  }

  if (appTextExtension.test(file)) {
    const checkEmail = appEmailExtension.test(file) && !isAttributionDocument(file)
    text.split('\n').forEach((line, index) => {
      if (homePathInLine(line)) findings.push({ file, line: index + 1, kind: 'filesystem-home-path' })
      if (/\.(?:[cm]?js|css)$/i.test(file) && /[#@]\s*sourceMappingURL\s*=/.test(line)) {
        findings.push({ file, line: index + 1, kind: 'source-map-reference' })
      }
      if (checkEmail && [...line.matchAll(emailPattern)].some(match => consumerEmailDomains.has(match[1].toLowerCase()))) {
        findings.push({ file, line: index + 1, kind: 'consumer-email-address' })
      }
    })
  }
  return findings
}

function forbiddenFileKind(name) {
  if (name === '.env' || name.startsWith('.env.')) return 'public-environment-file'
  if (['.git', '.gitconfig', '.git-credentials'].includes(name)) return 'public-git-metadata'
  if (/^(?:id_rsa|id_ed25519|id_dsa|id_ecdsa)$|\.(?:key|p12|pfx)$/i.test(name)) return 'public-credential-file'
  if (/\.map$/i.test(name)) return 'public-source-map'
  return null
}

export function scanPublicArtifacts(distDirectory = 'dist') {
  const root = path.resolve(distDirectory)
  if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory()) {
    throw new Error('The publish directory is missing or is not a regular directory. Run the production build first.')
  }
  if (!fs.existsSync(path.join(root, 'index.html'))) {
    throw new Error('The publish directory has no index.html. Refusing to report an incomplete build as clean.')
  }
  const findings = []
  let scanned = 0

  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const file = path.posix.join(prefix, entry.name)
      const absolute = path.join(directory, entry.name)
      const forbiddenKind = forbiddenFileKind(entry.name)
      if (forbiddenKind) findings.push({ file, line: 1, kind: forbiddenKind })
      // Never follow a public symlink outside this tree, or into a cycle.
      if (entry.isSymbolicLink()) {
        findings.push({ file, line: 1, kind: 'public-symbolic-link' })
        continue
      }
      if (entry.isDirectory()) {
        if (!forbiddenKind) visit(absolute, file)
        continue
      }
      if (!entry.isFile()) {
        findings.push({ file, line: 1, kind: 'unexpected-public-file-type' })
        continue
      }
      const data = fs.readFileSync(absolute)
      if (data.includes(0)) continue
      scanned += 1
      findings.push(...scanArtifactText(file, data.toString('utf8')))
    }
  }

  visit(root)
  return { scanned, findings }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = scanPublicArtifacts(process.argv[2] ?? 'dist')
    if (result.findings.length) {
      console.error(`Public artifact privacy check failed:\n${formatFindings(result.findings)}`)
      process.exitCode = 1
    } else {
      console.log(`Public artifact privacy check passed: ${result.scanned} text artifacts; no matching private files, credentials, home paths, or consumer contact addresses.`)
    }
  } catch (error) {
    // Filesystem errors may contain a private absolute path; do not print it.
    console.error(`Public artifact privacy check failed: ${error.code ? 'Could not read the publish directory.' : error.message}`)
    process.exitCode = 1
  }
}

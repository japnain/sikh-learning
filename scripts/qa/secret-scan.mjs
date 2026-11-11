#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// This repository gate deliberately treats publishable keys as configuration
// that belongs outside Git, even though they are safe to expose in a browser.
// It complements provider push protection; a clean scan is not a security guarantee.
const detectors = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
  ['supabase-secret-key', /\bsb_secret_[A-Za-z0-9_-]{15,}/g],
  ['supabase-publishable-key', /\bsb_publishable_[A-Za-z0-9_-]{15,}/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,})/g],
  ['aws-access-id', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['google-api-key', /\bAIza[A-Za-z0-9_-]{30,}/g],
  ['stripe-secret-key', /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/g],
  ['openai-api-key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{35,}/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}/g],
  ['resend-api-key', /\bre_[A-Za-z0-9]{24,}/g],
  ['credential-url', /\b(?:postgres(?:ql)?|mysql|redis|https?):\/\/[^\s:/]+:[^\s@/]{12,}@/gi],
]

export function scanText(file, text) {
  const findings = []
  for (const [kind, pattern] of detectors) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      findings.push({ file, line: text.slice(0, match.index).split('\n').length, kind })
    }
  }
  // Legacy Supabase API keys are JWTs. Decode only to classify them; never
  // print their values, payloads, user claims, or signing material.
  for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'))
      if (payload.iss === 'supabase' && ['anon', 'service_role'].includes(payload.role)) {
        findings.push({ file, line: text.slice(0, match.index).split('\n').length, kind: 'supabase-legacy-api-key' })
      }
    } catch { /* Non-JWT text is handled by the other detectors. */ }
  }
  return findings
}

export function scanTrackedFiles(root) {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
  const findings = []
  let scanned = 0
  for (const file of files) {
    const absolute = path.join(root, file)
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue
    const name = path.basename(file)
    if ((name === '.env' || name.startsWith('.env.')) && name !== '.env.example') {
      findings.push({ file, line: 1, kind: 'tracked-environment-file' })
    }
    if (/^(?:id_rsa|id_ed25519)$|\.(?:key|p12|pfx)$/i.test(name)) {
      findings.push({ file, line: 1, kind: 'tracked-credential-file' })
    }
    const data = fs.readFileSync(absolute)
    if (data.includes(0)) continue
    scanned += 1
    findings.push(...scanText(file, data.toString('utf8')))
  }
  return { scanned, findings }
}

export function formatFindings(findings) {
  return findings.map(({ file, line, kind }) => `${file}:${line}: ${kind} (value redacted)`).join('\n')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const result = scanTrackedFiles(root)
  if (result.findings.length) {
    console.error(`Repository credential scan failed:\n${formatFindings(result.findings)}`)
    process.exitCode = 1
  } else {
    console.log(`Repository credential scan passed: ${result.scanned} tracked text files; no matching credentials or private environment files.`)
  }
}

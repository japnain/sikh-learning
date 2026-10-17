import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { promisify } from 'node:util'
import { prepareEvidenceDirectory } from './qa-utils.mjs'
import { nativeSuites, validateNativeResult } from './native-result.mjs'

const [result, requestedOutput, suite, ...extra] = process.argv.slice(2)
assert.ok(result && requestedOutput && isAbsolute(result) && isAbsolute(requestedOutput), 'Provide absolute .xcresult and fresh evidence directory paths, then lengths, permission-denied, or short')
assert.ok(Object.hasOwn(nativeSuites, suite) && !extra.length, 'Choose exactly one native suite: lengths, permission-denied, or short')
const run = promisify(execFile)
const output = await prepareEvidenceDirectory(result, requestedOutput)
const { stdout } = await run('xcrun', ['xcresulttool', 'get', 'test-results', 'summary', '--path', result], { maxBuffer: 4 * 1024 * 1024 })
const summary = JSON.parse(stdout)
await writeFile(resolve(output, 'summary.json'), JSON.stringify(summary, null, 2))
const { stdout: tests } = await run('xcrun', ['xcresulttool', 'get', 'test-results', 'tests', '--path', result], { maxBuffer: 4 * 1024 * 1024 })
const tree = JSON.parse(tests)
await writeFile(resolve(output, 'tests.json'), JSON.stringify(tree, null, 2))
await run('xcrun', ['xcresulttool', 'export', 'attachments', '--path', result, '--output-path', resolve(output, 'screenshots')], { maxBuffer: 4 * 1024 * 1024 })
const verified = validateNativeResult(summary, tree, suite)
await writeFile(resolve(output, 'verified-suite.json'), JSON.stringify(verified, null, 2))
console.log(JSON.stringify({ ...verified, result: summary.result, passed: summary.passedTests, failed: summary.failedTests, evidence: output }))

import assert from 'node:assert/strict'
import test from 'node:test'
import { nativeSuites, validateNativeResult } from './native-result.mjs'

function fixture(suite = 'lengths') {
  const cases = nativeSuites[suite].map(name => ({
    nodeType: 'Test Case',
    nodeIdentifier: `NativeShareUITests/${name}()`,
    nodeIdentifierURL: `test://com.apple.xcode/App/HukamnamaShareUITests/NativeShareUITests/${name}`,
    result: 'Passed',
  }))
  return {
    summary: { result: 'Passed', failedTests: 0, passedTests: cases.length },
    tree: { testNodes: [{ nodeType: 'Test Plan', children: [{ children: cases }] }] },
    cases,
  }
}

test('accepts exact passed native suites and records their identities', () => {
  for (const suite of Object.keys(nativeSuites)) {
    const { summary, tree } = fixture(suite)
    const result = validateNativeResult(summary, tree, suite)
    assert.equal(result.suite, suite)
    assert.equal(result.cases.length, nativeSuites[suite].length)
  }
})

test('rejects incomplete, unrelated, duplicate, skipped, or failing results', () => {
  for (const mutate of [
    ({ cases }) => cases.pop(),
    ({ cases }) => cases.push({ ...cases[0] }),
    ({ cases }) => { cases[0].nodeIdentifierURL = cases[0].nodeIdentifierURL.replace('HukamnamaShareUITests', 'UnrelatedUITests') },
    ({ cases }) => { cases[0].result = 'Skipped' },
    ({ cases }) => { cases[0].result = 'Failed' },
    ({ summary }) => { summary.passedTests = 1 },
    ({ summary }) => { summary.failedTests = 1 },
    ({ summary }) => { summary.result = 'Failed' },
  ]) {
    const value = fixture()
    mutate(value)
    assert.throws(() => validateNativeResult(value.summary, value.tree, 'lengths'))
  }
  assert.throws(() => validateNativeResult({}, {}, 'unknown'))
  assert.throws(() => validateNativeResult({}, {}, 'toString'))
  const short = fixture('short')
  assert.throws(() => validateNativeResult(short.summary, short.tree, 'lengths'))
})

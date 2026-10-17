import assert from 'node:assert/strict'

export const nativeSuites = {
  lengths: ['testShortShareCancelAndSave', 'testMediumShareCancelAndSave', 'testLongShareCancelAndSave'],
  'permission-denied': ['testPhotosPermissionDeniedAndSharingRecovery'],
  short: ['testShortShareCancelAndSave'],
}

export function validateNativeResult(summary, tree, suite) {
  assert.ok(Object.hasOwn(nativeSuites, suite), 'Choose native suite: lengths, permission-denied, or short')
  const cases = []
  function visit(node) {
    if (node.nodeType === 'Test Case') cases.push(node)
    for (const child of node.children ?? []) visit(child)
  }
  for (const node of tree.testNodes ?? []) visit(node)
  const expected = nativeSuites[suite].map(name => `NativeShareUITests/${name}()`)
  assert.deepEqual(cases.map(item => item.nodeIdentifier).sort(), [...expected].sort(), 'Native result must contain exactly the requested Hukamnama cases')
  for (const item of cases) {
    assert.ok(item.nodeIdentifierURL?.includes('/HukamnamaShareUITests/NativeShareUITests/'), 'Native case must belong to the Hukamnama UI test bundle')
    assert.equal(item.result, 'Passed', `${item.nodeIdentifier} did not pass`)
  }
  assert.equal(summary.result, 'Passed', 'Native test result is not a pass; inspect retained evidence')
  assert.equal(summary.failedTests, 0)
  assert.equal(summary.passedTests, expected.length, 'Native summary and case count must agree')
  return { suite, cases: cases.map(({ nodeIdentifier, result }) => ({ name: nodeIdentifier, result })) }
}

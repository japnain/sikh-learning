import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hasExactWebAddress } from './web-addresses.mjs'

const terms = 'https://banidb.com/tos'

test('finds standalone HTTPS or scheme-less policy addresses in prose', () => {
  assert(hasExactWebAddress('Its terms are at banidb.com/tos and its policy follows.', terms))
  assert(hasExactWebAddress('See https://banidb.com/tos.', terms))
  assert(hasExactWebAddress('<a href="https://banidb.com/tos">Terms</a>', terms))
})

test('does not accept the expected address embedded in a different URL', () => {
  for (const misleading of [
    'https://evil.example/banidb.com/tos',
    'https://evil.example/?next=banidb.com/tos',
    'https://banidb.com.evil.example/tos',
    'https://evilbanidb.com/tos',
    'https://banidb.com/tos-and-more',
    'https://banidb.com/tos#other-page',
    'https://banidb.com/tos?redirect=evil',
    'https://user@banidb.com/tos',
    'http://banidb.com/tos',
  ]) assert.equal(hasExactWebAddress(`Terms: ${misleading}`, terms), false, misleading)
})

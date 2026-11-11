import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeEntities, htmlToSemanticTextBlocks, htmlToText } from './curated-epub.mjs'

test('decodes each original character reference once, including nested-looking text', () => {
  assert.equal(decodeEntities('&amp;lt;tag&amp;gt; &amp;#39; &#38;lt;'), '&lt;tag&gt; &#39; &lt;')
  assert.equal(decodeEntities('&lt;word&gt; &quot;quote&quot; &apos;apostrophe&apos; &#65; &#x1F64F;'), '<word> "quote" \'apostrophe\' A 🙏')
  assert.equal(decodeEntities('plain <word> &unknown;'), 'plain <word> &unknown;')
})

test('invalid numeric character references cannot crash an import', () => {
  assert.equal(decodeEntities('&#0; &#xD800; &#1114112;'), '� � �')
})

test('HTML parsing excludes script and style content despite unusual end-tag syntax', () => {
  assert.equal(htmlToText('<body>Before<script>window.epubTest = true</script >Middle<style>body{color:red}</style ignored>After</body>'), 'Before Middle After')
  assert.equal(globalThis.epubTest, undefined)
})

test('extracts text across parsed elements and decodes text once', () => {
  assert.equal(htmlToText('<P title="a > b">One<em>two</em><br>three &amp;lt;four&amp;gt;</P>'), 'One two three &lt;four&gt;')
  assert.equal(htmlToText('<p>&lt;script&gt;literal text&lt;/script&gt;</p>'), '<script>literal text</script>')
})

test('retains malformed OCR attribute words in source order, including duplicates', () => {
  assert.equal(htmlToText('<P chaupai="" word="" word="" last="13"/>'), 'chaupai word word last 13')
})

test('semantic fallback excludes non-reading content instead of regex filtering it', () => {
  assert.deepEqual(htmlToSemanticTextBlocks('<body><script>leak</script ><iframe>hidden</iframe><span>A &amp;lt; B</span></body>'), [
    { type: 'paragraph', text: 'A &lt; B' },
  ])
})

import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const source = join(root, 'node_modules/pdfjs-dist')
const target = join(root, 'public/vendor/pdfjs')
await mkdir(target, { recursive: true })
for (const directory of ['cmaps', 'standard_fonts']) {
  await cp(join(source, directory), join(target, directory), { recursive: true })
}
for (const name of ['jbig2_nowasm_fallback.js', 'openjpeg_nowasm_fallback.js']) {
  await cp(join(source, 'wasm', name), join(target, name))
}
await cp(join(source, 'LICENSE'), join(target, 'LICENSE'))
const metadata = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'))
await writeFile(join(target, 'version.json'), JSON.stringify({ package: 'pdfjs-dist', version: metadata.version }) + '\n')
console.log(`Prepared PDF reader fonts, character maps and codecs (${metadata.version}).`)

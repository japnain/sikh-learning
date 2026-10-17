import { access, copyFile, mkdir, realpath } from 'node:fs/promises'
import { constants } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repository = resolve(here, '../../..')
const flags = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, args) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), args[index + 1]])
  return pairs
}, []))
if (!flags.runtime || !flags.out || !isAbsolute(flags.runtime) || !isAbsolute(flags.out)) {
  throw new Error('Usage: node scripts/qa/hukamnama/build.mjs --runtime /absolute/runtime --out /isolated/ios/App/App/public')
}
const runtime = await realpath(flags.runtime)
const out = resolve(flags.out)
let existingOutputParent = out
while (true) {
  try {
    existingOutputParent = await realpath(existingOutputParent)
    break
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const parent = dirname(existingOutputParent)
    if (parent === existingOutputParent) throw error
    existingOutputParent = parent
  }
}
const insideRepository = relative(repository, existingOutputParent)
if (!insideRepository.startsWith(`..${sep}`) && insideRepository !== '..') {
  throw new Error('QA output must be outside the repository; never replace production iOS web assets.')
}
if (!out.endsWith(`${sep}ios${sep}App${sep}App${sep}public`)) {
  throw new Error('Output must be an explicit isolated ios/App/App/public directory.')
}
await access(resolve(runtime, 'node_modules/vite/package.json'), constants.R_OK)
const runtimeAnchor = resolve(runtime, 'package.json')
const fromRuntime = createRequire(runtimeAnchor)
const { build } = await import(fromRuntime.resolve('vite'))
const { default: react } = await import(fromRuntime.resolve('@vitejs/plugin-react'))
const { default: tailwind } = await import(fromRuntime.resolve('tailwindcss'))
const { default: autoprefixer } = await import(fromRuntime.resolve('autoprefixer'))
const loadTailwindConfig = fromRuntime('tailwindcss/loadConfig')
const tailwindConfig = loadTailwindConfig(resolve(repository, 'tailwind.config.ts'))

await build({
  configFile: false,
  root: here,
  base: './',
  publicDir: false,
  plugins: [
    {
      name: 'hukamnama-qa-isolated-dependencies',
      enforce: 'pre',
      resolveId(source) {
        // Resolve bare packages from a clean locked runtime, including imports
        // inside production sources. Relative production imports stay intact.
        if (/^(?:[\w@])/.test(source) && !source.startsWith('node:')) {
          return this.resolve(source, runtimeAnchor, { skipSelf: true })
        }
        return null
      },
    },
    react(),
  ],
  resolve: { dedupe: ['react', 'react-dom', '@capacitor/core', '@radix-ui/react-dialog'] },
  css: { postcss: { plugins: [tailwind({
    ...tailwindConfig,
    content: [
      resolve(repository, 'src/features/shareHighlight/ShareHighlightSheet.tsx'),
      resolve(repository, 'src/components/ModalSheet.tsx'),
      resolve(repository, 'src/components/icons.tsx'),
      resolve(here, 'main.tsx'),
    ],
  }), autoprefixer()] } },
  build: { outDir: out, emptyOutDir: false, sourcemap: false },
})
// This fixture skips the large public directory, but the bundled font's notice
// must still accompany the font in isolated native builds, as in production.
await mkdir(resolve(out, 'licenses'), { recursive: true })
await copyFile(resolve(repository, 'public/licenses/NotoSansDevanagari-OFL.txt'), resolve(out, 'licenses/NotoSansDevanagari-OFL.txt'))
console.log(`Built current production sharing code into isolated QA assets: ${out}`)

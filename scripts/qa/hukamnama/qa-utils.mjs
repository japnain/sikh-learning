import { lstat, mkdir, realpath } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'

const booleanFlags = new Set(['ui-only', 'ui-all'])
const pathFlags = new Set(['runtime', 'app', 'out', 'executable'])
const enumFlags = {
  engine: ['chromium', 'webkit'],
  keep: ['representative', 'all'],
}

export function parseBrowserFlags(args) {
  const flags = { engine: 'chromium', keep: 'representative', 'ui-only': false, 'ui-all': false }
  const seen = new Set()
  for (let index = 0; index < args.length; index += 2) {
    const token = args[index]
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`)
    const name = token.slice(2)
    if (!booleanFlags.has(name) && !pathFlags.has(name) && !Object.hasOwn(enumFlags, name)) {
      throw new Error(`Unknown flag: ${token}`)
    }
    if (seen.has(name)) throw new Error(`Duplicate flag: ${token}`)
    const value = args[index + 1]
    if (value === undefined || value.startsWith('--') || value.length === 0) {
      throw new Error(`${token} requires a value`)
    }
    if (booleanFlags.has(name)) {
      if (value !== 'true' && value !== 'false') throw new Error(`${token} must be true or false`)
      flags[name] = value === 'true'
    } else if (pathFlags.has(name)) {
      if (!isAbsolute(value)) throw new Error(`${token} requires an absolute path`)
      flags[name] = value
    } else {
      if (!enumFlags[name].includes(value)) throw new Error(`${token} must be ${enumFlags[name].join(' or ')}`)
      flags[name] = value
    }
    seen.add(name)
  }
  for (const name of ['runtime', 'app', 'out']) {
    if (!seen.has(name)) throw new Error(`--${name} requires an absolute path`)
  }
  if (flags['ui-only'] && flags['ui-all']) throw new Error('Choose either --ui-only true or --ui-all true')
  return flags
}

export function browserCoverage(flags) {
  return {
    suite: flags['ui-only'] ? 'ui-only' : flags['ui-all'] ? 'exports-fonts-and-full-ui' : 'exports-fonts-and-smoke-ui',
    exports: flags['ui-only'] ? 0 : 45,
    typography: flags['ui-only'] ? 0 : 2,
    composer: flags['ui-only'] || flags['ui-all'] ? 36 : 3,
  }
}

async function canonicalProspectivePath(path) {
  let cursor = resolve(path)
  const missing = []
  while (true) {
    try {
      await lstat(cursor)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      missing.unshift(basename(cursor))
      const parent = dirname(cursor)
      if (parent === cursor) throw error
      cursor = parent
      continue
    }
    // Resolve outside the catch: a dangling existing symlink must fail rather
    // than being treated as a new directory that is safe to create.
    return resolve(await realpath(cursor), ...missing)
  }
}

function containsPath(parent, child) {
  const relation = relative(parent, child)
  return relation === '' || (!relation.startsWith(`..${sep}`) && relation !== '..' && !isAbsolute(relation))
}

/** Create a fresh evidence leaf and return its canonical absolute path. */
export async function createFreshEvidenceDirectory(outputPath, inputPaths) {
  if (!isAbsolute(outputPath) || !Array.isArray(inputPaths) || !inputPaths.length
    || inputPaths.some(path => !isAbsolute(path))) {
    throw new Error('Evidence output and at least one input must have absolute paths')
  }
  const output = await canonicalProspectivePath(outputPath)
  const inputs = await Promise.all(inputPaths.map(path => realpath(path)))
  if (inputs.some(input => containsPath(input, output) || containsPath(output, input))) {
    throw new Error('Evidence output must not overlap an input path, including ancestors and symlink aliases')
  }
  try {
    await lstat(output)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    await mkdir(dirname(output), { recursive: true })
    // The final non-recursive mkdir rejects an existing/racing leaf instead of
    // ever merging new evidence into a previous run.
    await mkdir(output)
    return output
  }
  throw new Error('Evidence output must be a fresh directory; choose a new path')
}

/** Single-input convenience API for xcresult and other evidence exporters. */
export function prepareEvidenceDirectory(inputPath, outputPath) {
  return createFreshEvidenceDirectory(outputPath, [inputPath])
}

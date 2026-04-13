import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@insforge/sdk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const ambientDir = path.join(repoRoot, 'public', 'audio', 'ambient')
const dryRun = process.argv.includes('--dry-run')

function loadEnvFile(filePath) {
  return fs.readFile(filePath, 'utf8')
    .then(contents => {
      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue

        const separator = line.indexOf('=')
        if (separator === -1) continue

        const key = line.slice(0, separator).trim()
        let value = line.slice(separator + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }

        if (!(key in process.env)) {
          process.env[key] = value
        }
      }
    })
    .catch(() => {})
}

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function joinStoragePath(prefix, fileName) {
  const normalizedFileName = fileName.replace(/^\/+|\/+$/g, '')
  if (!prefix) return normalizedFileName
  return `${prefix.replace(/^\/+|\/+$/g, '')}/${normalizedFileName}`
}

async function main() {
  await loadEnvFile(path.join(repoRoot, '.env.local'))
  await loadEnvFile(path.join(repoRoot, '.env'))

  const baseUrl = requireEnv('VITE_INSFORGE_URL')
  const anonKey = requireEnv('VITE_INSFORGE_ANON_KEY')
  const bucketName = requireEnv('VITE_INSFORGE_AUDIO_BUCKET')
  const prefix = process.env.VITE_INSFORGE_AUDIO_PREFIX?.trim() || 'ambient'

  const fileNames = (await fs.readdir(ambientDir))
    .filter(fileName => fileName.toLowerCase().endsWith('.mp3'))
    .sort()

  if (fileNames.length === 0) {
    throw new Error(`No MP3 files found in ${ambientDir}`)
  }

  const client = createClient({
    baseUrl,
    anonKey,
    isServerMode: true,
  })

  const bucket = client.storage.from(bucketName)

  console.log(`${dryRun ? 'Planning' : 'Uploading'} ${fileNames.length} ambient audio files to InsForge bucket "${bucketName}"`)

  for (const fileName of fileNames) {
    const localPath = path.join(ambientDir, fileName)
    const remotePath = joinStoragePath(prefix, fileName)
    const publicUrl = bucket.getPublicUrl(remotePath)

    if (dryRun) {
      console.log(`${fileName} -> ${publicUrl}`)
      continue
    }

    const buffer = await fs.readFile(localPath)
    const blob = new Blob([buffer], { type: 'audio/mpeg' })

    const removeResult = await bucket.remove(remotePath)
    if (removeResult.error && removeResult.error.statusCode !== 404) {
      throw removeResult.error
    }

    const uploadResult = await bucket.upload(remotePath, blob)
    if (uploadResult.error) {
      throw uploadResult.error
    }

    console.log(`uploaded ${fileName} -> ${publicUrl}`)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const live = process.argv.includes('--live')
const passes = []
const warnings = []
const failures = []

const pass = (message) => passes.push(message)
const warn = (message) => warnings.push(message)
const fail = (message) => failures.push(message)

function check(condition, message, detail = '') {
  if (condition) pass(message)
  else fail(`${message}${detail ? ` — ${detail}` : ''}`)
}

function command(binary, args, options = {}) {
  const result = spawnSync(binary, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  })
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim()
    throw new Error(`${basename(binary)} ${args.join(' ')} failed${output ? `: ${output}` : ''}`)
  }
  return `${result.stdout ?? ''}${result.stderr ?? ''}`
}

function plist(path) {
  return JSON.parse(command('/usr/bin/plutil', ['-convert', 'json', '-o', '-', path]))
}

function walkFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(absolute))
    else if (entry.isFile()) files.push(absolute)
  }
  return files
}

function findDirectories(directory, wantedNames, matches = []) {
  if (!existsSync(directory)) return matches
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const absolute = join(directory, entry.name)
    if (wantedNames.has(entry.name)) matches.push(absolute)
    else findDirectories(absolute, wantedNames, matches)
  }
  return matches
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function compareBundledWeb(left, right) {
  const allowedBridgeFiles = new Set(['cordova.js', 'cordova_plugins.js'])
  const leftFiles = walkFiles(left).map((path) => relative(left, path)).sort()
  const rightFiles = walkFiles(right).map((path) => relative(right, path)).sort()
  if (rightFiles.some((path) => !leftFiles.includes(path) && !allowedBridgeFiles.has(path))) return false
  if (leftFiles.some((path) => !rightFiles.includes(path))) return false
  return leftFiles.every((path) => {
    const leftPath = join(left, path)
    const rightPath = join(right, path)
    return statSync(leftPath).size === statSync(rightPath).size && sha256(leftPath) === sha256(rightPath)
  })
}

function pngInfo(path) {
  const bytes = readFileSync(path)
  const signature = bytes.subarray(0, 8).toString('hex')
  if (signature !== '89504e470d0a1a0a') throw new Error(`${path} is not a PNG`)
  const colorType = bytes[25]
  const hasTransparencyChunk = bytes.includes(Buffer.from('tRNS'))
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    hasAlpha: colorType === 4 || colorType === 6 || hasTransparencyChunk,
  }
}

function jpegInfo(path) {
  const bytes = readFileSync(path)
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`${path} is not a JPEG`)
  let offset = 2
  const sizeMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
  while (offset < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1
    const marker = bytes[offset]
    offset += 1
    if (marker === 0xd8 || marker === 0xd9) continue
    const length = bytes.readUInt16BE(offset)
    if (sizeMarkers.has(marker)) {
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) }
    }
    offset += length
  }
  throw new Error(`No JPEG dimensions found in ${path}`)
}

function codeBlockAfter(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = markdown.match(new RegExp(`## ${escaped}\\s+[\\s\\S]*?` + '```(?:text)?\\s*([\\s\\S]*?)\\s*```'))
  return match?.[1]?.trim() ?? ''
}

function parseBuildSettings(output) {
  const settings = {}
  for (const line of output.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+) = (.*)$/)
    if (match) settings[match[1]] = match[2].trim()
  }
  return settings
}

function verifyPrivacyManifest(path, label, expectedCollectedTypes = []) {
  check(existsSync(path), `${label} privacy manifest is present`)
  if (!existsSync(path)) return
  try {
    const data = plist(path)
    check(data.NSPrivacyTracking === false, `${label} does not declare tracking`)
    check(Array.isArray(data.NSPrivacyTrackingDomains) && data.NSPrivacyTrackingDomains.length === 0, `${label} has no tracking domains`)
    const collected = Array.isArray(data.NSPrivacyCollectedDataTypes) ? data.NSPrivacyCollectedDataTypes : []
    const actualTypes = collected.map((entry) => entry.NSPrivacyCollectedDataType).sort()
    const expectedTypes = [...expectedCollectedTypes].sort()
    check(JSON.stringify(actualTypes) === JSON.stringify(expectedTypes), expectedTypes.length > 0 ? `${label} declares the expected collected data types` : `${label} declares no collected data`, actualTypes.join(', '))
    for (const entry of collected) {
      check(entry.NSPrivacyCollectedDataTypeLinked === true, `${label} links ${entry.NSPrivacyCollectedDataType} conservatively`)
      check(entry.NSPrivacyCollectedDataTypeTracking === false, `${label} does not use ${entry.NSPrivacyCollectedDataType} for tracking`)
      const purposes = Array.isArray(entry.NSPrivacyCollectedDataTypePurposes) ? [...entry.NSPrivacyCollectedDataTypePurposes].sort() : []
      const expectedPurposes = ['NSPrivacyCollectedDataTypePurposeAnalytics', 'NSPrivacyCollectedDataTypePurposeAppFunctionality']
      check(JSON.stringify(purposes) === JSON.stringify(expectedPurposes), `${label} declares functionality and analytics purposes for ${entry.NSPrivacyCollectedDataType}`, purposes.join(', '))
    }
    check(Array.isArray(data.NSPrivacyAccessedAPITypes) && data.NSPrivacyAccessedAPITypes.length === 0, `${label} declares no required-reason APIs`)
  } catch (error) {
    fail(`${label} privacy manifest is invalid — ${error.message}`)
  }
}

function verifyXcframeworkSignatures(derivedDataRoot) {
  const artifacts = join(derivedDataRoot, 'SourcePackages', 'artifacts')
  const expected = new Set(['Capacitor.xcframework', 'Cordova.xcframework'])
  const found = findDirectories(artifacts, expected)
  for (const name of expected) {
    const path = found.find((candidate) => basename(candidate) === name)
    check(Boolean(path), `${name} package artifact is present`)
    if (!path) continue
    try {
      command('/usr/bin/codesign', ['--verify', '--strict', '--verbose=2', path])
      const details = command('/usr/bin/codesign', ['-dv', '--verbose=4', path])
      check(details.includes('TeamIdentifier=9YN2HU59K8'), `${name} has the official Capacitor publisher signature`)
    } catch (error) {
      fail(`${name} signature is invalid — ${error.message}`)
    }
  }
}

async function verifyLiveSite(distIndex) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch('https://naamras.xyz/', { signal: controller.signal })
    check(response.ok, 'naamras.xyz is reachable', `HTTP ${response.status}`)
    if (!response.ok) return
    const liveIndex = await response.text()
    const assetPattern = /(?:src|href)="(\/assets\/index-[^"]+\.(?:js|css))"/g
    const localAssets = [...distIndex.matchAll(assetPattern)].map((match) => match[1]).sort()
    const liveAssets = [...liveIndex.matchAll(assetPattern)].map((match) => match[1]).sort()
    check(localAssets.length >= 2, 'local production entry assets were found')
    check(JSON.stringify(liveAssets) === JSON.stringify(localAssets), 'iOS web build uses the same entry assets as naamras.xyz')
    for (const asset of localAssets) {
      const assetResponse = await fetch(`https://naamras.xyz${asset}`, { signal: controller.signal })
      check(assetResponse.ok, `live asset ${asset} is reachable`, `HTTP ${assetResponse.status}`)
      if (!assetResponse.ok) continue
      const liveHash = createHash('sha256').update(Buffer.from(await assetResponse.arrayBuffer())).digest('hex')
      check(liveHash === sha256(join(root, 'dist', asset.slice(1))), `live asset ${asset} matches the bundled iOS asset`)
    }
    for (const [route, heading] of [['privacy', 'NaamRas keeps reading clear and optional.'], ['support', 'Help that gets you back to reading.']]) {
      const routeResponse = await fetch(`https://naamras.xyz/${route}`, { signal: controller.signal })
      const html = routeResponse.ok ? await routeResponse.text() : ''
      check(routeResponse.ok, `live /${route} route is reachable`, `HTTP ${routeResponse.status}`)
      check(html.includes(heading) || html.includes('/assets/index-'), `live /${route} route serves the NaamRas app shell`)
    }
  } catch (error) {
    fail(`live naamras.xyz verification failed — ${error.message}`)
  } finally {
    clearTimeout(timeout)
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const packageLock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
const capacitorConfig = readFileSync(join(root, 'capacitor.config.ts'), 'utf8')
const productionEnv = readFileSync(join(root, '.env.production'), 'utf8')
const packageSwift = readFileSync(join(root, 'ios/App/CapApp-SPM/Package.swift'), 'utf8')
const packageResolved = JSON.parse(readFileSync(join(root, 'ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'), 'utf8'))
const appCollectedDataTypes = [
  'NSPrivacyCollectedDataTypeSearchHistory',
  'NSPrivacyCollectedDataTypeProductInteraction',
  'NSPrivacyCollectedDataTypeOtherDataTypes',
]

const capacitorVersions = [
  packageJson.dependencies?.['@capacitor/core'],
  packageJson.dependencies?.['@capacitor/ios'],
  packageJson.devDependencies?.['@capacitor/cli'],
]
check(capacitorVersions.every(Boolean), 'Capacitor core, iOS, and CLI packages are declared')
check(new Set(capacitorVersions).size === 1, 'Capacitor package versions are pinned consistently', capacitorVersions.join(', '))
check(capacitorVersions[0] === '8.4.2', 'Capacitor launch baseline is 8.4.2', capacitorVersions[0])
const lockedCapacitorVersions = ['@capacitor/core', '@capacitor/ios', '@capacitor/cli'].map((name) => packageLock.packages?.[`node_modules/${name}`]?.version)
check(lockedCapacitorVersions.every((version) => version === '8.4.2'), 'package-lock resolves all Capacitor packages to 8.4.2', lockedCapacitorVersions.join(', '))
check(packageSwift.includes('exact: "8.4.2"'), 'Capacitor Swift package is pinned to 8.4.2')
const resolvedCapacitor = packageResolved.pins?.find((pin) => pin.identity === 'capacitor-swift-pm')
check(resolvedCapacitor?.state?.version === '8.4.2', 'Xcode resolves capacitor-swift-pm 8.4.2', resolvedCapacitor?.state?.version)

check(capacitorConfig.includes("appId: 'com.naamras.app'"), 'Capacitor app id is com.naamras.app')
check(capacitorConfig.includes("appName: 'NaamRas'"), 'Capacitor app name is NaamRas')
check(capacitorConfig.includes("webDir: 'dist'"), 'Capacitor packages the production dist directory')
const envLines = productionEnv.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
check(envLines.includes('VITE_SUPPORT_URL=https://naamras.xyz/support'), 'production support URL is public and valid')
check(envLines.includes('VITE_PRIVACY_URL=https://naamras.xyz/privacy'), 'production privacy URL is public and valid')
check(envLines.every((line) => line.startsWith('VITE_SUPPORT_URL=') || line.startsWith('VITE_PRIVACY_URL=')), 'production environment contains no backend credentials or collection endpoints')
const banidbConfig = readFileSync(join(root, 'src/supabase/config.ts'), 'utf8')
check(banidbConfig.includes("'https://api.banidb.com'"), 'production defaults to the public BaniDB API')
const privacyPage = readFileSync(join(root, 'src/pages/Privacy.tsx'), 'utf8')
check(privacyPage.includes('Effective July 18, 2026'), 'privacy notice has the audited effective date')
check(privacyPage.includes('record the requesting IP address and requested page or path in server logs'), 'privacy notice discloses BaniDB server-log collection')
check(privacyPage.includes('banidb.com/tos') && privacyPage.includes('khalisfoundation.org/about/privacy-policy'), 'privacy notice identifies the BaniDB terms and Khalis privacy policy')

const sourceInfo = plist(join(root, 'ios/App/App/Info.plist'))
check(sourceInfo.CFBundleDisplayName === 'NaamRas', 'Info.plist display name is NaamRas')
check(sourceInfo.ITSAppUsesNonExemptEncryption === false, 'export-compliance declaration is present')
check(sourceInfo.UILaunchStoryboardName === 'LaunchScreen', 'launch storyboard is configured')
const launchStoryboard = readFileSync(join(root, 'ios/App/App/Base.lproj/LaunchScreen.storyboard'), 'utf8')
check(launchStoryboard.includes('LaunchBackground'), 'launch screen uses the NaamRas background color')
check(!/capacitor|splash/i.test(launchStoryboard), 'launch screen contains no stock Capacitor artwork')
const mainStoryboard = readFileSync(join(root, 'ios/App/App/Base.lproj/Main.storyboard'), 'utf8')
check(mainStoryboard.includes('CAPBridgeViewController'), 'App scheme launches the Capacitor web container')

const iconPath = join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
try {
  const icon = pngInfo(iconPath)
  check(icon.width === 1024 && icon.height === 1024, 'App Store icon is 1024 × 1024', `${icon.width} × ${icon.height}`)
  check(!icon.hasAlpha, 'App Store icon has no alpha channel')
} catch (error) {
  fail(`App Store icon could not be validated — ${error.message}`)
}

const screenshotDirectory = join(root, 'docs/app-store/screenshots')
const screenshotFiles = readdirSync(screenshotDirectory).filter((name) => /\.(?:jpe?g|png)$/i.test(name))
check(screenshotFiles.length >= 1 && screenshotFiles.length <= 10, 'App Store screenshot count is within Apple’s 1–10 limit', String(screenshotFiles.length))
const requiredScreenshot = join(screenshotDirectory, 'naamras-iphone-6.3-onboarding.jpg')
check(existsSync(requiredScreenshot), 'required 6.3-inch iPhone screenshot is present')
if (existsSync(requiredScreenshot)) {
  try {
    const screenshot = jpegInfo(requiredScreenshot)
    check(screenshot.width === 1206 && screenshot.height === 2622, 'iPhone screenshot is 1206 × 2622', `${screenshot.width} × ${screenshot.height}`)
  } catch (error) {
    fail(`iPhone screenshot could not be validated — ${error.message}`)
  }
}

const metadataPath = join(root, 'docs/app-store/metadata-en-US.md')
const metadata = readFileSync(metadataPath, 'utf8')
const name = metadata.match(/- Name \([^)]*\): `([^`]+)`/)?.[1] ?? ''
const subtitle = metadata.match(/- Subtitle \([^)]*\): `([^`]+)`/)?.[1] ?? ''
const promotionalText = codeBlockAfter(metadata, 'Promotional Text')
const description = codeBlockAfter(metadata, 'Description')
const keywords = codeBlockAfter(metadata, 'Keywords')
const releaseNotes = codeBlockAfter(metadata, 'Version 1.0 Release Notes')
check(name.length > 0 && name.length <= 30, 'App Store name is within 30 characters', String(name.length))
check(subtitle.length > 0 && subtitle.length <= 30, 'App Store subtitle is within 30 characters', String(subtitle.length))
check(promotionalText.length > 0 && promotionalText.length <= 170, 'promotional text is within 170 characters', String(promotionalText.length))
check(description.length > 0 && description.length <= 4000, 'description is within 4,000 characters', String(description.length))
check(Buffer.byteLength(keywords) > 0 && Buffer.byteLength(keywords) <= 100, 'keywords are within 100 bytes', String(Buffer.byteLength(keywords)))
check(releaseNotes.length > 0 && releaseNotes.length <= 4000, 'release notes are present and within 4,000 characters', String(releaseNotes.length))
for (const document of ['app-store-connect-answers.md', 'submission-checklist.md', 'content-rights-and-provider-audit.md', 'age-rating-evidence.md']) {
  check(existsSync(join(root, 'docs/app-store', document)), `${document} is present`)
}
check(existsSync(join(root, 'docs/app-store-readiness.md')), 'workspace readiness report is present')
if (metadata.includes('[LEGAL OWNER NAME]')) warn('Replace [LEGAL OWNER NAME] with the App Store account’s exact legal owner before submission.')
const connectAnswers = readFileSync(join(root, 'docs/app-store/app-store-connect-answers.md'), 'utf8')
check(connectAnswers.includes('Conservative 1.0 response: `Data Collected`') && !connectAnswers.includes('Recommended 1.0 response: `Data Not Collected`'), 'App Store privacy draft declares BaniDB collection')
check(connectAnswers.includes('Current conservative result: `Unrated'), 'App Store age-rating draft does not understate the current corpus')
const providerAudit = readFileSync(join(root, 'docs/app-store/content-rights-and-provider-audit.md'), 'utf8')
check(providerAudit.includes('Do not answer the App Store Connect content-rights declaration'), 'content-rights audit preserves the no-submit gate')
warn('Submission is blocked until the legal owner retains written Panth Prakash rights and documents BaniDB terms compliance.')
const ageEvidence = readFileSync(join(root, 'docs/app-store/age-rating-evidence.md'), 'utf8')
check(ageEvidence.includes('| Violence and physical harm | 142 | 2,034 |') && ageEvidence.includes('| Graphic injury/torture indicators | 33 | 100 |'), 'age-rating evidence contains the audited corpus counts')
warn('Submission is blocked while the unchanged Panth Prakash corpus has a conservative Unrated age-rating result.')
const panthChapters = join(root, 'public/data/library/works/panth-prakash-english/chapters')
const panthChapterFiles = readdirSync(panthChapters).filter((name) => /^episode-\d{3}\.json$/.test(name)).sort()
check(panthChapterFiles.length === 169, 'age-rating audit covers all 169 Panth Prakash episodes', String(panthChapterFiles.length))
const agePatterns = {
  violence: /\b(kill(?:ed|ing|s)?|murder(?:ed|ing|s)?|slain|slaughter(?:ed|ing)?|battle(?:s)?|war(?:s|fare)?|attack(?:ed|ing|s)?|fight(?:ing|s)?|blood(?:y|shed)?|wound(?:ed|s|ing)?|tortur(?:e|ed|ing)|execut(?:e|ed|ion|ions)|behead(?:ed|ing)|sever(?:ed|ing)|dismember(?:ed|ment)|goug(?:e|ed|ing)|scalp(?:ed|ing|s)?|corpse(?:s)?|dead bod(?:y|ies)|death(?:s)?|chop(?:ped|ping)|minced)\b/gi,
  weapons: /\b(sword(?:s)?|gun(?:s)?|weapon(?:s)?|arms|cannon(?:s)?|musket(?:s)?|dagger(?:s)?|knife|knives|spear(?:s)?|arrow(?:s)?|bow(?:s)?|rifle(?:s)?|pistol(?:s)?|blade(?:s)?|axe(?:s)?|hatchet(?:s)?)\b/gi,
  graphic: /\b(minced|scalp(?:ed|ing|s)?|behead(?:ed|ing)|dismember(?:ed|ment)|goug(?:e|ed|ing)(?: out)?|skin(?:ned|ning)|severed|limb by limb|inch by inch)\b|peeled (?:his |their |the )?skin|chopped (?:off|into pieces)|cut (?:into pieces|limb by limb|inch by inch)|heads? (?:cut|chopped) off|hands? (?:cut|chopped) off|fingers? (?:cut|chopped)/gi,
  substances: /\b(alcohol|wine|liquor|whisky|whiskey|opium|bhang|tobacco|cigarette(?:s)?|intoxicant(?:s)?|drunk(?:en)?)\b/gi,
}
const ageCounts = Object.fromEntries(Object.keys(agePatterns).map((key) => [key, { chapters: 0, matches: 0 }]))
for (const file of panthChapterFiles) {
  const chapter = JSON.parse(readFileSync(join(panthChapters, file), 'utf8'))
  const text = chapter.pages.flatMap((page) => page.blocks.map((block) => block.text ?? '')).join('\n')
  for (const [key, pattern] of Object.entries(agePatterns)) {
    const matches = text.match(new RegExp(pattern.source, pattern.flags)) ?? []
    if (matches.length > 0) ageCounts[key].chapters += 1
    ageCounts[key].matches += matches.length
  }
}
check(JSON.stringify(ageCounts) === JSON.stringify({
  violence: { chapters: 142, matches: 2034 },
  weapons: { chapters: 96, matches: 636 },
  graphic: { chapters: 33, matches: 100 },
  substances: { chapters: 13, matches: 19 },
}), 'age-rating corpus counts remain reproducible', JSON.stringify(ageCounts))

verifyPrivacyManifest(join(root, 'ios/App/App/PrivacyInfo.xcprivacy'), 'App source', appCollectedDataTypes)

let buildSettings
try {
  buildSettings = parseBuildSettings(command('xcodebuild', [
    '-project', 'ios/App/App.xcodeproj',
    '-scheme', 'App',
    '-configuration', 'Release',
    '-destination', 'generic/platform=iOS Simulator',
    '-showBuildSettings',
  ]))
  check(buildSettings.PRODUCT_BUNDLE_IDENTIFIER === 'com.naamras.app', 'Release bundle id is com.naamras.app', buildSettings.PRODUCT_BUNDLE_IDENTIFIER)
  check(buildSettings.MARKETING_VERSION === '1.0', 'Release marketing version is 1.0', buildSettings.MARKETING_VERSION)
  check(buildSettings.CURRENT_PROJECT_VERSION === '1', 'Release build number is 1', buildSettings.CURRENT_PROJECT_VERSION)
  check(buildSettings.IPHONEOS_DEPLOYMENT_TARGET === '17.0', 'Release minimum OS is iOS 17.0', buildSettings.IPHONEOS_DEPLOYMENT_TARGET)
  check(buildSettings.TARGETED_DEVICE_FAMILY === '1', 'App Store target is iPhone-only', buildSettings.TARGETED_DEVICE_FAMILY)
  if (!buildSettings.DEVELOPMENT_TEAM) warn('Apple Developer Team is not configured; the account owner must select it before creating the signed archive.')
} catch (error) {
  fail(`Release build settings could not be read — ${error.message}`)
}

if (buildSettings) {
  const appBundle = join(buildSettings.TARGET_BUILD_DIR, buildSettings.FULL_PRODUCT_NAME)
  check(existsSync(appBundle), 'fresh Release simulator app bundle is present', appBundle)
  if (existsSync(appBundle)) {
    try {
      const builtInfo = plist(join(appBundle, 'Info.plist'))
      check(builtInfo.CFBundleIdentifier === 'com.naamras.app', 'built app bundle id is com.naamras.app', builtInfo.CFBundleIdentifier)
      check(builtInfo.CFBundleShortVersionString === '1.0', 'built app version is 1.0', builtInfo.CFBundleShortVersionString)
      check(builtInfo.CFBundleVersion === '1', 'built app build number is 1', builtInfo.CFBundleVersion)
      check(builtInfo.MinimumOSVersion === '17.0', 'built app minimum OS is 17.0', builtInfo.MinimumOSVersion)
      check(JSON.stringify(builtInfo.UIDeviceFamily) === JSON.stringify([1]), 'built app supports iPhone only', JSON.stringify(builtInfo.UIDeviceFamily))
      check(builtInfo.ITSAppUsesNonExemptEncryption === false, 'built app contains the export-compliance declaration')
    } catch (error) {
      fail(`built Info.plist could not be validated — ${error.message}`)
    }
    verifyPrivacyManifest(join(appBundle, 'PrivacyInfo.xcprivacy'), 'Built app', appCollectedDataTypes)
    verifyPrivacyManifest(join(appBundle, 'Frameworks/Capacitor.framework/PrivacyInfo.xcprivacy'), 'Bundled Capacitor SDK')
    verifyPrivacyManifest(join(appBundle, 'Frameworks/Cordova.framework/PrivacyInfo.xcprivacy'), 'Bundled Cordova SDK')
  }
  const derivedDataRoot = resolve(buildSettings.BUILD_DIR, '../..')
  verifyXcframeworkSignatures(derivedDataRoot)
}

const dist = join(root, 'dist')
const publicBundle = join(root, 'ios/App/App/public')
check(existsSync(dist) && existsSync(publicBundle), 'web and iOS public bundles are present')
if (existsSync(dist) && existsSync(publicBundle)) {
  check(compareBundledWeb(dist, publicBundle), 'every production web asset is byte-for-byte identical in the iOS bundle')
}

if (live) await verifyLiveSite(readFileSync(join(dist, 'index.html'), 'utf8'))
else warn('Run `npm run qa:app-store -- --live` immediately before upload to recheck naamras.xyz parity and public URLs.')

for (const message of passes) console.log(`✓ ${message}`)
for (const message of warnings) console.log(`⚠ ${message}`)
for (const message of failures) console.error(`✗ ${message}`)

console.log(`\nApp Store release gate: ${passes.length} passed, ${warnings.length} owner/reminder warnings, ${failures.length} failed.`)
if (failures.length > 0) process.exitCode = 1

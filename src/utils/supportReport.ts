import { getAppVersion } from './appConfig'
import { getDiagnosticHistory } from './diagnostics'
import { SUPPORT_COPY } from './supportCopy'

export function createSupportReport(locale: keyof typeof SUPPORT_COPY = 'en'): string {
  const copy = SUPPORT_COPY[locale]
  const failures = getDiagnosticHistory()
  return `${copy.reportTitle}

${copy.version}: ${getAppVersion()}
${copy.connection}: ${typeof navigator !== 'undefined' && navigator.onLine === false ? copy.offline : copy.online}

${copy.happened}:

${copy.steps}:
1.
2.
3.

${copy.expected}:

${copy.device}:

${copy.failures}:
${failures.length ? failures.map(entry => `${entry.occurredAt} | ${entry.code} | ${entry.source} | ${entry.path} | ${copy.count} ${entry.count}`).join('\n') : copy.none}

${copy.reportPrivacy}`
}

export function downloadSupportReport(report: string): void {
  const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'naamras-support-report.txt'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

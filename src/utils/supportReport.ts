import { getAppVersion } from './appConfig'
import { getDiagnosticHistory } from './diagnostics'

export function createSupportReport(): string {
  const failures = getDiagnosticHistory()
  return `NaamRas support report

App version: ${getAppVersion()}
Connection: ${typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online or unknown'}

What happened:

Steps to reproduce:
1.
2.
3.

Expected result:

Device / operating system (optional):

Recent technical failures from this app session:
${failures.length ? failures.map(entry => `${entry.occurredAt} | ${entry.code} | ${entry.source} | ${entry.path} | count ${entry.count}`).join('\n') : 'No failures recorded in this session.'}

Technical details exclude search terms, reading titles, saved content, account identifiers, error text, and device identifiers. Review anything you add before sharing. This report has not been sent.`
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

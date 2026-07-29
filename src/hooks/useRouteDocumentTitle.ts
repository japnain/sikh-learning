import { useEffect } from 'react'

const APP_NAME = 'NaamRas'

export function getRouteDocumentTitle(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/'

  if (normalized === '/') return APP_NAME
  if (normalized === '/study' || normalized.startsWith('/study/')) return `Reader · ${APP_NAME}`
  if (normalized === '/saved' || normalized === '/library') return `Saved · ${APP_NAME}`
  if (/^\/library\/[^/]+\/chapters\/[^/]+$/.test(normalized)) return `Book Reader · ${APP_NAME}`
  if (/^\/library\/[^/]+$/.test(normalized)) return `Book · ${APP_NAME}`
  if (normalized === '/nitnem/customize') return `Customize Nitnem · ${APP_NAME}`
  if (normalized.startsWith('/banis/amrit-keertan')) return `Amrit Keertan · ${APP_NAME}`
  if (normalized.startsWith('/banis/rehat')) return `Rehat Maryada · ${APP_NAME}`
  if (normalized === '/banis') return `Read · ${APP_NAME}`
  if (normalized === '/more') return `More · ${APP_NAME}`
  if (normalized === '/vocab') return `Vocabulary · ${APP_NAME}`
  if (normalized === '/privacy') return `Privacy · ${APP_NAME}`
  if (normalized === '/support') return `Support · ${APP_NAME}`
  return `Page not found · ${APP_NAME}`
}

export function useRouteDocumentTitle(pathname: string) {
  useEffect(() => {
    document.title = getRouteDocumentTitle(pathname)
  }, [pathname])
}

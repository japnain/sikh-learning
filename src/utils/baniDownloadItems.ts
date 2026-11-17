import { buildReadBaniCatalog } from './readBaniCatalog'
import { getBaniDiscovery } from '../content/baniDiscovery'
import { buildCanonicalBaniStudyPath } from './baniRouteResolver'
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import { SHABADOS_BANIS, getShabadosBaniPath } from '../data/shabadosBanis'
import { createShabadosDownloadSource } from '../api/shabados'
import { createBaniDbDownloadSource } from './baniDownloads'
import type { BaniDownloadItem } from '../components/BaniDownloadsPanel'

export function getBaniDownloadItems(open: (path: string) => void): BaniDownloadItem[] {
  const catalogue = buildReadBaniCatalog()
  return [...catalogue.sundarGutka.flatMap(group => group.items), ...catalogue.scriptures.SGGS, ...catalogue.scriptures.DG]
    .flatMap(item => {
      const id = item.baniDbId
      if (!id) return []
      const title = getBaniDiscovery(id)?.name ?? item.bani?.name ?? `Bani ${id}`
      return [{ key: `banidb:${id}`, title, createSource: () => createBaniDbDownloadSource(id, title), onOpen: () => {
        const routine = NITNEM_ROUTE_OPTIONS.find(option => option.baniDbId === id)
        if (routine) open(buildNitnemStudyPath(routine))
        else if (item.bani) open(buildCanonicalBaniStudyPath(item.bani))
        else if (id === 24) open('/study?baniDbId=24&bani=Ardaas')
      } }]
    }).concat(SHABADOS_BANIS.map(item => ({ key: `shabados:${item.id}`, title: item.name,
      createSource: () => createShabadosDownloadSource(item.id), onOpen: () => open(getShabadosBaniPath(item.id)) })))
}

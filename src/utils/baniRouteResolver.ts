type BaniSource = 'G' | 'D' | 'B' | 'A'

const BOUNDED_BANIDB_ID_BY_RANGE = new Map<string, number>([
  ['G:1:8', 2],
  ['D:1:10', 4],
  ['D:10:10', 6],
  ['D:11:38', 29],
  ['D:55:64', 53],
  ['D:119:127', 13],
  ['D:709:712', 5],
  ['D:1386:1388', 9],
  ['G:8:12', 21],
  ['G:12:13', 23],
  ['G:83:91', 86],
  ['G:133:136', 27],
  ['G:218:220', 36],
  ['G:250:262', 33],
  ['G:262:296', 31],
  ['G:300:317', 88],
  ['G:318:323', 89],
  ['G:462:475', 90],
  ['G:508:517', 91],
  ['G:548:556', 93],
  ['G:573:577', 40],
  ['G:585:594', 94],
  ['G:642:654', 95],
  ['G:663:663', 22],
  ['G:705:710', 96],
  ['G:773:774', 11],
  ['G:785:792', 97],
  ['G:849:855', 98],
  ['G:917:922', 10],
  ['G:923:924', 46],
  ['G:929:938', 35],
  ['G:938:946', 34],
  ['G:947:956', 99],
  ['G:957:966', 100],
  ['G:966:968', 101],
  ['G:1086:1094', 102],
  ['G:1193:1193', 104],
  ['G:1237:1251', 105],
  ['G:1278:1291', 106],
  ['G:1312:1318', 107],
  ['G:1361:1363', 17],
  ['G:1363:1364', 18],
  ['G:1364:1377', 77],
  ['G:1426:1429', 30],
  ['G:1429:1430', 38],
])

function buildRangeKey(source: BaniSource, startAng: number, endAng: number) {
  return `${source}:${startAng}:${endAng}`
}

export function findBoundedBaniDbId(
  source: BaniSource,
  startAng: number,
  endAng: number
): number | null {
  return BOUNDED_BANIDB_ID_BY_RANGE.get(buildRangeKey(source, startAng, endAng)) ?? null
}

export function buildStudyRouteSearchParams({
  source,
  startAng,
  endAng,
  bani,
  baniDbId,
}: {
  source: BaniSource
  startAng: number
  endAng: number
  bani: string
  baniDbId?: number | null
}): URLSearchParams {
  const params = new URLSearchParams({
    source,
    ang: String(startAng),
    startAng: String(startAng),
    endAng: String(endAng),
    bani,
  })

  if (baniDbId) {
    params.set('baniDbId', String(baniDbId))
  }

  return params
}

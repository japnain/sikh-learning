export type VocabMode = 'list' | 'flashcard' | 'review'
export type VocabFilter = 'all' | 'word' | 'phrase'
export type VocabSort = 'newest' | 'oldest'

export interface VocabViewState {
  mode: VocabMode
  query: string
  kind: VocabFilter
  sort: VocabSort
  cardIndex: number
  revealed: boolean
  reviewQueue: string[] | null
}

const RETURN_STATE_KEY = 'naamras-vocab-return-view'

/** Only this app's vocabulary query fields are accepted, never a supplied return URL. */
export function readVocabView(search: string): VocabViewState {
  const params = new URLSearchParams(search)
  const index = Number(params.get('card') ?? 0)
  const view: VocabViewState = {
    mode: params.get('mode') === 'review' ? 'review' : params.get('mode') === 'flashcard' ? 'flashcard' : 'list',
    query: (params.get('q') ?? '').slice(0, 500),
    kind: params.get('kind') === 'word' ? 'word' : params.get('kind') === 'phrase' ? 'phrase' : 'all',
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
    cardIndex: Number.isSafeInteger(index) && index >= 0 ? index : 0,
    revealed: params.get('revealed') === '1',
    reviewQueue: null,
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(RETURN_STATE_KEY) ?? 'null')
    if (saved?.path === buildVocabReturnPath(view) && Array.isArray(saved.reviewQueue)
      && saved.reviewQueue.length <= 5000 && saved.reviewQueue.every((key: unknown) => typeof key === 'string' && key.length <= 20000)) {
      view.reviewQueue = saved.reviewQueue
    }
  } catch { /* A fresh review can be built if this tab cannot keep transient state. */ }
  return view
}

export function buildVocabReturnPath(view: VocabViewState): string {
  const params = new URLSearchParams()
  if (view.query) params.set('q', view.query.slice(0, 500))
  if (view.kind !== 'all') params.set('kind', view.kind)
  if (view.sort !== 'newest') params.set('sort', view.sort)
  if (view.mode !== 'list') params.set('mode', view.mode)
  if (view.cardIndex > 0) params.set('card', String(view.cardIndex))
  if (view.revealed && view.mode !== 'list') params.set('revealed', '1')
  return `/vocab${params.size ? `?${params}` : ''}`
}

export function rememberVocabView(view: VocabViewState) {
  try {
    sessionStorage.setItem(RETURN_STATE_KEY, JSON.stringify({ path: buildVocabReturnPath(view), reviewQueue: view.reviewQueue }))
  } catch { /* The URL still preserves filters, mode, and the current flashcard. */ }
}

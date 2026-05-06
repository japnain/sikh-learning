import type { Bookmark } from '../store/bookmarks'

export async function persistBookmarkToCloud(bookmark: Bookmark) {
  void bookmark
  return { ok: false as const, skipped: true as const }
}

export async function removeBookmarkFromCloud(bookmark: Bookmark) {
  void bookmark
  return { ok: false as const, skipped: true as const }
}

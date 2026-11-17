export interface PrivateBookContentsEntry {
  id: string;
  title: string;
  assetId?: string;
  page?: number;
}

export interface PrivateBookMetadata {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  contributors?: string[];
  description: string;
  category: string;
  language: string;
  coverAssetId?: string;
  searchAssetId?: string;
  formats: string[];
  editionVersion: string;
  renderer: 'chapters' | 'pages' | 'pdf';
  contents: PrivateBookContentsEntry[];
  primaryAssetId?: string;
  pageCount?: number;
}

export interface PrivateAsset {
  id: string;
  book_id: string;
  object_key: string;
  content_type: string;
  size: number;
  checksum: string;
}

export const PRIVATE_BOOK_BUCKET = 'naamras-private-books';
export const PRIVATE_ASSET_MAX_BYTES = 128 * 1024 * 1024;
export const PRIVATE_RANGE_MAX_BYTES = 4 * 1024 * 1024;
export const PRIVATE_STATE_MAX_BYTES = 48 * 1024;
export const PRIVATE_ASSET_TYPES = new Set([
  'application/json', 'application/pdf', 'application/epub+zip',
  'image/jpeg', 'image/png', 'image/webp', 'image/avif',
]);

export function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value);
}

export function validEdition(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value);
}

function string(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length <= maximum;
}

export function isPrivateBookMetadata(value: unknown): value is PrivateBookMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const book = value as Record<string, unknown>;
  return validId(book.id) && string(book.title, 500) && book.title.length > 0
    && (book.subtitle === undefined || string(book.subtitle, 1000))
    && Array.isArray(book.authors) && book.authors.length <= 50
    && book.authors.every(author => string(author, 300))
    && (book.contributors === undefined || (Array.isArray(book.contributors) && book.contributors.length <= 50
      && book.contributors.every(contributor => string(contributor, 300))))
    && string(book.description, 10000) && string(book.category, 200)
    && string(book.language, 50) && validEdition(book.editionVersion)
    && ['chapters', 'pages', 'pdf'].includes(String(book.renderer))
    && Array.isArray(book.formats) && book.formats.length <= 10
    && book.formats.every(format => ['epub', 'pdf'].includes(String(format)))
    && (book.coverAssetId === undefined || validId(book.coverAssetId))
    && (book.searchAssetId === undefined || validId(book.searchAssetId))
    && (book.primaryAssetId === undefined || validId(book.primaryAssetId))
    && (book.pageCount === undefined || (Number.isInteger(book.pageCount) && Number(book.pageCount) > 0 && Number(book.pageCount) <= 10000))
    && Array.isArray(book.contents) && book.contents.length <= 10000
    && book.contents.every(entry => entry && typeof entry === 'object'
      && validId(entry.id) && string(entry.title, 1000)
      && (entry.assetId === undefined || validId(entry.assetId))
      && (entry.page === undefined || (Number.isInteger(entry.page) && entry.page > 0 && entry.page <= 10000)));
}

/** Whitelist client-visible fields: accidental storage keys in metadata stay server-side. */
export function publicBookFields(book: PrivateBookMetadata): PrivateBookMetadata {
  return {
    id: book.id, title: book.title, authors: book.authors, contributors: book.contributors,
    description: book.description, category: book.category, language: book.language,
    formats: book.formats, editionVersion: book.editionVersion, renderer: book.renderer,
    contents: book.contents.map(({ id, title, assetId, page }) => ({ id, title, assetId, page })),
    subtitle: book.subtitle, coverAssetId: book.coverAssetId, searchAssetId: book.searchAssetId,
    primaryAssetId: book.primaryAssetId, pageCount: book.pageCount,
  };
}

export function isPrivateAsset(asset: PrivateAsset, bookId: string, assetId: string) {
  return asset.id === assetId && asset.book_id === bookId
    && Number.isSafeInteger(asset.size) && asset.size > 0 && asset.size <= PRIVATE_ASSET_MAX_BYTES
    && PRIVATE_ASSET_TYPES.has(asset.content_type)
    && /^[a-f0-9]{64}$/.test(asset.checksum)
    && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+$/.test(asset.object_key)
    && !asset.object_key.split('/').some(part => part === '.' || part === '..');
}

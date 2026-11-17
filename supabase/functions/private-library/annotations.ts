import { validId, type PrivateBookMetadata } from './contract.ts';
import { validStateTimestamp } from './state.ts';

const MAX_ANNOTATIONS = 128;
const MAX_QUOTE = 1000;
const MAX_NOTE = 2000;
const MAX_POSITION = 1_000_000;
const COLORS = new Set(['yellow', 'green', 'blue', 'pink']);
const ROOT_KEYS = new Set(['index', 'offset', 'progress', 'completed', 'bookmarks', 'updatedAt', 'blockId', 'blockOffset', 'charOffset', 'annotations', 'annotationDeletes']);
const BOOKMARK_KEYS = new Set(['id', 'index', 'offset', 'label', 'createdAt', 'blockId', 'blockOffset', 'charOffset']);
const COMMON_ANNOTATION_KEYS = ['id', 'kind', 'index', 'createdAt', 'updatedAt'];
const TEXT_KEYS = new Set([...COMMON_ANNOTATION_KEYS, 'blockId', 'start', 'end', 'quote', 'color', 'note']);
const PAGE_KEYS = new Set([...COMMON_ANNOTATION_KEYS, 'note']);
const DELETE_KEYS = new Set(['id', 'updatedAt']);

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function onlyKeys(value: Record<string, unknown>, keys: Set<string>) {
  return Object.keys(value).every(key => keys.has(key));
}
function integer(value: unknown, maximum: number) {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum;
}
function pixel(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_POSITION;
}
function block(value: unknown) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(value);
}
function string(value: unknown, maximum: number) {
  return typeof value === 'string' && value.length <= maximum;
}
function optionalLocator(value: Record<string, unknown>) {
  return (value.blockId === undefined || block(value.blockId))
    && (value.blockOffset === undefined || pixel(value.blockOffset))
    && (value.charOffset === undefined || integer(value.charOffset, MAX_POSITION));
}

/** A closed schema keeps source data, URLs and unbounded nested values out of state. */
export function validPrivateReadingState(value: unknown, currentBook?: PrivateBookMetadata): value is Record<string, unknown> {
  if (!object(value) || !onlyKeys(value, ROOT_KEYS) || !optionalLocator(value)) return false;
  // Older editions remain readable without comparing them to today's chapter count.
  const count = currentBook?.renderer === 'pdf' ? currentBook.pageCount : currentBook?.contents.length;
  const lastIndex = count && count > 0 ? Math.min(9999, count - 1) : 9999;
  if ((value.index !== undefined && !integer(value.index, lastIndex))
    || (value.offset !== undefined && !pixel(value.offset))
    || (value.progress !== undefined && (typeof value.progress !== 'number' || !Number.isFinite(value.progress) || value.progress < 0 || value.progress > 1))
    || (value.completed !== undefined && typeof value.completed !== 'boolean')
    || (value.updatedAt !== undefined && !validStateTimestamp(value.updatedAt))) return false;
  if (value.bookmarks !== undefined) {
    if (!Array.isArray(value.bookmarks) || value.bookmarks.length > 200) return false;
    const ids = new Set<string>();
    for (const mark of value.bookmarks) {
      if (!object(mark) || !onlyKeys(mark, BOOKMARK_KEYS) || !validId(mark.id) || ids.has(mark.id)
        || !integer(mark.index, lastIndex) || !pixel(mark.offset) || !string(mark.label, 1000)
        || !validStateTimestamp(mark.createdAt) || !optionalLocator(mark)) return false;
      ids.add(mark.id);
    }
  }
  if (value.annotations !== undefined && (!Array.isArray(value.annotations) || value.annotations.length > MAX_ANNOTATIONS)) return false;
  const ids = new Set<string>();
  for (const annotation of (value.annotations ?? []) as unknown[]) {
    if (!object(annotation) || !validId(annotation.id) || ids.has(annotation.id)
      || !integer(annotation.index, lastIndex) || !validStateTimestamp(annotation.createdAt)
      || !validStateTimestamp(annotation.updatedAt) || annotation.updatedAt < annotation.createdAt) return false;
    ids.add(annotation.id);
    if (annotation.kind === 'text') {
      if (!onlyKeys(annotation, TEXT_KEYS) || (currentBook && currentBook.renderer !== 'chapters')
        || !block(annotation.blockId) || !integer(annotation.start, MAX_POSITION)
        || !integer(annotation.end, MAX_POSITION) || Number(annotation.end) <= Number(annotation.start)
        || typeof annotation.quote !== 'string' || annotation.quote.trim().length === 0 || annotation.quote.length > MAX_QUOTE
        || Number(annotation.end) - Number(annotation.start) !== annotation.quote.length
        || typeof annotation.color !== 'string' || !COLORS.has(annotation.color)
        || (annotation.note !== undefined && !string(annotation.note, MAX_NOTE))) return false;
    } else if (annotation.kind === 'page') {
      if (!onlyKeys(annotation, PAGE_KEYS) || typeof annotation.note !== 'string'
        || annotation.note.trim().length === 0 || annotation.note.length > MAX_NOTE) return false;
    } else return false;
  }
  if (value.annotationDeletes !== undefined) {
    if (!Array.isArray(value.annotationDeletes) || value.annotationDeletes.length > MAX_ANNOTATIONS) return false;
    for (const deleted of value.annotationDeletes) {
      if (!object(deleted) || !onlyKeys(deleted, DELETE_KEYS) || !validId(deleted.id)
        || ids.has(deleted.id) || !validStateTimestamp(deleted.updatedAt)) return false;
      ids.add(deleted.id);
    }
  }
  return true;
}

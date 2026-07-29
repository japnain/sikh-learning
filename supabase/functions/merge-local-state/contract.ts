export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json | undefined };

export const CLOUD_SNAPSHOT_VERSION = 2 as const;

type JsonObject = Record<string, Json | undefined>;
type RecordType = "profile" | "saved-item" | "vocab-entry" | "learning-progress";

export interface ParsedMergeSnapshot {
  version: 2;
  deviceId: string;
  profile: JsonObject;
  savedItems: JsonObject[];
  vocabEntries: JsonObject[];
  learningProgress: JsonObject[];
  activityEvents: JsonObject[];
}

export interface DatabaseSyncRecord {
  record_type: RecordType;
  natural_key: string;
  record_id: string;
  device_id: string;
  client_updated_at: string;
  base_updated_at: string | null;
  deleted_at: string | null;
  review_due_at: string | null;
  record: JsonObject;
}

export interface RemoteSnapshotV2 {
  version: 2;
  generatedAt: string;
  profile: JsonObject;
  savedItems: JsonObject[];
  vocabEntries: JsonObject[];
  learningProgress: JsonObject[];
  activityEvents: JsonObject[];
}

export class SnapshotValidationError extends Error {
  readonly code = "invalid-cloud-snapshot";

  constructor(message: string) {
    super(message);
    this.name = "SnapshotValidationError";
  }
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function requireObject(value: unknown, path: string): JsonObject {
  if (!isObject(value)) {
    throw new SnapshotValidationError(`${path} must be an object.`);
  }
  return value;
}

function requireArray(value: unknown, path: string): JsonObject[] {
  if (!Array.isArray(value) || !value.every(isObject)) {
    throw new SnapshotValidationError(`${path} must be an array of objects.`);
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new SnapshotValidationError(`${path} must be a non-empty string.`);
  }
  return value;
}

function optionalTimestamp(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (!isTimestamp(value)) {
    throw new SnapshotValidationError(`${path} must be null or an ISO timestamp.`);
  }
  return value;
}

function validateMetadata(record: JsonObject, path: string) {
  requireString(record.id, `${path}.id`);
  requireString(record.deviceId, `${path}.deviceId`);
  if (!isTimestamp(record.clientUpdatedAt)) {
    throw new SnapshotValidationError(`${path}.clientUpdatedAt must be an ISO timestamp.`);
  }
  optionalTimestamp(record.baseUpdatedAt, `${path}.baseUpdatedAt`);
  optionalTimestamp(record.deletedAt, `${path}.deletedAt`);
}

function validateProfile(record: JsonObject) {
  validateMetadata(record, "snapshot.profile");
  if (record.deletedAt !== null) {
    throw new SnapshotValidationError("snapshot.profile cannot be deleted.");
  }
  requireString(record.locale, "snapshot.profile.locale");
  requireObject(record.reader, "snapshot.profile.reader");
  requireObject(record.onboarding, "snapshot.profile.onboarding");
}

function validateSavedItem(record: JsonObject, index: number) {
  const path = `snapshot.savedItems[${index}]`;
  validateMetadata(record, path);
  if (record.kind !== "bookmark" && record.kind !== "favorite") {
    throw new SnapshotValidationError(`${path}.kind must be bookmark or favorite.`);
  }
  requireString(record.naturalKey, `${path}.naturalKey`);
  if (record.deletedAt === null) {
    requireObject(record.payload, `${path}.payload`);
  } else if (record.payload !== null) {
    throw new SnapshotValidationError(`${path}.payload must be null for a tombstone.`);
  }
}

function validateVocabEntry(record: JsonObject, index: number) {
  const path = `snapshot.vocabEntries[${index}]`;
  validateMetadata(record, path);
  requireString(record.naturalKey, `${path}.naturalKey`);
  if (record.deletedAt === null) {
    const payload = requireObject(record.payload, `${path}.payload`);
    requireString(payload.word, `${path}.payload.word`);
    if (payload.kind !== undefined && payload.kind !== "word" && payload.kind !== "phrase") {
      throw new SnapshotValidationError(`${path}.payload.kind must be word or phrase.`);
    }
  } else if (record.payload !== null) {
    throw new SnapshotValidationError(`${path}.payload must be null for a tombstone.`);
  }
}

function validateReadingProgressPayload(payload: JsonObject, path: string) {
  const progress = requireObject(payload.progress, `${path}.progress`);
  for (const [baniId, completedAngs] of Object.entries(progress)) {
    if (
      !Array.isArray(completedAngs)
      || !completedAngs.every(value => (
        typeof value === "number"
        && Number.isInteger(value)
        && value > 0
      ))
    ) {
      throw new SnapshotValidationError(`${path}.progress.${baniId} must be an array of positive Ang integers.`);
    }
  }
}

function validateLearningProgress(record: JsonObject, index: number) {
  const path = `snapshot.learningProgress[${index}]`;
  validateMetadata(record, path);
  if (
    record.scope !== "study-progress"
    && record.scope !== "reading-progress"
    && record.scope !== "nitnem-state"
  ) {
    throw new SnapshotValidationError(`${path}.scope is unsupported.`);
  }
  if (record.deletedAt !== null) {
    throw new SnapshotValidationError(`${path} cannot be deleted.`);
  }
  const payload = requireObject(record.payload, `${path}.payload`);
  if (record.scope === "reading-progress") {
    validateReadingProgressPayload(payload, `${path}.payload`);
  }
}

function validateActivityEvent(record: JsonObject, index: number) {
  const path = `snapshot.activityEvents[${index}]`;
  requireString(record.id, `${path}.id`);
  requireString(record.deviceId, `${path}.deviceId`);
  requireString(record.eventType, `${path}.eventType`);
  if (!isTimestamp(record.occurredAt)) {
    throw new SnapshotValidationError(`${path}.occurredAt must be an ISO timestamp.`);
  }
  if (!isTimestamp(record.clientUpdatedAt)) {
    throw new SnapshotValidationError(`${path}.clientUpdatedAt must be an ISO timestamp.`);
  }
  optionalTimestamp(record.deletedAt, `${path}.deletedAt`);
  requireObject(record.payload, `${path}.payload`);
}

function compareRecords(left: JsonObject, right: JsonObject) {
  const leftUpdatedAt = Date.parse(String(left.clientUpdatedAt));
  const rightUpdatedAt = Date.parse(String(right.clientUpdatedAt));
  if (leftUpdatedAt !== rightUpdatedAt) return leftUpdatedAt - rightUpdatedAt;

  const leftDeleted = left.deletedAt === null ? 0 : 1;
  const rightDeleted = right.deletedAt === null ? 0 : 1;
  if (leftDeleted !== rightDeleted) return leftDeleted - rightDeleted;

  return String(left.deviceId).localeCompare(String(right.deviceId));
}

function dedupeRecords(
  records: JsonObject[],
  keyFor: (record: JsonObject) => string
) {
  const deduped = new Map<string, JsonObject>();
  for (const record of records) {
    const key = keyFor(record);
    const current = deduped.get(key);
    if (!current || compareRecords(current, record) <= 0) {
      deduped.set(key, record);
    }
  }
  return [...deduped.values()];
}

export function parseMergeSnapshot(value: unknown): ParsedMergeSnapshot {
  const body = requireObject(value, "snapshot");
  if (body.version !== CLOUD_SNAPSHOT_VERSION) {
    throw new SnapshotValidationError(`snapshot.version must be ${CLOUD_SNAPSHOT_VERSION}.`);
  }

  const deviceId = requireString(body.deviceId, "snapshot.deviceId");
  const profile = requireObject(body.profile, "snapshot.profile");
  const savedItems = requireArray(body.savedItems, "snapshot.savedItems");
  const vocabEntries = requireArray(body.vocabEntries, "snapshot.vocabEntries");
  const learningProgress = requireArray(body.learningProgress, "snapshot.learningProgress");
  const activityEvents = requireArray(body.activityEvents, "snapshot.activityEvents");

  validateProfile(profile);
  savedItems.forEach(validateSavedItem);
  vocabEntries.forEach(validateVocabEntry);
  learningProgress.forEach(validateLearningProgress);
  activityEvents.forEach(validateActivityEvent);

  return {
    version: CLOUD_SNAPSHOT_VERSION,
    deviceId,
    profile,
    savedItems: dedupeRecords(savedItems, record => `${record.kind}:${record.naturalKey}`),
    vocabEntries: dedupeRecords(vocabEntries, record => String(record.naturalKey)),
    learningProgress: dedupeRecords(learningProgress, record => String(record.scope)),
    activityEvents: dedupeRecords(activityEvents, record => String(record.id)),
  };
}

function withServerUser(record: JsonObject, userId: string) {
  return {
    ...record,
    userId,
  } satisfies JsonObject;
}

function reviewDueAt(record: JsonObject) {
  if (record.deletedAt !== null) return null;
  const payload = isObject(record.payload) ? record.payload : null;
  const review = payload && isObject(payload.review) ? payload.review : null;
  return review && isTimestamp(review.dueAt) ? review.dueAt : null;
}

function databaseRecord(
  recordType: RecordType,
  naturalKey: string,
  record: JsonObject,
  userId: string
): DatabaseSyncRecord {
  const normalizedRecord = withServerUser(record, userId);
  return {
    record_type: recordType,
    natural_key: naturalKey,
    record_id: requireString(record.id, `${recordType}.id`),
    device_id: requireString(record.deviceId, `${recordType}.deviceId`),
    client_updated_at: String(record.clientUpdatedAt),
    base_updated_at: record.baseUpdatedAt === null ? null : String(record.baseUpdatedAt),
    deleted_at: record.deletedAt === null ? null : String(record.deletedAt),
    review_due_at: recordType === "vocab-entry" ? reviewDueAt(record) : null,
    record: normalizedRecord,
  };
}

export function toDatabaseSyncRecords(
  snapshot: ParsedMergeSnapshot,
  userId: string
): DatabaseSyncRecord[] {
  return [
    databaseRecord("profile", "profile", snapshot.profile, userId),
    ...snapshot.savedItems.map(record => databaseRecord(
      "saved-item",
      String(record.naturalKey),
      record,
      userId
    )),
    ...snapshot.vocabEntries.map(record => databaseRecord(
      "vocab-entry",
      String(record.naturalKey),
      record,
      userId
    )),
    ...snapshot.learningProgress.map(record => databaseRecord(
      "learning-progress",
      String(record.scope),
      record,
      userId
    )),
  ];
}

export function normalizeActivityEvents(
  snapshot: ParsedMergeSnapshot,
  userId: string
) {
  return snapshot.activityEvents.map(event => withServerUser(event, userId));
}

function validateRemoteRecord(record: JsonObject, index: number) {
  const recordType = record.recordType;
  const normalized = { ...record };
  delete normalized.recordType;

  if (recordType === "profile") {
    validateProfile(normalized);
  } else if (recordType === "saved-item") {
    validateSavedItem(normalized, index);
  } else if (recordType === "vocab-entry") {
    validateVocabEntry(normalized, index);
  } else if (recordType === "learning-progress") {
    validateLearningProgress(normalized, index);
  } else {
    throw new SnapshotValidationError(`remote.records[${index}].recordType is unsupported.`);
  }

  return { recordType, record: normalized };
}

export function buildRemoteSnapshot(
  records: unknown,
  generatedAt: string
): RemoteSnapshotV2 {
  if (!isTimestamp(generatedAt)) {
    throw new SnapshotValidationError("remote.generatedAt must be an ISO timestamp.");
  }
  if (!Array.isArray(records) || !records.every(isObject)) {
    throw new SnapshotValidationError("remote.records must be an array of objects.");
  }

  let profile: JsonObject | null = null;
  const savedItems: JsonObject[] = [];
  const vocabEntries: JsonObject[] = [];
  const learningProgress: JsonObject[] = [];

  records.forEach((candidate, index) => {
    const { recordType, record } = validateRemoteRecord(candidate, index);
    if (recordType === "profile") profile = record;
    if (recordType === "saved-item") savedItems.push(record);
    if (recordType === "vocab-entry") vocabEntries.push(record);
    if (recordType === "learning-progress") learningProgress.push(record);
  });

  if (!profile) {
    throw new SnapshotValidationError("remote.records did not contain a profile.");
  }

  return {
    version: CLOUD_SNAPSHOT_VERSION,
    generatedAt,
    profile,
    savedItems,
    vocabEntries,
    learningProgress,
    activityEvents: [],
  };
}

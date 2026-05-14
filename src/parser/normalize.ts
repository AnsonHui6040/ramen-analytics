import { z } from "zod";
import { hashString, stableStringify } from "@/parser/hash";
import { createIssue } from "@/validation/issues";
import type { JsonRecord, ParsedEvent, ValidationIssue } from "@/types/events";

const csvRowSchema = z.record(z.unknown());

const EVENT_TYPE_KEYS = ["eventType", "event_type", "event", "eventName", "event_name", "type", "name"];
const QUIZ_RUN_ID_KEYS = ["quizRunId", "quiz_run_id", "runId", "run_id", "quiz_run", "run"];
const SESSION_ID_KEYS = ["sessionId", "session_id", "session", "anonymousId", "anonymous_id"];
const TIMESTAMP_KEYS = ["timestamp", "createdAt", "created_at", "eventTime", "event_time", "time", "date"];
const APP_VERSION_KEYS = ["appVersion", "app_version", "version", "buildVersion", "build_version"];
const SOURCE_KEYS = ["source", "origin", "channel", "env", "environment"];
const PAGE_KEYS = ["page", "pagePath", "page_path", "path", "pathname", "urlPath", "url_path"];
const SCHEMA_VERSION_KEYS = ["schemaVersion", "schema_version", "eventSchemaVersion", "event_schema_version"];
const QUESTIONNAIRE_VERSION_KEYS = [
  "questionnaireVersion",
  "questionnaire_version",
  "questionSetVersion",
  "question_set_version"
];
const RESULT_VERSION_KEYS = ["resultVersion", "result_version", "scoringVersion", "scoring_version"];

export interface NormalizeContext {
  fileName: string;
  rowNumber: number;
}

export interface NormalizeResult {
  event?: ParsedEvent;
  issues: ValidationIssue[];
  malformed: boolean;
}

export function normalizeCsvRow(rowInput: unknown, context: NormalizeContext): NormalizeResult {
  const rowResult = csvRowSchema.safeParse(rowInput);
  if (!rowResult.success) {
    return {
      malformed: true,
      issues: [
        createIssue({
          severity: "error",
          category: "missing_required_field",
          message: "CSV row is not an object",
          fileName: context.fileName,
          rowNumber: context.rowNumber
        })
      ]
    };
  }

  const row = unwrapDynamoDbRecord(rowResult.data);
  const issues: ValidationIssue[] = [];
  const payloadParse = parseJsonField(pickDirect(row, ["payload"]), "payload", context);
  const rawParse = parseJsonField(pickDirect(row, ["rawEvent", "raw_event", "eventJson", "event_json"]), "rawEvent", context);
  issues.push(...payloadParse.issues, ...rawParse.issues);

  const rawEvent = toRecord(rawParse.value);
  const rawEventPayload = parseNestedPayload(rawEvent?.payload, context);
  issues.push(...rawEventPayload.issues);

  const payload = mergePayloads(
    buildFlattenedPayload(row),
    payloadParse.value ?? rawEventPayload.value ?? getRecord(rawEvent, "payload")
  );
  const payloadRecord = toRecord(payload);
  const rawEventRecord = rawEvent;
  const nestedEvent = toRecord(rawEventRecord?.event);

  const eventType = coerceString(
    pickAny(EVENT_TYPE_KEYS, row, payloadRecord, rawEventRecord, nestedEvent, toRecord(rawEventRecord?.context))
  );
  const rawQuizRunId = coerceString(
    pickAny(QUIZ_RUN_ID_KEYS, row, payloadRecord, rawEventRecord, nestedEvent, toRecord(rawEventRecord?.context))
  );
  const rawSessionId = coerceString(
    pickAny(SESSION_ID_KEYS, row, payloadRecord, rawEventRecord, nestedEvent, toRecord(rawEventRecord?.context))
  );
  const appVersion =
    coerceString(pickAny(APP_VERSION_KEYS, row, payloadRecord, rawEventRecord, nestedEvent)) || "unknown";
  const source =
    coerceString(pickAny(SOURCE_KEYS, row, payloadRecord, rawEventRecord, nestedEvent)) || "unknown";
  const pagePath = coerceString(pickAny(PAGE_KEYS, row, payloadRecord, rawEventRecord, nestedEvent));
  const schemaVersion =
    coerceString(pickAny(SCHEMA_VERSION_KEYS, row, payloadRecord, rawEventRecord, nestedEvent)) || "unknown";
  const questionnaireVersion =
    coerceString(pickAny(QUESTIONNAIRE_VERSION_KEYS, row, payloadRecord, rawEventRecord, nestedEvent)) || "unknown";
  const resultVersion =
    coerceString(pickAny(RESULT_VERSION_KEYS, row, payloadRecord, rawEventRecord, nestedEvent)) || "unknown";
  const timestamp = normalizeTimestamp(pickAny(TIMESTAMP_KEYS, row, payloadRecord, rawEventRecord, nestedEvent));

  const quizRunIdHash = rawQuizRunId
    ? hashString(rawQuizRunId, "run")
    : hashString(`${context.fileName}:${context.rowNumber}:missing-run`, "run");
  const sessionIdHash = rawSessionId ? hashString(rawSessionId, "session") : undefined;

  if (!rawQuizRunId) {
    issues.push(
      createIssue({
        severity: "error",
        category: "missing_quiz_run_id",
        message: "Missing quizRunId; row was isolated into a synthetic hashed run",
        fileName: context.fileName,
        rowNumber: context.rowNumber,
        runIdHash: quizRunIdHash,
        eventType: eventType || "unknown",
        field: "quizRunId"
      })
    );
  }

  if (!eventType) {
    issues.push(
      createIssue({
        severity: "error",
        category: "missing_required_field",
        message: "Missing eventType",
        fileName: context.fileName,
        rowNumber: context.rowNumber,
        runIdHash: quizRunIdHash,
        field: "eventType"
      })
    );
  }

  const canonicalEventType = normalizeEventType(eventType);
  const eventIdHash = hashString(
    `${context.fileName}:${context.rowNumber}:${quizRunIdHash}:${canonicalEventType}:${timestamp ?? ""}`,
    "event"
  );
  const fingerprintHash = hashString(
    `${quizRunIdHash}:${canonicalEventType}:${stableStringify(payload ?? row)}`,
    "fp"
  );

  const event: ParsedEvent = {
    eventIdHash,
    fingerprintHash,
    quizRunIdHash,
    sessionIdHash,
    fileName: context.fileName,
    rowNumber: context.rowNumber,
    eventType: canonicalEventType || "unknown",
    timestamp,
    appVersion,
    source,
    pagePath: pagePath || undefined,
    schemaVersion,
    questionnaireVersion,
    resultVersion,
    isLoadTest: detectLoadTest({
      row,
      payload: payloadRecord,
      rawEvent: rawEventRecord,
      quizRunId: rawQuizRunId,
      sessionId: rawSessionId,
      source,
      appVersion
    }),
    payload,
    rawEvent: rawParse.value
  };

  return {
    event,
    issues: issues.map((issue) => ({
      ...issue,
      runIdHash: issue.runIdHash ?? quizRunIdHash,
      eventType: issue.eventType ?? event.eventType
    })),
    malformed: issues.some((issue) => issue.category === "malformed_json")
  };
}

function unwrapDynamoDbRecord(record: JsonRecord) {
  const output: JsonRecord = {};
  for (const [key, value] of Object.entries(record)) {
    output[key] = unwrapDynamoDbValue(value);
  }
  return output;
}

function unwrapDynamoDbValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return value;
    try {
      return unwrapDynamoDbValue(JSON.parse(trimmed));
    } catch {
      return value;
    }
  }

  const record = toRecord(value);
  if (!record) return value;

  const keys = Object.keys(record);
  if (keys.length === 1) {
    if ("S" in record) return record.S;
    if ("N" in record) {
      const number = Number(record.N);
      return Number.isFinite(number) ? number : record.N;
    }
    if ("BOOL" in record) return Boolean(record.BOOL);
    if ("NULL" in record) return null;
    if ("M" in record) return unwrapDynamoDbRecord(toRecord(record.M) ?? {});
    if ("L" in record && Array.isArray(record.L)) return record.L.map(unwrapDynamoDbValue);
  }

  const output: JsonRecord = {};
  for (const [key, item] of Object.entries(record)) {
    output[key] = unwrapDynamoDbValue(item);
  }
  return output;
}

function buildFlattenedPayload(row: JsonRecord) {
  const payloadKeys = [
    "quizRunId",
    "quiz_run_id",
    "questionId",
    "question_id",
    "questionStage",
    "question_stage",
    "questionText",
    "question_text",
    "leftLabel",
    "left_label",
    "rightLabel",
    "right_label",
    "answerValue",
    "answer_value",
    "answerLabel",
    "answer_label",
    "answerDirection",
    "answer_direction",
    "questionIndex",
    "question_index",
    "isFinalSnapshot",
    "is_final_snapshot",
    "answerCount",
    "answer_count",
    "answersLength",
    "answers_length",
    "schemaVersion",
    "schema_version",
    "questionnaireVersion",
    "questionnaire_version",
    "resultVersion",
    "result_version",
    "typeCode",
    "type_code",
    "typeName",
    "type_name",
    "archetypeCode",
    "archetype_code",
    "archetypeName",
    "archetype_name",
    "mainCategory",
    "main_category",
    "subCategory",
    "sub_category",
    "topShare",
    "top_share",
    "secondShare",
    "second_share",
    "borderlineCode",
    "borderline_code",
    "borderlineName",
    "borderline_name",
    "borderlineDistance",
    "borderline_distance",
    "borderlineStrength",
    "borderline_strength",
    "confidenceScore",
    "confidence_score",
    "reasonTop4",
    "reason_top_4",
    "scoreBreakdown",
    "score_breakdown",
    "axes",
    "topFlavorTags",
    "top_flavor_tags",
    "flavorTags",
    "flavor_tags",
    "allergenWarnings",
    "allergen_warnings",
    "recommendationSummary",
    "recommendation_summary",
    "rating",
    "comment",
    "feedback",
    "message",
    "submittedAt",
    "submitted_at",
    "answeredAt",
    "answered_at",
    "startedAt",
    "started_at",
    "resultGeneratedAt",
    "result_generated_at",
    "snapshotGeneratedAt",
    "snapshot_generated_at",
    "locale",
    "testMode",
    "test_mode",
    "loadTestId",
    "load_test_id",
    "isLoadTest",
    "is_load_test"
  ];

  const payload: JsonRecord = {};
  for (const key of payloadKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") payload[key] = row[key];
  }
  return payload;
}

function mergePayloads(flattenedPayload: JsonRecord, parsedPayload: unknown) {
  const parsedRecord = toRecord(parsedPayload);
  if (parsedRecord) return { ...flattenedPayload, ...parsedRecord };
  if (parsedPayload !== undefined) return parsedPayload;
  return Object.keys(flattenedPayload).length ? flattenedPayload : undefined;
}

function parseNestedPayload(value: unknown, context: NormalizeContext) {
  if (typeof value !== "string") {
    return { value, issues: [] as ValidationIssue[] };
  }
  return parseJsonField(value, "rawEvent.payload", context);
}

function parseJsonField(value: unknown, field: string, context: NormalizeContext) {
  const issues: ValidationIssue[] = [];
  if (value === undefined || value === null || value === "") return { value: undefined, issues };
  if (typeof value !== "string") return { value, issues };

  const trimmed = value.trim();
  if (!trimmed) return { value: undefined, issues };

  const candidates = buildJsonCandidates(trimmed);
  let lastError = "unknown error";

  for (const candidate of candidates) {
    try {
      let parsed: unknown = JSON.parse(candidate);
      for (let depth = 0; depth < 2; depth += 1) {
        if (typeof parsed !== "string" || !/^[\[{]/.test(parsed.trim())) break;
        parsed = JSON.parse(parsed);
      }
      return { value: parsed, issues };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown error";
    }
  }

  issues.push(
    createIssue({
      severity: "error",
      category: "malformed_json",
      message: `Malformed JSON in ${field}: ${lastError}`,
      fileName: context.fileName,
      rowNumber: context.rowNumber,
      field
    })
  );
  return { value: undefined, issues };
}

function buildJsonCandidates(value: string) {
  const candidates = new Set<string>();
  candidates.add(value);

  const stripped = stripWrappingQuotes(value);
  candidates.add(stripped);
  candidates.add(stripped.replaceAll("\"\"", "\""));

  const quoteFixed = value.replaceAll("\"\"", "\"");
  candidates.add(quoteFixed);
  candidates.add(stripWrappingQuotes(quoteFixed));

  return Array.from(candidates).filter(Boolean);
}

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function pickDirect(row: JsonRecord, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return undefined;
}

function pickAny(keys: string[], ...records: Array<JsonRecord | undefined | null>) {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const direct = record[key];
      if (direct !== undefined && direct !== null && direct !== "") return direct;
      const lower = record[key.toLowerCase()];
      if (lower !== undefined && lower !== null && lower !== "") return lower;
    }
  }
  return undefined;
}

function getRecord(record: JsonRecord | undefined, key: string) {
  const value = record?.[key];
  return toRecord(value) ?? value;
}

function toRecord(value: unknown): JsonRecord | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as JsonRecord;
  return undefined;
}

function coerceString(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeEventType(eventType: string) {
  const normalized = eventType.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (normalized === "question_answered") return "question_answer";
  if (normalized === "answer") return "question_answer";
  return normalized;
}

function normalizeTimestamp(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  const text = String(value).trim();
  if (/^\d+$/.test(text)) {
    const number = Number(text);
    const ms = number > 10_000_000_000 ? number : number * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function detectLoadTest({
  row,
  payload,
  rawEvent,
  quizRunId,
  sessionId,
  source,
  appVersion
}: {
  row: JsonRecord;
  payload?: JsonRecord;
  rawEvent?: JsonRecord;
  quizRunId: string;
  sessionId: string;
  source: string;
  appVersion: string;
}) {
  const explicitFlags = [
    "isLoadTest",
    "loadTest",
    "load_test",
    "testMode",
    "test_mode",
    "isSynthetic",
    "synthetic",
    "stressTest",
    "stress_test"
  ];
  const records = [row, payload, rawEvent, toRecord(rawEvent?.context)];
  if (
    records.some((record) =>
      explicitFlags.some((flag) => {
        const value = record?.[flag];
        return value === true || value === "true" || value === "1" || value === 1;
      })
    )
  ) {
    return true;
  }

  const haystack = [source, appVersion, quizRunId, sessionId, coerceString(payload?.source), coerceString(rawEvent?.source)]
    .join(" ")
    .toLowerCase();
  return /(load[-_\s]?test|stress[-_\s]?test|synthetic|artillery|locust|k6|test-run)/i.test(haystack);
}

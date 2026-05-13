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

  const row = rowResult.data;
  const issues: ValidationIssue[] = [];
  const payloadParse = parseJsonField(pickDirect(row, ["payload"]), "payload", context);
  const rawParse = parseJsonField(pickDirect(row, ["rawEvent", "raw_event", "eventJson", "event_json"]), "rawEvent", context);
  issues.push(...payloadParse.issues, ...rawParse.issues);

  const rawEvent = toRecord(rawParse.value);
  const rawEventPayload = parseNestedPayload(rawEvent?.payload, context);
  issues.push(...rawEventPayload.issues);

  const payload = payloadParse.value ?? rawEventPayload.value ?? getRecord(rawEvent, "payload");
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

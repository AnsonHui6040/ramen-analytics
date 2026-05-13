import { AXIS_KEYS, type AxisKey, type AxisValues, type ClientEvent, type FeedbackEntry, type IssueCategory, type NormalizedAnswer, type ParsedEvent, type QuizRunSummary, type ValidationIssue } from "@/types/events";
import { QUESTION_AXIS_MAP, QUESTIONNAIRE_EXPECTED_ANSWER_COUNT } from "@/analytics/questionnaire-baseline";
import { hashString } from "@/parser/hash";
import { createIssue } from "@/validation/issues";

const INVALID_FOR_COMPLETION = new Set<IssueCategory>([
  "malformed_json",
  "missing_quiz_run_id",
  "duplicate_answer_snapshot",
  "duplicate_quiz_result",
  "invalid_axis_values",
  "incomplete_quiz_run",
  "answer_count_mismatch",
  "answers_length_mismatch",
  "questionnaire_count_mismatch",
  "missing_required_field"
]);

export function buildAnalytics(
  events: ParsedEvent[],
  parseIssues: ValidationIssue[],
  exposeComments: boolean
) {
  const issues: ValidationIssue[] = [...parseIssues];
  const eventsByRun = new Map<string, ParsedEvent[]>();
  for (const event of events) {
    const bucket = eventsByRun.get(event.quizRunIdHash) ?? [];
    bucket.push(event);
    eventsByRun.set(event.quizRunIdHash, bucket);
  }

  const runs: QuizRunSummary[] = [];

  for (const [quizRunIdHash, runEvents] of eventsByRun) {
    runEvents.sort(compareEventOrder);
    const runIssues: ValidationIssue[] = issues.filter((issue) => issue.runIdHash === quizRunIdHash);
    const firstEvent = runEvents[0];
    const appVersion = firstNonUnknown(runEvents.map((event) => event.appVersion));
    const source = firstNonUnknown(runEvents.map((event) => event.source));
    const eventTypes = Array.from(new Set(runEvents.map((event) => event.eventType))).sort();
    const isLoadTest = runEvents.some((event) => event.isLoadTest);
    const hasStarted = runEvents.some((event) => event.eventType === "quiz_started");
    const answerSnapshots = runEvents.filter((event) => event.eventType === "answer_snapshot");
    const quizResults = runEvents.filter((event) => event.eventType === "quiz_result");
    const feedbackEvents = runEvents.filter((event) => event.eventType === "feedback");
    const fingerprintCounts = countBy(runEvents, (event) => event.fingerprintHash);
    const duplicateEventCount = Array.from(fingerprintCounts.values()).reduce(
      (sum, count) => sum + Math.max(0, count - 1),
      0
    );

    if (duplicateEventCount > 0) {
      runIssues.push(
        createIssue({
          severity: "warning",
          category: "duplicate_event",
          message: `${duplicateEventCount} duplicate event row(s) detected in this quiz run`,
          fileName: firstEvent?.fileName,
          rowNumber: firstEvent?.rowNumber,
          runIdHash: quizRunIdHash
        })
      );
    }

    if (answerSnapshots.length > 1) {
      runIssues.push(
        createIssue({
          severity: "error",
          category: "duplicate_answer_snapshot",
          message: `${answerSnapshots.length} answer_snapshot events found; expected exactly one`,
          fileName: answerSnapshots[1]?.fileName,
          rowNumber: answerSnapshots[1]?.rowNumber,
          runIdHash: quizRunIdHash,
          eventType: "answer_snapshot"
        })
      );
    }

    if (quizResults.length > 1) {
      runIssues.push(
        createIssue({
          severity: "error",
          category: "duplicate_quiz_result",
          message: `${quizResults.length} quiz_result events found; expected at most one`,
          fileName: quizResults[1]?.fileName,
          rowNumber: quizResults[1]?.rowNumber,
          runIdHash: quizRunIdHash,
          eventType: "quiz_result"
        })
      );
    }

    const answerSnapshot = answerSnapshots.at(-1);
    const quizResult = quizResults.at(-1);
    const answers = answerSnapshot ? extractAnswers(answerSnapshot) : [];
    const resultPayload = quizResult?.payload ?? getRecord(answerSnapshot?.payload, "result");
    const typeInfo = extractTypeInfo(resultPayload, answerSnapshot?.payload);
    const axes = extractAxes(resultPayload, answerSnapshot?.payload);
    const feedbacks = feedbackEvents.map((event, index) => extractFeedback(event, index, exposeComments));
    const expectedAnswerCount = extractExpectedAnswerCount(answerSnapshot?.payload, resultPayload);
    const explicitAnswersLength = extractExplicitAnswersLength(answerSnapshot?.payload, resultPayload);

    const invalidAxes = AXIS_KEYS.filter((axis) => {
      const value = axes[axis];
      return value !== null && (!Number.isFinite(value) || value < 0 || value > 100);
    });
    if (invalidAxes.length > 0) {
      runIssues.push(
        createIssue({
          severity: "error",
          category: "invalid_axis_values",
          message: `Invalid axis values: ${invalidAxes.join(", ")}`,
          fileName: quizResult?.fileName ?? answerSnapshot?.fileName,
          rowNumber: quizResult?.rowNumber ?? answerSnapshot?.rowNumber,
          runIdHash: quizRunIdHash,
          eventType: quizResult?.eventType ?? answerSnapshot?.eventType,
          field: "axes"
        })
      );
    }

    if (expectedAnswerCount !== null && expectedAnswerCount !== answers.length) {
      runIssues.push(
        createIssue({
          severity: "error",
          category: "answer_count_mismatch",
          message: `answerCount is ${expectedAnswerCount}, but payload.answers contains ${answers.length}`,
          fileName: answerSnapshot?.fileName,
          rowNumber: answerSnapshot?.rowNumber,
          runIdHash: quizRunIdHash,
          eventType: "answer_snapshot",
          field: "answerCount"
        })
      );
    }

    if (explicitAnswersLength !== null && explicitAnswersLength !== answers.length) {
      runIssues.push(
        createIssue({
          severity: "error",
          category: "answers_length_mismatch",
          message: `answers.length metadata is ${explicitAnswersLength}, but payload.answers contains ${answers.length}`,
          fileName: answerSnapshot?.fileName,
          rowNumber: answerSnapshot?.rowNumber,
          runIdHash: quizRunIdHash,
          eventType: "answer_snapshot",
          field: "answers.length"
        })
      );
    }

    if (answerSnapshot && answers.length !== QUESTIONNAIRE_EXPECTED_ANSWER_COUNT) {
      runIssues.push(
        createIssue({
          severity: "error",
          category: "questionnaire_count_mismatch",
          message: `Questionnaire baseline expects ${QUESTIONNAIRE_EXPECTED_ANSWER_COUNT} answers, but payload.answers contains ${answers.length}`,
          fileName: answerSnapshot.fileName,
          rowNumber: answerSnapshot.rowNumber,
          runIdHash: quizRunIdHash,
          eventType: "answer_snapshot",
          field: "payload.answers"
        })
      );
    }

    if (!answerSnapshot || !quizResult) {
      const missing = [!answerSnapshot ? "answer_snapshot" : "", !quizResult ? "quiz_result" : ""].filter(Boolean);
      runIssues.push(
        createIssue({
          severity: "warning",
          category: "incomplete_quiz_run",
          message: `Incomplete quiz run; missing ${missing.join(" and ")}`,
          fileName: firstEvent?.fileName,
          rowNumber: firstEvent?.rowNumber,
          runIdHash: quizRunIdHash
        })
      );
    }

    const malformedRowCount = runIssues.filter((issue) => issue.category === "malformed_json").length;
    const invalidReasonCodes = Array.from(
      new Set(
        runIssues
          .map((issue) => issue.category)
          .filter((category) => INVALID_FOR_COMPLETION.has(category))
      )
    );
    const isValidCompleted = !isLoadTest && invalidReasonCodes.length === 0 && Boolean(answerSnapshot && quizResult);

    issues.push(...runIssues.filter((issue) => !issues.some((existing) => existing.id === issue.id)));

    runs.push({
      quizRunIdHash,
      sessionIdHash: firstNonUnknown(runEvents.map((event) => event.sessionIdHash)),
      firstSeenAt: minTimestamp(runEvents),
      lastSeenAt: maxTimestamp(runEvents),
      eventCount: runEvents.length,
      eventTypes,
      appVersion,
      source,
      isLoadTest,
      isValidCompleted,
      hasStarted,
      hasAnswerSnapshot: Boolean(answerSnapshot),
      hasQuizResult: Boolean(quizResult),
      hasFeedback: feedbacks.length > 0,
      duplicateEventCount,
      duplicateAnswerSnapshotCount: Math.max(0, answerSnapshots.length - 1),
      duplicateQuizResultCount: Math.max(0, quizResults.length - 1),
      malformedRowCount,
      expectedAnswerCount,
      actualAnswerCount: answers.length,
      typeCode: typeInfo.typeCode,
      typeName: typeInfo.typeName,
      axes,
      flavorTags: extractStringList(resultPayload, [
        "topFlavorTags",
        "top_flavor_tags",
        "flavorTags",
        "flavor_tags",
        "tags",
        "tagNames",
        "tag_names"
      ]),
      allergenWarnings: extractStringList(resultPayload, [
        "allergenWarnings",
        "allergen_warnings",
        "allergens",
        "warnings",
        "allergenTags"
      ]),
      answers,
      feedbacks,
      issueIds: runIssues.map((issue) => issue.id),
      invalidReasonCodes
    });
  }

  return {
    events: events.map(toClientEvent),
    runs: runs.sort((a, b) => (b.firstSeenAt ?? "").localeCompare(a.firstSeenAt ?? "")),
    issues: dedupeIssues(issues)
  };
}

function toClientEvent(event: ParsedEvent): ClientEvent {
  return {
    eventIdHash: event.eventIdHash,
    fingerprintHash: event.fingerprintHash,
    quizRunIdHash: event.quizRunIdHash,
    sessionIdHash: event.sessionIdHash,
    fileName: event.fileName,
    rowNumber: event.rowNumber,
    eventType: event.eventType,
    timestamp: event.timestamp,
    appVersion: event.appVersion,
    source: event.source,
    isLoadTest: event.isLoadTest
  };
}

function extractAnswers(event: ParsedEvent): NormalizedAnswer[] {
  const payload = toRecord(event.payload);
  const answersValue = payload?.answers ?? getNested(payload, ["payload", "answers"]);
  if (!Array.isArray(answersValue)) return [];

  return answersValue.map((answer, index) => {
    const record = toRecord(answer) ?? {};
    const questionId =
      firstString(record, ["questionId", "question_id", "questionKey", "question_key", "id", "key"]) ||
      `q${index + 1}`;
    const questionLabel =
      firstString(record, [
        "questionLabel",
        "question_label",
        "questionText",
        "question_text",
        "label",
        "title",
        "question",
        "text"
      ]) || questionId;
    const questionStage =
      firstString(record, ["questionStage", "question_stage", "stage", "section", "flowState", "flow_state"]) ||
      "UNKNOWN";
    const leftLabel = firstString(record, ["leftLabel", "left_label", "minLabel", "min_label"]);
    const rightLabel = firstString(record, ["rightLabel", "right_label", "maxLabel", "max_label"]);
    const selected = coerceBoolean(
      firstDefined(record, ["selected", "isSelected", "is_selected", "checked", "answered", "isAnswered"])
    );
    const value = coerceNumber(
      firstDefined(record, ["answerValue", "answer_value", "value", "score", "weight", "axisValue", "axis_value"])
    );
    const direction = normalizeDirection(
      firstDefined(record, [
        "answerDirection",
        "answer_direction",
        "direction",
        "choice",
        "answer",
        "side",
        "selectedDirection",
        "selected_direction"
      ]),
      value,
      selected
    );
    const normalizedSelected =
      selected ?? (direction === "selected" ? true : direction === "not_selected" ? false : null);
    const axis = normalizeAxis(firstString(record, ["axis", "axisKey", "axis_key"])) ?? QUESTION_AXIS_MAP[questionId];

    return {
      id: hashString(`${event.quizRunIdHash}:${questionId}:${index}:${event.rowNumber}`, "answer"),
      quizRunIdHash: event.quizRunIdHash,
      questionId,
      questionLabel,
      questionStage,
      leftLabel: leftLabel || undefined,
      rightLabel: rightLabel || undefined,
      direction,
      selected: normalizedSelected,
      axis,
      value: value ?? undefined,
      answerIndex: index,
      sourceEventRow: event.rowNumber
    };
  });
}

function extractFeedback(event: ParsedEvent, index: number, exposeComments: boolean): FeedbackEntry {
  const payload = toRecord(event.payload) ?? {};
  const rating = coerceNumber(firstDefined(payload, ["rating", "score", "stars", "value"]));
  const rawComment = firstString(payload, ["comment", "feedback", "message", "text", "note", "notes"]);
  const normalizedComment = rawComment.trim();

  return {
    id: hashString(`${event.quizRunIdHash}:feedback:${index}:${event.rowNumber}`, "feedback"),
    quizRunIdHash: event.quizRunIdHash,
    rating,
    hasComment: normalizedComment.length > 0,
    commentLength: normalizedComment.length,
    commentHash: normalizedComment ? hashString(normalizedComment, "comment") : undefined,
    comment: exposeComments ? normalizedComment : undefined,
    appVersion: event.appVersion,
    source: event.source,
    timestamp: event.timestamp,
    rowNumber: event.rowNumber
  };
}

function extractTypeInfo(...sources: unknown[]) {
  for (const source of sources) {
    const record = toRecord(source);
    const nested = [
      record,
      toRecord(record?.result),
      toRecord(record?.type),
      toRecord(record?.finalType),
      toRecord(record?.recommendation)
    ];
    for (const candidate of nested) {
      const typeCode = firstString(candidate, [
        "typeCode",
        "type_code",
        "code",
        "resultTypeCode",
        "result_type_code",
        "ramenTypeCode"
      ]);
      const typeName = firstString(candidate, [
        "typeName",
        "type_name",
        "name",
        "label",
        "resultTypeName",
        "result_type_name",
        "ramenTypeName"
      ]);
      if (typeCode || typeName) {
        return {
          typeCode: typeCode || slugify(typeName) || "unknown",
          typeName: typeName || typeCode || "Unknown"
        };
      }
    }
  }
  return { typeCode: "unknown", typeName: "Unknown" };
}

function extractAxes(...sources: unknown[]): AxisValues {
  const axes: AxisValues = {
    richnessAxis: null,
    brothBodyAxis: null,
    impactAxis: null,
    noodleBodyAxis: null
  };

  for (const source of sources) {
    const record = toRecord(source);
    const candidates = [
      record,
      toRecord(record?.axes),
      toRecord(record?.axis),
      toRecord(record?.scores),
      toRecord(record?.axisScores),
      toRecord(record?.result)
    ];
    for (const axis of AXIS_KEYS) {
      if (axes[axis] !== null) continue;
      for (const candidate of candidates) {
        const value = coerceNumber(candidate?.[axis] ?? candidate?.[toSnakeCase(axis)]);
        if (value !== null) {
          axes[axis] = value;
          break;
        }
      }
    }
  }

  return axes;
}

function extractExpectedAnswerCount(...sources: unknown[]) {
  for (const source of sources) {
    const record = toRecord(source);
    const value = coerceNumber(
      firstDefined(record, ["answerCount", "answer_count", "expectedAnswerCount", "expected_answer_count"])
    );
    if (value !== null) return value;
  }
  return null;
}

function extractExplicitAnswersLength(...sources: unknown[]) {
  for (const source of sources) {
    const record = toRecord(source);
    const value = coerceNumber(
      firstDefined(record, ["answersLength", "answers_length", "payloadAnswersLength", "payload_answers_length"])
    );
    if (value !== null) return value;
  }
  return null;
}

function extractStringList(source: unknown, keys: string[]) {
  const record = toRecord(source);
  const nested = [
    record,
    toRecord(record?.result),
    toRecord(record?.type),
    toRecord(record?.recommendation)
  ];
  for (const candidate of nested) {
    const value = firstDefined(candidate, keys);
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[;,|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeDirection(value: unknown, numericValue: number | null, selected: boolean | null) {
  const text = String(value ?? "").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (["left", "l", "a", "negative"].includes(text)) return "left";
  if (["right", "r", "b", "positive"].includes(text)) return "right";
  if (["neutral", "middle", "center", "centre", "none", "zero"].includes(text)) return "neutral";
  if (["selected", "select", "yes", "true"].includes(text)) return "selected";
  if (["not_selected", "unselected", "no", "false"].includes(text)) return "not_selected";
  if (numericValue !== null) {
    if (numericValue < 0) return "left";
    if (numericValue > 0) return "right";
    return "neutral";
  }
  if (selected === true) return "selected";
  if (selected === false) return "not_selected";
  return "unknown";
}

function normalizeAxis(value: string): AxisKey | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  return AXIS_KEYS.find((axis) => axis === normalized || toSnakeCase(axis) === normalized);
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function compareEventOrder(a: ParsedEvent, b: ParsedEvent) {
  const timeCompare = (a.timestamp ?? "").localeCompare(b.timestamp ?? "");
  if (timeCompare !== 0) return timeCompare;
  return a.rowNumber - b.rowNumber;
}

function firstNonUnknown(values: Array<string | undefined>) {
  return values.find((value) => value && value !== "unknown") ?? values.find(Boolean) ?? "unknown";
}

function minTimestamp(events: ParsedEvent[]) {
  return events.map((event) => event.timestamp).filter(Boolean).sort()[0];
}

function maxTimestamp(events: ParsedEvent[]) {
  return events.map((event) => event.timestamp).filter(Boolean).sort().at(-1);
}

function dedupeIssues(issues: ValidationIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue.id)) return false;
    seen.add(issue.id);
    return true;
  });
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return undefined;
}

function getRecord(value: unknown, key: string) {
  return toRecord(toRecord(value)?.[key]);
}

function getNested(value: unknown, path: string[]) {
  let cursor: unknown = value;
  for (const segment of path) {
    cursor = toRecord(cursor)?.[segment];
  }
  return cursor;
}

function firstDefined(record: Record<string, unknown> | undefined, keys: string[]) {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function firstString(record: Record<string, unknown> | undefined, keys: string[]) {
  const value = firstDefined(record, keys);
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(text)) return true;
    if (["false", "0", "no", "n"].includes(text)) return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

function toSnakeCase(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

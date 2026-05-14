export const AXIS_KEYS = [
  "richnessAxis",
  "brothBodyAxis",
  "impactAxis",
  "noodleBodyAxis"
] as const;

export type AxisKey = (typeof AXIS_KEYS)[number];

export type KnownEventType =
  | "quiz_started"
  | "answer_snapshot"
  | "quiz_result"
  | "feedback"
  | "question_answer";

export type AnswerDirection = "left" | "right" | "neutral" | "selected" | "not_selected" | "unknown";

export type IssueSeverity = "info" | "warning" | "error";

export type IssueCategory =
  | "malformed_json"
  | "missing_quiz_run_id"
  | "duplicate_event"
  | "duplicate_answer_snapshot"
  | "duplicate_quiz_result"
  | "invalid_axis_values"
  | "incomplete_quiz_run"
  | "answer_count_mismatch"
  | "answers_length_mismatch"
  | "questionnaire_count_mismatch"
  | "missing_required_field"
  | "csv_parse_error"
  | "unsupported_event";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = Record<string, unknown>;

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  fileName?: string;
  rowNumber?: number;
  runIdHash?: string;
  eventType?: string;
  field?: string;
}

export interface FileParseSummary {
  fileName: string;
  rowCount: number;
  parsedRows: number;
  malformedRows: number;
}

export interface ClientEvent {
  eventIdHash: string;
  fingerprintHash: string;
  quizRunIdHash: string;
  sessionIdHash?: string;
  pagePath?: string;
  schemaVersion: string;
  questionnaireVersion: string;
  resultVersion: string;
  fileName: string;
  rowNumber: number;
  eventType: string;
  timestamp?: string;
  appVersion: string;
  source: string;
  isLoadTest: boolean;
}

export interface ParsedEvent extends ClientEvent {
  payload?: unknown;
  rawEvent?: unknown;
}

export interface NormalizedAnswer {
  id: string;
  quizRunIdHash: string;
  questionId: string;
  questionLabel: string;
  questionStage: string;
  leftLabel?: string;
  rightLabel?: string;
  direction: AnswerDirection;
  selected: boolean | null;
  axis?: AxisKey;
  value?: number;
  answerIndex: number;
  sourceEventRow: number;
}

export interface FeedbackEntry {
  id: string;
  quizRunIdHash: string;
  rating: number | null;
  hasComment: boolean;
  commentLength: number;
  commentHash?: string;
  comment?: string;
  appVersion: string;
  source: string;
  timestamp?: string;
  rowNumber: number;
}

export interface AxisValues {
  richnessAxis: number | null;
  brothBodyAxis: number | null;
  impactAxis: number | null;
  noodleBodyAxis: number | null;
}

export interface ResultInsights {
  archetypeCode: string;
  archetypeName: string;
  mainCategory: string;
  subCategory: string;
  topShare: number | null;
  secondShare: number | null;
  borderlineCode: string;
  borderlineName: string;
  borderlineDistance: number | null;
  borderlineStrength: string;
  confidenceScore: number | null;
  reasonTop4: string[];
}

export interface QuizRunSummary {
  quizRunIdHash: string;
  sessionIdHash?: string;
  pagePath?: string;
  schemaVersion: string;
  questionnaireVersion: string;
  resultVersion: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  eventCount: number;
  eventTypes: string[];
  appVersion: string;
  source: string;
  isLoadTest: boolean;
  isValidCompleted: boolean;
  hasStarted: boolean;
  hasAnswerSnapshot: boolean;
  hasQuizResult: boolean;
  hasFeedback: boolean;
  duplicateEventCount: number;
  duplicateAnswerSnapshotCount: number;
  duplicateQuizResultCount: number;
  malformedRowCount: number;
  expectedAnswerCount: number | null;
  actualAnswerCount: number;
  typeCode: string;
  typeName: string;
  axes: AxisValues;
  resultInsights: ResultInsights;
  flavorTags: string[];
  allergenWarnings: string[];
  answers: NormalizedAnswer[];
  feedbacks: FeedbackEntry[];
  issueIds: string[];
  invalidReasonCodes: IssueCategory[];
}

export interface AnalyticsDataset {
  generatedAt: string;
  exposeComments: boolean;
  files: FileParseSummary[];
  events: ClientEvent[];
  runs: QuizRunSummary[];
  issues: ValidationIssue[];
}

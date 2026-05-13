import type { AxisKey, QuizRunSummary, ValidationIssue } from "@/types/events";

export type ValidityFilter = "all" | "valid" | "invalid" | "load-test";
export type HasFeedbackFilter = "all" | "yes" | "no";

export interface DashboardFilters {
  typeCode: string;
  appVersion: string;
  source: string;
  validity: ValidityFilter;
  hasFeedback: HasFeedbackFilter;
  dateFrom: string;
  dateTo: string;
}

export interface DashboardMetrics {
  totalQuizRuns: number;
  validCompletedRuns: number;
  excludedLoadTestRuns: number;
  completionRate: number;
  feedbackRate: number;
  averageRating: number | null;
  malformedRows: number;
  duplicateEventCounts: number;
}

export interface TypeDistributionRow {
  typeCode: string;
  typeName: string;
  count: number;
  percentage: number;
}

export interface AxisRadarRow {
  axis: AxisKey;
  overall: number;
  [typeCode: string]: string | number;
}

export interface FunnelRow {
  name: string;
  value: number;
  fill: string;
}

export interface QuestionDirectionRow {
  questionId: string;
  questionLabel: string;
  left: number;
  right: number;
  neutral: number;
  selected: number;
  not_selected: number;
  unknown: number;
}

export interface FeedbackRatingRow {
  rating: string;
  count: number;
}

export interface TagRow {
  name: string;
  value: number;
}

export interface VersionAnalysisRow {
  appVersion: string;
  totalRuns: number;
  validCompletedRuns: number;
  completionRate: number;
  feedbackRate: number;
  averageRating: number | null;
}

export interface RunTableRow {
  quizRunIdHash: string;
  status: string;
  typeCode: string;
  typeName: string;
  appVersion: string;
  source: string;
  hasFeedback: boolean;
  rating: number | null;
  eventCount: number;
  answerCount: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export interface AnswerTableRow {
  id: string;
  quizRunIdHash: string;
  questionId: string;
  questionLabel: string;
  direction: string;
  selected: string;
  axis: string;
  value: string;
}

export interface FeedbackTableRow {
  id: string;
  quizRunIdHash: string;
  rating: number | null;
  hasComment: boolean;
  commentLength: number;
  comment: string;
  appVersion: string;
  source: string;
  timestamp?: string;
}

export interface DashboardView {
  filteredRuns: QuizRunSummary[];
  filteredIssues: ValidationIssue[];
  metrics: DashboardMetrics;
  typeDistribution: TypeDistributionRow[];
  axisRadar: AxisRadarRow[];
  compareTypeCodes: string[];
  funnel: FunnelRow[];
  questionDirection: QuestionDirectionRow[];
  feedbackRatings: FeedbackRatingRow[];
  flavorTags: TagRow[];
  allergenWarnings: TagRow[];
  versionAnalysis: VersionAnalysisRow[];
  runRows: RunTableRow[];
  answerRows: AnswerTableRow[];
  feedbackRows: FeedbackTableRow[];
  issueRows: ValidationIssue[];
  availableTypeCodes: string[];
  availableAppVersions: string[];
  availableSources: string[];
}

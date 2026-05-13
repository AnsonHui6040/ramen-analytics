import { applyRunFilters } from "@/analytics/filters";
import { AXIS_KEYS, type AnswerDirection, type AxisKey, type QuizRunSummary } from "@/types/events";
import type {
  AnswerTableRow,
  AxisRadarRow,
  DashboardFilters,
  DashboardMetrics,
  DashboardView,
  FeedbackRatingRow,
  FeedbackTableRow,
  FunnelRow,
  QuestionDirectionRow,
  RunTableRow,
  TagRow,
  TypeDistributionRow,
  VersionAnalysisRow
} from "@/types/analytics";
import type { AnalyticsDataset } from "@/types/events";

const FUNNEL_COLORS = [
  "hsl(var(--chart-4))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-5))"
];

export function buildDashboardView(
  dataset: AnalyticsDataset | null,
  filters: DashboardFilters,
  requestedCompareTypeCodes: string[] = []
): DashboardView {
  const runs = dataset?.runs ?? [];
  const filteredRuns = applyRunFilters(runs, filters);
  const filteredRunIds = new Set(filteredRuns.map((run) => run.quizRunIdHash));
  const filteredIssues = (dataset?.issues ?? []).filter((issue) => !issue.runIdHash || filteredRunIds.has(issue.runIdHash));
  const availableTypeCodes = uniqueSorted(runs.map((run) => run.typeCode));
  const availableAppVersions = uniqueSorted(runs.map((run) => run.appVersion));
  const availableSources = uniqueSorted(runs.map((run) => run.source));
  const validRuns = filteredRuns.filter((run) => run.isValidCompleted);
  const compareTypeCodes = selectCompareTypeCodes(validRuns, requestedCompareTypeCodes);

  return {
    filteredRuns,
    filteredIssues,
    metrics: buildMetrics(filteredRuns),
    typeDistribution: buildTypeDistribution(validRuns),
    axisRadar: buildAxisRadar(validRuns, compareTypeCodes),
    compareTypeCodes,
    funnel: buildFunnel(filteredRuns),
    questionDirection: buildQuestionDirection(validRuns),
    feedbackRatings: buildFeedbackRatings(filteredRuns),
    flavorTags: buildTagRows(validRuns.flatMap((run) => run.flavorTags)),
    allergenWarnings: buildTagRows(validRuns.flatMap((run) => run.allergenWarnings)),
    versionAnalysis: buildVersionAnalysis(filteredRuns),
    runRows: buildRunRows(filteredRuns),
    answerRows: buildAnswerRows(validRuns),
    feedbackRows: buildFeedbackRows(filteredRuns, dataset?.exposeComments ?? false),
    issueRows: filteredIssues,
    availableTypeCodes,
    availableAppVersions,
    availableSources
  };
}

function buildMetrics(runs: QuizRunSummary[]): DashboardMetrics {
  const totalQuizRuns = runs.length;
  const excludedLoadTestRuns = runs.filter((run) => run.isLoadTest).length;
  const eligibleRuns = runs.filter((run) => !run.isLoadTest);
  const validCompletedRuns = eligibleRuns.filter((run) => run.isValidCompleted).length;
  const feedbackRuns = eligibleRuns.filter((run) => run.isValidCompleted && run.hasFeedback).length;
  const ratings = eligibleRuns
    .flatMap((run) => run.feedbacks.map((feedback) => feedback.rating))
    .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating));

  return {
    totalQuizRuns,
    validCompletedRuns,
    excludedLoadTestRuns,
    completionRate: eligibleRuns.length ? validCompletedRuns / eligibleRuns.length : 0,
    feedbackRate: validCompletedRuns ? feedbackRuns / validCompletedRuns : 0,
    averageRating: ratings.length ? average(ratings) : null,
    malformedRows: runs.reduce((sum, run) => sum + run.malformedRowCount, 0),
    duplicateEventCounts: runs.reduce(
      (sum, run) => sum + run.duplicateEventCount + run.duplicateAnswerSnapshotCount + run.duplicateQuizResultCount,
      0
    )
  };
}

function buildTypeDistribution(validRuns: QuizRunSummary[]): TypeDistributionRow[] {
  const counts = countBy(validRuns, (run) => run.typeCode || "unknown");
  const total = validRuns.length;
  return Array.from(counts.entries())
    .map(([typeCode, count]) => {
      const run = validRuns.find((candidate) => candidate.typeCode === typeCode);
      return {
        typeCode,
        typeName: run?.typeName ?? typeCode,
        count,
        percentage: total ? count / total : 0
      };
    })
    .sort((a, b) => b.count - a.count);
}

function buildAxisRadar(validRuns: QuizRunSummary[], compareTypeCodes: string[]): AxisRadarRow[] {
  return AXIS_KEYS.map((axis) => {
    const row: AxisRadarRow = {
      axis,
      overall: averageAxis(validRuns, axis)
    };
    for (const typeCode of compareTypeCodes) {
      row[typeCode] = averageAxis(
        validRuns.filter((run) => run.typeCode === typeCode),
        axis
      );
    }
    return row;
  });
}

function buildFunnel(runs: QuizRunSummary[]): FunnelRow[] {
  const stages = [
    ["quiz_started", runs.filter((run) => run.hasStarted).length],
    ["answer_snapshot", runs.filter((run) => run.hasAnswerSnapshot).length],
    ["quiz_result", runs.filter((run) => run.hasQuizResult).length],
    ["feedback", runs.filter((run) => run.hasFeedback).length],
    ["valid_completed", runs.filter((run) => run.isValidCompleted).length]
  ] as const;

  return stages.map(([name, value], index) => ({
    name,
    value,
    fill: FUNNEL_COLORS[index]
  }));
}

function buildQuestionDirection(validRuns: QuizRunSummary[]): QuestionDirectionRow[] {
  const groups = new Map<string, { label: string; counts: Record<AnswerDirection, number>; total: number }>();

  for (const answer of validRuns.flatMap((run) => run.answers)) {
    const bucket = groups.get(answer.questionId) ?? {
      label: answer.questionLabel,
      counts: {
        left: 0,
        right: 0,
        neutral: 0,
        selected: 0,
        not_selected: 0,
        unknown: 0
      },
      total: 0
    };
    const direction = answer.selected === false ? "not_selected" : answer.direction;
    bucket.counts[direction] += 1;
    bucket.total += 1;
    groups.set(answer.questionId, bucket);
  }

  return Array.from(groups.entries()).map(([questionId, group]) => ({
    questionId,
    questionLabel: group.label,
    left: percentage(group.counts.left, group.total),
    right: percentage(group.counts.right, group.total),
    neutral: percentage(group.counts.neutral, group.total),
    selected: percentage(group.counts.selected, group.total),
    not_selected: percentage(group.counts.not_selected, group.total),
    unknown: percentage(group.counts.unknown, group.total)
  }));
}

function buildFeedbackRatings(runs: QuizRunSummary[]): FeedbackRatingRow[] {
  const ratings = runs
    .flatMap((run) => run.feedbacks.map((feedback) => feedback.rating))
    .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating));
  const counts = countBy(ratings, (rating) => String(rating));
  return Array.from(counts.entries())
    .map(([rating, count]) => ({ rating, count }))
    .sort((a, b) => Number(a.rating) - Number(b.rating));
}

function buildTagRows(tags: string[]): TagRow[] {
  return Array.from(countBy(tags, (tag) => tag).entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 24);
}

function buildVersionAnalysis(runs: QuizRunSummary[]): VersionAnalysisRow[] {
  const groups = groupBy(
    runs.filter((run) => !run.isLoadTest),
    (run) => run.appVersion || "unknown"
  );
  return Array.from(groups.entries())
    .map(([appVersion, group]) => {
      const validRuns = group.filter((run) => run.isValidCompleted);
      const feedbackRuns = validRuns.filter((run) => run.hasFeedback);
      const ratings = group
        .flatMap((run) => run.feedbacks.map((feedback) => feedback.rating))
        .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating));
      return {
        appVersion,
        totalRuns: group.length,
        validCompletedRuns: validRuns.length,
        completionRate: group.length ? validRuns.length / group.length : 0,
        feedbackRate: validRuns.length ? feedbackRuns.length / validRuns.length : 0,
        averageRating: ratings.length ? average(ratings) : null
      };
    })
    .sort((a, b) => a.appVersion.localeCompare(b.appVersion, undefined, { numeric: true }));
}

function buildRunRows(runs: QuizRunSummary[]): RunTableRow[] {
  return runs.map((run) => ({
    quizRunIdHash: run.quizRunIdHash,
    status: run.isLoadTest ? "load-test" : run.isValidCompleted ? "valid" : "invalid",
    typeCode: run.typeCode,
    typeName: run.typeName,
    appVersion: run.appVersion,
    source: run.source,
    hasFeedback: run.hasFeedback,
    rating: firstRating(run),
    eventCount: run.eventCount,
    answerCount: run.actualAnswerCount,
    firstSeenAt: run.firstSeenAt,
    lastSeenAt: run.lastSeenAt
  }));
}

function buildAnswerRows(runs: QuizRunSummary[]): AnswerTableRow[] {
  return runs.flatMap((run) =>
    run.answers.map((answer) => ({
      id: answer.id,
      quizRunIdHash: run.quizRunIdHash,
      questionId: answer.questionId,
      questionLabel: answer.questionLabel,
      direction: answer.direction,
      selected: answer.selected === null ? "unknown" : String(answer.selected),
      axis: answer.axis ?? "",
      value: answer.value === undefined ? "" : String(answer.value)
    }))
  );
}

function buildFeedbackRows(runs: QuizRunSummary[], exposeComments: boolean): FeedbackTableRow[] {
  return runs.flatMap((run) =>
    run.feedbacks.map((feedback) => ({
      id: feedback.id,
      quizRunIdHash: run.quizRunIdHash,
      rating: feedback.rating,
      hasComment: feedback.hasComment,
      commentLength: feedback.commentLength,
      comment: exposeComments ? feedback.comment ?? "" : feedback.hasComment ? "[hidden]" : "",
      appVersion: feedback.appVersion,
      source: feedback.source,
      timestamp: feedback.timestamp
    }))
  );
}

function selectCompareTypeCodes(validRuns: QuizRunSummary[], requested: string[]) {
  const available = new Set(validRuns.map((run) => run.typeCode));
  const requestedValid = requested.filter((typeCode) => available.has(typeCode));
  if (requestedValid.length) return requestedValid.slice(0, 4);
  return buildTypeDistribution(validRuns)
    .slice(0, 3)
    .map((row) => row.typeCode);
}

function averageAxis(runs: QuizRunSummary[], axis: AxisKey) {
  const values = runs
    .map((run) => run.axes[axis])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length ? average(values) : 0;
}

function firstRating(run: QuizRunSummary) {
  return run.feedbacks.find((feedback) => typeof feedback.rating === "number")?.rating ?? null;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentage(count: number, total: number) {
  return total ? Number(((count / total) * 100).toFixed(1)) : 0;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

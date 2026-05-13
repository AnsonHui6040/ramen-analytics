import { applyRunFilters } from "@/analytics/filters";
import { QUESTION_STAGE_ORDER, QUESTIONNAIRE_INFLUENCE_ROWS } from "@/analytics/questionnaire-baseline";
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
  const analysisRuns = selectAnalysisRuns(filteredRuns, filters.validity);
  const compareTypeCodes = selectCompareTypeCodes(analysisRuns, requestedCompareTypeCodes);

  return {
    filteredRuns,
    filteredIssues,
    metrics: buildMetrics(filteredRuns),
    typeDistribution: buildTypeDistribution(analysisRuns),
    axisRadar: buildAxisRadar(analysisRuns, compareTypeCodes),
    compareTypeCodes,
    funnel: buildFunnel(filteredRuns, filters.validity === "load-test"),
    questionDirection: buildQuestionDirection(analysisRuns),
    questionnaireInfluence: QUESTIONNAIRE_INFLUENCE_ROWS,
    feedbackRatings: buildFeedbackRatings(analysisRuns),
    flavorTags: buildTagRows(analysisRuns.flatMap((run) => run.flavorTags)),
    allergenWarnings: buildTagRows(analysisRuns.flatMap((run) => run.allergenWarnings)),
    versionAnalysis: buildVersionAnalysis(filteredRuns, filters.validity === "load-test"),
    runRows: buildRunRows(filteredRuns),
    answerRows: buildAnswerRows(analysisRuns),
    feedbackRows: buildFeedbackRows(filteredRuns, dataset?.exposeComments ?? false),
    issueRows: filteredIssues,
    availableTypeCodes,
    availableAppVersions,
    availableSources
  };
}

function selectAnalysisRuns(runs: QuizRunSummary[], validity: DashboardFilters["validity"]) {
  if (validity === "load-test") {
    return runs.filter(
      (run) => run.isLoadTest && run.hasAnswerSnapshot && run.hasQuizResult && run.invalidReasonCodes.length === 0
    );
  }
  return runs.filter((run) => run.isValidCompleted);
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

function buildFunnel(runs: QuizRunSummary[], includeLoadTest = false): FunnelRow[] {
  const finalStageName = includeLoadTest ? "structurally_completed" : "valid_completed";
  const finalStageValue = includeLoadTest
    ? runs.filter((run) => run.hasAnswerSnapshot && run.hasQuizResult && run.invalidReasonCodes.length === 0).length
    : runs.filter((run) => run.isValidCompleted).length;
  const stages = [
    ["quiz_started", runs.filter((run) => run.hasStarted).length],
    ["answer_snapshot", runs.filter((run) => run.hasAnswerSnapshot).length],
    ["quiz_result", runs.filter((run) => run.hasQuizResult).length],
    ["feedback", runs.filter((run) => run.hasFeedback).length],
    [finalStageName, finalStageValue]
  ] as const;

  return stages.map(([name, value], index) => ({
    name,
    value,
    fill: FUNNEL_COLORS[index]
  }));
}

function buildQuestionDirection(validRuns: QuizRunSummary[]): QuestionDirectionRow[] {
  const groups = new Map<
    string,
    { label: string; stage: string; minIndex: number; counts: Record<AnswerDirection, number>; total: number }
  >();

  for (const answer of validRuns.flatMap((run) => run.answers)) {
    const bucket = groups.get(answer.questionId) ?? {
      label: answer.questionLabel,
      stage: answer.questionStage,
      minIndex: answer.answerIndex,
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
    bucket.minIndex = Math.min(bucket.minIndex, answer.answerIndex);
    groups.set(answer.questionId, bucket);
  }

  return Array.from(groups.entries())
    .sort(([, a], [, b]) => stageOrder(a.stage) * 100 + a.minIndex - (stageOrder(b.stage) * 100 + b.minIndex))
    .map(([questionId, group]) => ({
      questionId,
      questionLabel: group.label,
      questionStage: group.stage,
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

function buildVersionAnalysis(runs: QuizRunSummary[], includeLoadTest = false): VersionAnalysisRow[] {
  const groups = groupBy(
    runs.filter((run) => includeLoadTest || !run.isLoadTest),
    (run) => run.appVersion || "unknown"
  );
  return Array.from(groups.entries())
    .map(([appVersion, group]) => {
      const validRuns = group.filter((run) => run.isValidCompleted);
      const completedRuns = includeLoadTest
        ? group.filter((run) => run.hasAnswerSnapshot && run.hasQuizResult && run.invalidReasonCodes.length === 0)
        : validRuns;
      const ratings = group
        .flatMap((run) => run.feedbacks.map((feedback) => feedback.rating))
        .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating));
      return {
        appVersion,
        totalRuns: group.length,
        validCompletedRuns: completedRuns.length,
        completionRate: group.length ? completedRuns.length / group.length : 0,
        feedbackRate: completedRuns.length
          ? group.filter((run) => completedRuns.includes(run) && run.hasFeedback).length / completedRuns.length
          : 0,
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
      questionStage: answer.questionStage,
      questionLabel: answer.questionLabel,
      leftLabel: answer.leftLabel ?? "",
      rightLabel: answer.rightLabel ?? "",
      direction: answer.direction,
      selected: answer.selected === null ? "unknown" : String(answer.selected),
      axis: answer.axis ?? "",
      value: answer.value === undefined ? "" : String(answer.value)
    }))
  );
}

function stageOrder(stage: string) {
  const index = QUESTION_STAGE_ORDER.indexOf(stage as (typeof QUESTION_STAGE_ORDER)[number]);
  return index === -1 ? QUESTION_STAGE_ORDER.length : index;
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

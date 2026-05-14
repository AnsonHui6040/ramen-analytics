import { applyRunFilters } from "@/analytics/filters";
import { QUESTION_STAGE_ORDER, QUESTIONNAIRE_EXPECTED_ANSWER_COUNT, QUESTIONNAIRE_INFLUENCE_ROWS } from "@/analytics/questionnaire-baseline";
import { AXIS_KEYS, type AnswerDirection, type AxisKey, type QuizRunSummary } from "@/types/events";
import type {
  AnswerTableRow,
  AxisRadarRow,
  AxisTypeRankingRow,
  DashboardFilters,
  DashboardMetrics,
  DashboardView,
  DataQualityRow,
  FeedbackRatingRow,
  FeedbackTableRow,
  FunnelRow,
  IssueParetoRow,
  PersonaSegmentRow,
  PreferenceHighlightRow,
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

const TYPE_CATALOG = [
  { typeCode: "CKLF", typeName: "清亮細緻型" },
  { typeCode: "CKLT", typeName: "清湯厚麵型" },
  { typeCode: "CKHF", typeName: "清湯銳感型" },
  { typeCode: "CKHT", typeName: "清湯硬派型" },
  { typeCode: "CWLF", typeName: "輕白滑順型" },
  { typeCode: "CWLT", typeName: "輕白厚麵型" },
  { typeCode: "CWHF", typeName: "白湯細銳型" },
  { typeCode: "CWHT", typeName: "白湯衝擊型" },
  { typeCode: "RKLF", typeName: "厚湯細緻型" },
  { typeCode: "RKLT", typeName: "厚湯厚麵型" },
  { typeCode: "RKHF", typeName: "厚湯銳感型" },
  { typeCode: "RKHT", typeName: "厚湯硬派型" },
  { typeCode: "RWLF", typeName: "濃白細滑型" },
  { typeCode: "RWLT", typeName: "濃白厚麵型" },
  { typeCode: "RWHF", typeName: "濃白細膩型" },
  { typeCode: "RWHT", typeName: "濃白重口型" }
] as const;

const PREFERENCE_HIGHLIGHT_QUESTIONS = new Set([
  "flavor_meat_vs_sea",
  "flavor_fermented",
  "flavor_citrus",
  "flavor_spice",
  "flavor_fatty_sweet",
  "protein_pork",
  "protein_chicken",
  "protein_beef",
  "protein_duck",
  "protein_shrimp",
  "protein_shellfish",
  "protein_fish",
  "protein_miso",
  "topping_chashu",
  "topping_beef",
  "topping_egg",
  "topping_nori",
  "topping_spinach",
  "topping_menma",
  "topping_veg_pile",
  "topping_corn",
  "topping_butter",
  "topping_garlic",
  "topping_backfat",
  "topping_seafood",
  "crustacean",
  "shellfish",
  "egg",
  "milk",
  "beef",
  "pork"
]);

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
    axisTypeRankings: buildAxisTypeRankings(analysisRuns),
    preferenceHighlights: buildPreferenceHighlights(analysisRuns),
    compareTypeCodes,
    funnel: buildFunnel(filteredRuns, filters.validity === "load-test"),
    questionDirection: buildQuestionDirection(analysisRuns),
    questionnaireInfluence: QUESTIONNAIRE_INFLUENCE_ROWS,
    feedbackRatings: buildFeedbackRatings(analysisRuns),
    flavorTags: buildTagRows(analysisRuns.map((run) => run.flavorTags)),
    allergenWarnings: buildTagRows(analysisRuns.map((run) => run.allergenWarnings)),
    versionAnalysis: buildVersionAnalysis(filteredRuns, filters.validity === "load-test"),
    runRows: buildRunRows(filteredRuns),
    answerRows: buildAnswerRows(analysisRuns),
    feedbackRows: buildFeedbackRows(filteredRuns, dataset?.exposeComments ?? false),
    dataQualityRows: buildDataQualityRows(filteredRuns, filteredIssues),
    issuePareto: buildIssuePareto(filteredIssues),
    personaSegments: buildPersonaSegments(analysisRuns),
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
  const catalogRows = TYPE_CATALOG.map(({ typeCode, typeName }) => {
    const run = validRuns.find((candidate) => candidate.typeCode === typeCode);
    const count = counts.get(typeCode) ?? 0;
    return {
      typeCode,
      typeName: run?.typeName || typeName,
      count,
      percentage: total ? count / total : 0
    };
  });
  const unknownRows = Array.from(counts.entries())
    .filter(([typeCode]) => !TYPE_CATALOG.some((item) => item.typeCode === typeCode))
    .map(([typeCode, count]) => ({
      typeCode,
      typeName: validRuns.find((candidate) => candidate.typeCode === typeCode)?.typeName || typeCode,
      count,
      percentage: total ? count / total : 0
    }));
  return [...catalogRows, ...unknownRows];
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

function buildAxisTypeRankings(validRuns: QuizRunSummary[]): AxisTypeRankingRow[] {
  const catalogOrder = new Map(TYPE_CATALOG.map((item, index) => [item.typeCode, index]));

  return AXIS_KEYS.flatMap((axis) => {
    const rows = TYPE_CATALOG.map(({ typeCode, typeName }) => {
      const typeRuns = validRuns.filter((run) => run.typeCode === typeCode);
      const values = typeRuns
        .map((run) => run.axes[axis])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const matchedTypeName = typeRuns.find((run) => run.typeName)?.typeName;

      return {
        axis,
        typeCode,
        typeName: matchedTypeName || typeName,
        average: values.length ? average(values) : 0,
        sampleSize: values.length,
        rank: 0
      };
    }).sort((a, b) => {
      if (a.sampleSize === 0 && b.sampleSize > 0) return 1;
      if (a.sampleSize > 0 && b.sampleSize === 0) return -1;
      if (b.average !== a.average) return b.average - a.average;
      return (catalogOrder.get(a.typeCode) ?? 999) - (catalogOrder.get(b.typeCode) ?? 999);
    });

    return rows.map((row, index) => ({
      ...row,
      rank: index + 1
    }));
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

function buildPreferenceHighlights(validRuns: QuizRunSummary[]): PreferenceHighlightRow[] {
  const groups = new Map<
    string,
    {
      category: PreferenceHighlightRow["category"];
      questionId: string;
      label: string;
      valueLabel: string;
      count: number;
      total: number;
    }
  >();

  for (const answer of validRuns.flatMap((run) => run.answers)) {
    if (!PREFERENCE_HIGHLIGHT_QUESTIONS.has(answer.questionId)) continue;
    const category = getPreferenceCategory(answer.questionId, answer.questionStage);
    const valueLabel = getPreferenceValueLabel(answer);
    const key = `${category}:${answer.questionId}:${valueLabel}`;
    const bucket = groups.get(key) ?? {
      category,
      questionId: answer.questionId,
      label: answer.questionLabel,
      valueLabel,
      count: 0,
      total: 0
    };
    if (isPositivePreference(answer.direction, answer.selected)) bucket.count += 1;
    bucket.total += 1;
    groups.set(key, bucket);
  }

  return Array.from(groups.values())
    .filter((row) => row.total > 0)
    .map((row) => ({
      id: `${row.category}:${row.questionId}`,
      category: row.category,
      questionId: row.questionId,
      label: row.label,
      valueLabel: row.valueLabel,
      percentage: row.count / row.total,
      sampleSize: row.total
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 18);
}

function buildTagRows(tagLists: string[][]): TagRow[] {
  const totalRuns = tagLists.length;
  const tags = tagLists.flatMap((list) => Array.from(new Set(list.filter(Boolean))));
  return Array.from(countBy(tags, (tag) => tag).entries())
    .map(([name, value]) => ({ name, value, percentage: totalRuns ? value / totalRuns : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 24);
}

function getPreferenceCategory(questionId: string, questionStage: string): PreferenceHighlightRow["category"] {
  if (questionStage === "ALLERGENS") return "allergen";
  if (questionId.startsWith("protein_")) return "protein";
  if (questionId.startsWith("topping_")) return "topping";
  return "flavor";
}

function getPreferenceValueLabel(answer: QuizRunSummary["answers"][number]) {
  if (answer.questionStage === "ALLERGENS") return "selected";
  return answer.rightLabel || "right";
}

function isPositivePreference(direction: string, selected: boolean | null) {
  if (selected !== null) return selected;
  return direction === "right" || direction === "selected";
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
    pagePath: run.pagePath ?? "",
    appVersion: run.appVersion,
    schemaVersion: run.schemaVersion,
    questionnaireVersion: run.questionnaireVersion,
    resultVersion: run.resultVersion,
    source: run.source,
    mainCategory: run.resultInsights.mainCategory,
    subCategory: run.resultInsights.subCategory,
    topShare: run.resultInsights.topShare,
    secondShare: run.resultInsights.secondShare,
    borderlineCode: run.resultInsights.borderlineCode,
    borderlineDistance: run.resultInsights.borderlineDistance,
    confidenceScore: run.resultInsights.confidenceScore,
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

function buildDataQualityRows(runs: QuizRunSummary[], issues: DashboardView["filteredIssues"]): DataQualityRow[] {
  const issuesByRun = groupBy(
    issues.filter((issue) => issue.runIdHash),
    (issue) => issue.runIdHash ?? ""
  );

  return runs.map((run) => {
    const runIssues = issuesByRun.get(run.quizRunIdHash) ?? [];
    const missingEvents = [
      !run.hasStarted ? "quiz_started" : "",
      !run.hasAnswerSnapshot ? "answer_snapshot" : "",
      !run.hasQuizResult ? "quiz_result" : ""
    ].filter(Boolean);

    return {
      quizRunIdHash: run.quizRunIdHash,
      status: run.isLoadTest ? "load-test" : run.isValidCompleted ? "valid" : "invalid",
      pagePath: run.pagePath ?? "",
      hasStarted: run.hasStarted,
      hasAnswerSnapshot: run.hasAnswerSnapshot,
      hasQuizResult: run.hasQuizResult,
      hasFeedback: run.hasFeedback,
      answerCompleteness: Math.min(1, run.actualAnswerCount / QUESTIONNAIRE_EXPECTED_ANSWER_COUNT),
      issueCount: runIssues.length,
      criticalIssueCount: runIssues.filter((issue) => issue.severity === "error").length,
      missingEvents: missingEvents.join(", ")
    };
  });
}

function buildIssuePareto(issues: DashboardView["filteredIssues"]): IssueParetoRow[] {
  const counts = countBy(issues, (issue) => issue.category);
  const total = issues.length;
  let cumulative = 0;

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .map(({ category, count }) => {
      cumulative += count;
      return {
        category,
        count,
        percentage: total ? count / total : 0,
        cumulativePercentage: total ? cumulative / total : 0
      };
    });
}

function buildPersonaSegments(validRuns: QuizRunSummary[]): PersonaSegmentRow[] {
  const groups = groupBy(validRuns, (run) => buildSegmentId(run));
  const total = validRuns.length;

  return Array.from(groups.entries())
    .map(([segmentId, runs]) => {
      const ratings = runs
        .flatMap((run) => run.feedbacks.map((feedback) => feedback.rating))
        .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating));
      const topTypeCode = mostCommon(runs.map((run) => run.typeCode || "unknown"));
      return {
        segmentId,
        label: segmentId
          .split("|")
          .map((part) => part.replaceAll("_", " "))
          .join(" / "),
        count: runs.length,
        percentage: total ? runs.length / total : 0,
        topTypeCode,
        feedbackRate: runs.length ? runs.filter((run) => run.hasFeedback).length / runs.length : 0,
        averageRating: ratings.length ? average(ratings) : null,
        richnessAxis: averageAxis(runs, "richnessAxis"),
        brothBodyAxis: averageAxis(runs, "brothBodyAxis"),
        impactAxis: averageAxis(runs, "impactAxis"),
        noodleBodyAxis: averageAxis(runs, "noodleBodyAxis")
      };
    })
    .sort((a, b) => b.count - a.count);
}

function buildSegmentId(run: QuizRunSummary) {
  return [
    bucketAxis(run.axes.richnessAxis, "light", "balanced_richness", "rich"),
    bucketAxis(run.axes.brothBodyAxis, "clear_broth", "balanced_broth", "cloudy_broth"),
    bucketAxis(run.axes.impactAxis, "gentle", "balanced_impact", "bold"),
    bucketAxis(run.axes.noodleBodyAxis, "silky_noodle", "balanced_noodle", "chewy_noodle")
  ].join("|");
}

function bucketAxis(value: number | null, low: string, middle: string, high: string) {
  if (value === null || !Number.isFinite(value)) return middle;
  if (value <= 40) return low;
  if (value >= 60) return high;
  return middle;
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

function mostCommon(values: string[]) {
  return Array.from(countBy(values, (value) => value).entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";
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

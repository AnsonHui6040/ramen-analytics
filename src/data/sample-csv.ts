type SampleRow = Record<string, string>;

const columns = [
  "timestamp",
  "eventType",
  "quizRunId",
  "sessionId",
  "appVersion",
  "source",
  "payload",
  "rawEvent"
];

export function createSampleCsv() {
  const rows: SampleRow[] = [];
  const base = Date.UTC(2026, 4, 13, 8, 0, 0);

  const push = (
    offsetMinutes: number,
    eventType: string,
    quizRunId: string,
    appVersion: string,
    source: string,
    payload: unknown,
    rawEvent: unknown = {}
  ) => {
    rows.push({
      timestamp: new Date(base + offsetMinutes * 60_000).toISOString(),
      eventType,
      quizRunId,
      sessionId: `session-${quizRunId}`,
      appVersion,
      source,
      payload: typeof payload === "string" ? payload : JSON.stringify(payload),
      rawEvent: JSON.stringify(rawEvent)
    });
  };

  push(0, "quiz_started", "run-001", "1.3.0", "production", { locale: "zh-TW" });
  push(1, "answer_snapshot", "run-001", "1.3.0", "production", {
    answerCount: 5,
    answers: [
      { questionId: "q01", questionLabel: "Broth richness", direction: "right", axis: "richnessAxis", value: 1 },
      { questionId: "q02", questionLabel: "Broth body", direction: "right", axis: "brothBodyAxis", value: 1 },
      { questionId: "q03", questionLabel: "Impact", direction: "neutral", axis: "impactAxis", value: 0 },
      { questionId: "q04", questionLabel: "Noodle body", direction: "left", axis: "noodleBodyAxis", value: -1 },
      { questionId: "q05", questionLabel: "Spicy finish", selected: true }
    ]
  });
  push(2, "quiz_result", "run-001", "1.3.0", "production", {
    typeCode: "shoyu",
    typeName: "Shoyu",
    axes: { richnessAxis: 65, brothBodyAxis: 72, impactAxis: 38, noodleBodyAxis: 25 },
    flavorTags: ["soy", "balanced", "aromatic"],
    allergenWarnings: ["soy", "wheat"]
  });
  push(3, "feedback", "run-001", "1.3.0", "production", {
    rating: 5,
    comment: "Result felt accurate and easy to understand."
  });

  push(6, "quiz_started", "run-002", "1.3.1", "production", { locale: "en-US" });
  push(7, "answer_snapshot", "run-002", "1.3.1", "production", {
    answerCount: 5,
    answers: [
      { questionId: "q01", questionLabel: "Broth richness", direction: "right", axis: "richnessAxis", value: 1 },
      { questionId: "q02", questionLabel: "Broth body", direction: "right", axis: "brothBodyAxis", value: 1 },
      { questionId: "q03", questionLabel: "Impact", direction: "right", axis: "impactAxis", value: 1 },
      { questionId: "q04", questionLabel: "Noodle body", direction: "right", axis: "noodleBodyAxis", value: 1 },
      { questionId: "q05", questionLabel: "Spicy finish", selected: false }
    ]
  });
  push(8, "quiz_result", "run-002", "1.3.1", "production", {
    typeCode: "tonkotsu",
    typeName: "Tonkotsu",
    axes: { richnessAxis: 92, brothBodyAxis: 90, impactAxis: 75, noodleBodyAxis: 60 },
    flavorTags: ["creamy", "savory", "rich"],
    allergenWarnings: ["pork", "wheat"]
  });

  push(12, "quiz_started", "run-003", "1.2.9", "production", { locale: "zh-TW" });
  push(13, "answer_snapshot", "run-003", "1.2.9", "production", {
    answerCount: 5,
    answers: [{ questionId: "q01", questionLabel: "Broth richness", direction: "left", value: -1 }]
  });

  push(20, "quiz_started", "run-004", "1.3.1", "load-test", { isLoadTest: true });
  push(21, "answer_snapshot", "run-004", "1.3.1", "load-test", {
    isLoadTest: true,
    answerCount: 1,
    answers: [{ questionId: "q01", questionLabel: "Broth richness", direction: "right", value: 1 }]
  });
  push(22, "quiz_result", "run-004", "1.3.1", "load-test", {
    isLoadTest: true,
    typeCode: "miso",
    typeName: "Miso",
    axes: { richnessAxis: 50, brothBodyAxis: 40, impactAxis: 70, noodleBodyAxis: 10 }
  });

  push(28, "quiz_started", "run-005", "1.3.1", "production", {});
  push(29, "answer_snapshot", "run-005", "1.3.1", "production", {
    answerCount: 2,
    answers: [
      { questionId: "q01", questionLabel: "Broth richness", direction: "left", value: -1 },
      { questionId: "q02", questionLabel: "Broth body", direction: "neutral", value: 0 }
    ]
  });
  push(30, "answer_snapshot", "run-005", "1.3.1", "production", {
    answerCount: 2,
    answers: [
      { questionId: "q01", questionLabel: "Broth richness", direction: "left", value: -1 },
      { questionId: "q02", questionLabel: "Broth body", direction: "neutral", value: 0 }
    ]
  });
  push(31, "quiz_result", "run-005", "1.3.1", "production", {
    typeCode: "shio",
    typeName: "Shio",
    axes: { richnessAxis: 30, brothBodyAxis: 15, impactAxis: 20, noodleBodyAxis: 0 }
  });

  push(40, "feedback", "run-006", "1.3.1", "production", "{bad json");

  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column] ?? "")).join(","))].join(
    "\n"
  );
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll("\"", "\"\"")}"`;
  return value;
}

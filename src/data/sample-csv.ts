type SampleRow = Record<string, string>;

const columns = [
  "createdAt",
  "eventType",
  "quizRunId",
  "sessionId",
  "appVersion",
  "source",
  "page",
  "schemaVersion",
  "questionnaireVersion",
  "resultVersion",
  "payload",
  "rawEvent"
];

const questionGroups = [
  {
    stage: "CORE_AXES",
    ids: ["axis_richness", "axis_broth_body", "axis_impact", "axis_noodle_body"]
  },
  {
    stage: "FLAVOR_PROFILE",
    ids: ["flavor_meat_vs_sea", "flavor_fermented", "flavor_citrus", "flavor_spice", "flavor_fatty_sweet"]
  },
  {
    stage: "PROTEIN_PREFERENCES",
    ids: [
      "protein_pork",
      "protein_chicken",
      "protein_beef",
      "protein_duck",
      "protein_shrimp",
      "protein_shellfish",
      "protein_fish",
      "protein_miso"
    ]
  },
  {
    stage: "NOODLE_TOPPING",
    ids: [
      "noodle_thickness",
      "noodle_firmness",
      "noodle_chewiness",
      "noodle_curl",
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
      "topping_seafood"
    ]
  },
  {
    stage: "ALLERGENS",
    ids: ["crustacean", "shellfish", "egg", "milk", "beef", "pork"]
  }
] as const;

const typeProfiles = [
  ["CKLF", "清亮細緻型", 24, 26, 22, 28, ["chicken", "fish", "clean"]],
  ["CKLT", "清湯厚麵型", 28, 24, 30, 74, ["chicken", "fish", "chewy"]],
  ["CKHF", "清湯銳感型", 26, 25, 76, 30, ["duck", "fish", "sharp"]],
  ["CKHT", "清湯硬派型", 27, 26, 78, 76, ["duck", "pork", "bold"]],
  ["CWLF", "輕白滑順型", 30, 72, 28, 25, ["chicken", "creamy", "silky"]],
  ["CWLT", "輕白厚麵型", 32, 74, 31, 78, ["chicken", "miso", "chewy"]],
  ["CWHF", "白湯細銳型", 33, 76, 75, 28, ["duck", "creamy", "aromatic"]],
  ["CWHT", "白湯衝擊型", 35, 78, 80, 77, ["pork", "garlic", "bold"]],
  ["RKLF", "厚湯細緻型", 72, 27, 26, 25, ["beef", "fish", "rich"]],
  ["RKLT", "厚湯厚麵型", 74, 28, 30, 76, ["beef", "rich", "chewy"]],
  ["RKHF", "厚湯銳感型", 76, 30, 74, 26, ["shellfish", "fish", "sharp"]],
  ["RKHT", "厚湯硬派型", 78, 28, 77, 78, ["pork", "backfat", "bold"]],
  ["RWLF", "濃白細滑型", 76, 74, 28, 28, ["chicken", "creamy", "silky"]],
  ["RWLT", "濃白厚麵型", 79, 76, 31, 79, ["pork", "creamy", "chewy"]],
  ["RWHF", "濃白細膩型", 80, 78, 76, 30, ["duck", "creamy", "aromatic"]],
  ["RWHT", "濃白重口型", 84, 82, 84, 82, ["pork", "garlic", "rich"]]
] as const;

export function createSampleCsv() {
  const rows: SampleRow[] = [];
  const base = Date.UTC(2026, 4, 15, 4, 0, 0);
  const validProfiles = [...typeProfiles, typeProfiles[0], typeProfiles[4], typeProfiles[11], typeProfiles[15]];

  validProfiles.forEach((profile, index) => {
    addCompleteRun(rows, base, index, profile, "production", index % 4 === 0);
  });

  addCompleteRun(rows, base, 30, typeProfiles[15], "load-test", false, true);
  addIncompleteRun(rows, base, 40);
  addMalformedRow(rows, base, 41);

  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column] ?? "")).join(","))].join(
    "\n"
  );
}

function addCompleteRun(
  rows: SampleRow[],
  base: number,
  index: number,
  profile: (typeof typeProfiles)[number],
  source: string,
  withFeedback: boolean,
  isLoadTest = false
) {
  const [typeCode, typeName, richnessAxis, brothBodyAxis, impactAxis, noodleBodyAxis, tags] = profile;
  const quizRunId = `${isLoadTest ? "sample-load" : "sample"}-${String(index + 1).padStart(3, "0")}`;
  const common = {
    quizRunId,
    sessionId: `session-${quizRunId}`,
    appVersion: "1.0.0",
    source,
    page: isLoadTest ? "/ramen-style-finder/load-test" : "/ramen-style-finder/",
    schemaVersion: "2026-05-15",
    questionnaireVersion: "v1",
    resultVersion: "v1"
  };
  const startedAt = new Date(base + index * 180_000).toISOString();
  pushEvent(rows, startedAt, common, "quiz_started", {
    quizRunId,
    startedAt,
    testMode: isLoadTest,
    loadTestId: isLoadTest ? "sample-load-test" : undefined
  });

  const answers = buildAnswers({
    quizRunId,
    richnessAxis,
    brothBodyAxis,
    impactAxis,
    noodleBodyAxis,
    seed: index,
    isLoadTest
  });
  pushEvent(rows, new Date(base + index * 180_000 + 60_000).toISOString(), common, "answer_snapshot", {
    quizRunId,
    answerCount: answers.length,
    answers,
    snapshotGeneratedAt: new Date(base + index * 180_000 + 60_000).toISOString(),
    testMode: isLoadTest,
    loadTestId: isLoadTest ? "sample-load-test" : undefined
  });

  pushEvent(rows, new Date(base + index * 180_000 + 120_000).toISOString(), common, "quiz_result", {
    quizRunId,
    typeCode,
    typeName,
    archetypeCode: typeCode,
    archetypeName: typeName,
    mainCategory: pickMainCategory(typeCode),
    subCategory: `${typeName} baseline`,
    axes: { richnessAxis, brothBodyAxis, impactAxis, noodleBodyAxis },
    topShare: 42 + (index % 7) * 4,
    secondShare: 18 + (index % 5) * 3,
    borderlineCode: typeProfiles[(index + 1) % typeProfiles.length][0],
    borderlineDistance: 8 + (index % 6) * 2,
    borderlineStrength: index % 2 === 0 ? "close" : "moderate",
    topFlavorTags: tags,
    allergenWarnings: index % 5 === 0 ? ["egg"] : index % 6 === 0 ? ["pork"] : [],
    recommendationSummary: `${typeName} sample result`,
    answerCount: 39,
    reasonTop4: [
      { label: "主型四軸一致度", score: 82 },
      { label: "風味傾向一致度", score: 76 },
      { label: "麵條偏好一致度", score: 71 },
      { label: "配料偏好一致度", score: 64 }
    ],
    resultGeneratedAt: new Date(base + index * 180_000 + 120_000).toISOString(),
    testMode: isLoadTest,
    loadTestId: isLoadTest ? "sample-load-test" : undefined
  });

  if (withFeedback) {
    pushEvent(rows, new Date(base + index * 180_000 + 150_000).toISOString(), common, "feedback", {
      quizRunId,
      typeCode,
      typeName,
      rating: 4 + (index % 2),
      comment: `sample feedback ${index + 1}`,
      submittedAt: new Date(base + index * 180_000 + 150_000).toISOString()
    });
  }
}

function addIncompleteRun(rows: SampleRow[], base: number, index: number) {
  const common = {
    quizRunId: "sample-incomplete-001",
    sessionId: "session-sample-incomplete-001",
    appVersion: "1.0.0",
    source: "production",
    page: "/ramen-style-finder/",
    schemaVersion: "2026-05-15",
    questionnaireVersion: "v1",
    resultVersion: "v1"
  };
  pushEvent(rows, new Date(base + index * 180_000).toISOString(), common, "quiz_started", {
    quizRunId: common.quizRunId,
    startedAt: new Date(base + index * 180_000).toISOString()
  });
  pushEvent(rows, new Date(base + index * 180_000 + 60_000).toISOString(), common, "answer_snapshot", {
    quizRunId: common.quizRunId,
    answerCount: 2,
    answers: buildAnswers({
      quizRunId: common.quizRunId,
      richnessAxis: 50,
      brothBodyAxis: 50,
      impactAxis: 50,
      noodleBodyAxis: 50,
      seed: index,
      isLoadTest: false
    }).slice(0, 2)
  });
}

function addMalformedRow(rows: SampleRow[], base: number, index: number) {
  rows.push({
    createdAt: new Date(base + index * 180_000).toISOString(),
    eventType: "feedback",
    quizRunId: "sample-malformed-001",
    sessionId: "session-sample-malformed-001",
    appVersion: "1.0.0",
    source: "production",
    page: "/ramen-style-finder/",
    schemaVersion: "2026-05-15",
    questionnaireVersion: "v1",
    resultVersion: "v1",
    payload: "{bad json",
    rawEvent: "{}"
  });
}

function buildAnswers({
  quizRunId,
  richnessAxis,
  brothBodyAxis,
  impactAxis,
  noodleBodyAxis,
  seed,
  isLoadTest
}: {
  quizRunId: string;
  richnessAxis: number;
  brothBodyAxis: number;
  impactAxis: number;
  noodleBodyAxis: number;
  seed: number;
  isLoadTest: boolean;
}) {
  const axisValues: Record<string, number> = {
    axis_richness: richnessAxis,
    axis_broth_body: brothBodyAxis,
    axis_impact: impactAxis,
    axis_noodle_body: noodleBodyAxis,
    noodle_thickness: noodleBodyAxis,
    noodle_firmness: Math.min(100, Math.max(0, noodleBodyAxis + (seed % 3) * 4 - 4)),
    noodle_chewiness: Math.min(100, Math.max(0, noodleBodyAxis + (seed % 5) * 3 - 6))
  };

  return questionGroups.flatMap((group) =>
    group.ids.map((questionId, index) => {
      const isAllergen = group.stage === "ALLERGENS";
      const value = isAllergen ? Number((seed + index) % 7 === 0) : axisValues[questionId] ?? samplePreferenceValue(seed, index);
      return {
        quizRunId,
        questionId,
        questionStage: group.stage,
        questionText: questionId,
        answerValue: value,
        answerDirection: isAllergen ? (value ? "selected" : "not_selected") : value < 50 ? "left" : value > 50 ? "right" : "neutral",
        questionIndex: index,
        isFinalSnapshot: true,
        testMode: isLoadTest,
        loadTestId: isLoadTest ? "sample-load-test" : undefined
      };
    })
  );
}

function samplePreferenceValue(seed: number, index: number) {
  return Math.min(95, Math.max(5, 35 + ((seed * 13 + index * 17) % 50)));
}

function pickMainCategory(typeCode: string) {
  const family = typeCode[0] === "R" ? "pork" : typeCode[1] === "W" ? "chicken" : "seafood";
  if (typeCode.includes("K") && typeCode[0] === "R") return "beef";
  return family;
}

function pushEvent(
  rows: SampleRow[],
  createdAt: string,
  common: {
    quizRunId: string;
    sessionId: string;
    appVersion: string;
    source: string;
    page: string;
    schemaVersion: string;
    questionnaireVersion: string;
    resultVersion: string;
  },
  eventType: string,
  payload: Record<string, unknown>
) {
  const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  const rawEvent = {
    eventType,
    sessionId: common.sessionId,
    createdAt,
    source: common.source,
    appVersion: common.appVersion,
    schemaVersion: common.schemaVersion,
    questionnaireVersion: common.questionnaireVersion,
    resultVersion: common.resultVersion,
    page: common.page,
    payload: cleanPayload
  };

  rows.push({
    createdAt,
    eventType,
    quizRunId: common.quizRunId,
    sessionId: common.sessionId,
    appVersion: common.appVersion,
    source: common.source,
    page: common.page,
    schemaVersion: common.schemaVersion,
    questionnaireVersion: common.questionnaireVersion,
    resultVersion: common.resultVersion,
    payload: JSON.stringify(cleanPayload),
    rawEvent: JSON.stringify(rawEvent)
  });
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll("\"", "\"\"")}"`;
  return value;
}

#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const options = parseArgs(process.argv.slice(2));
const config = {
  users: Number(options.users ?? 20),
  concurrency: Number(options.concurrency ?? 8),
  perUserGapMs: Number(options.gap ?? 50),
  endpoint: options.endpoint ?? process.env.COLLECT_URL ?? "https://wmq452wmcd.execute-api.ap-east-2.amazonaws.com/prod/collect",
  tableName: options.table ?? process.env.TABLE_NAME ?? "RamenUserEvents",
  region: options.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "ap-east-2",
  outputRoot: resolve(options.output ?? "exports/load-tests"),
  batchId: options.batch ?? `loadtest-${new Date().toISOString().replace(/[:.]/g, "-")}`
};

const questionGroups = [
  ["CORE_AXES", ["axis_richness", "axis_broth_body", "axis_impact", "axis_noodle_body"]],
  ["FLAVOR_PROFILE", ["flavor_meat_vs_sea", "flavor_fermented", "flavor_citrus", "flavor_spice", "flavor_fatty_sweet"]],
  [
    "PROTEIN_PREFERENCES",
    [
      "protein_pork",
      "protein_chicken",
      "protein_beef",
      "protein_duck",
      "protein_shrimp",
      "protein_shellfish",
      "protein_fish",
      "protein_miso"
    ]
  ],
  [
    "NOODLE_TOPPING",
    [
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
  ],
  ["ALLERGENS", ["crustacean", "shellfish", "egg", "milk", "beef", "pork"]]
];

const typeCatalog = [
  ["CKLF", "清亮細緻型", 24, 26, 22, 28],
  ["CKLT", "清湯厚麵型", 28, 24, 30, 74],
  ["CKHF", "清湯銳感型", 26, 25, 76, 30],
  ["CKHT", "清湯硬派型", 27, 26, 78, 76],
  ["CWLF", "輕白滑順型", 30, 72, 28, 25],
  ["CWLT", "輕白厚麵型", 32, 74, 31, 78],
  ["CWHF", "白湯細銳型", 33, 76, 75, 28],
  ["CWHT", "白湯衝擊型", 35, 78, 80, 77],
  ["RKLF", "厚湯細緻型", 72, 27, 26, 25],
  ["RKLT", "厚湯厚麵型", 74, 28, 30, 76],
  ["RKHF", "厚湯銳感型", 76, 30, 74, 26],
  ["RKHT", "厚湯硬派型", 78, 28, 77, 78],
  ["RWLF", "濃白細滑型", 76, 74, 28, 28],
  ["RWLT", "濃白厚麵型", 79, 76, 31, 79],
  ["RWHF", "濃白細膩型", 80, 78, 76, 30],
  ["RWHT", "濃白重口型", 84, 82, 84, 82]
];

const expected = {
  eventsPerRun: 41,
  answersPerRun: 39,
  totalEvents: config.users * 41,
  eventTypes: {
    quiz_started: config.users,
    question_answer: config.users * 39,
    quiz_result: config.users
  },
  stages: {
    CORE_AXES: config.users * 4,
    FLAVOR_PROFILE: config.users * 5,
    PROTEIN_PREFERENCES: config.users * 8,
    NOODLE_TOPPING: config.users * 16,
    ALLERGENS: config.users * 6
  }
};

const outputDir = resolve(config.outputRoot, config.batchId);
mkdirSync(outputDir, { recursive: true });

const startedAt = new Date().toISOString();
const responses = [];

console.log(JSON.stringify({ phase: "start", config, expected }));

await runPool(
  Array.from({ length: config.users }, (_, index) => index + 1),
  config.concurrency,
  async (userIndex) => {
    for (const event of buildRunEvents(userIndex)) {
      const sentAt = performance.now();
      try {
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event)
        });
        const text = await response.text();
        const body = parseJson(text);
        responses.push({
          ok: response.ok,
          status: response.status,
          eventType: event.eventType,
          quizRunId: event.payload.quizRunId,
          eventId: body?.eventId,
          latencyMs: Math.round(performance.now() - sentAt),
          error: response.ok ? undefined : body
        });
      } catch (error) {
        responses.push({
          ok: false,
          status: 0,
          eventType: event.eventType,
          quizRunId: event.payload.quizRunId,
          latencyMs: Math.round(performance.now() - sentAt),
          error: error instanceof Error ? error.message : String(error)
        });
      }
      await sleep(config.perUserGapMs);
    }
  }
);

const finishedSendingAt = new Date().toISOString();
const sendSummary = summarizeResponses(responses);
writeJson(resolve(outputDir, "send-summary.json"), { config, expected, startedAt, finishedSendingAt, ...sendSummary });
console.log(JSON.stringify({ phase: "sent", summary: sendSummary.summary }));

await sleep(3000);

const rows = scanBatch(config).Items.map(unmarshallItem);
writeJson(resolve(outputDir, "dynamodb-items.json"), { batchId: config.batchId, count: rows.length, rows });
writeFileSync(resolve(outputDir, "events.csv"), toCsv(rows));

const dbValidation = validateRows(rows, responses);
writeJson(resolve(outputDir, "db-validation-summary.json"), dbValidation);

const manifest = {
  batchId: config.batchId,
  startedAt,
  finishedSendingAt,
  completedAt: new Date().toISOString(),
  config,
  expected,
  sendSummary: sendSummary.summary,
  dbSummary: dbValidation.summary,
  artifacts: {
    sendSummary: resolve(outputDir, "send-summary.json"),
    dynamodbItems: resolve(outputDir, "dynamodb-items.json"),
    eventsCsv: resolve(outputDir, "events.csv"),
    dbValidation: resolve(outputDir, "db-validation-summary.json")
  }
};
writeJson(resolve(outputDir, "manifest.json"), manifest);
console.log(JSON.stringify({ phase: "validated", summary: dbValidation.summary }));

const failed = sendSummary.summary.failedResponses > 0 || dbValidation.summary.failures.length > 0;
console.log(JSON.stringify({ phase: "complete", batchId: config.batchId, outputDir, failed }));
process.exitCode = failed ? 1 : 0;

function buildRunEvents(userIndex) {
  const profile = typeCatalog[(userIndex - 1) % typeCatalog.length];
  const [typeCode, typeName, richnessAxis, brothBodyAxis, impactAxis, noodleBodyAxis] = profile;
  const createdBase = Date.now() + userIndex;
  const quizRunId = `lt-${config.batchId}-run-${String(userIndex).padStart(3, "0")}-${randomUUID()}`;
  const sessionId = `lt-${config.batchId}-session-${String(userIndex).padStart(3, "0")}-${randomUUID()}`;
  const common = {
    sessionId,
    source: "ramen-style-finder",
    appVersion: "1.0.0",
    schemaVersion: "2026-05-15",
    questionnaireVersion: "v1",
    resultVersion: "v1",
    page: "/ramen-style-finder/load-test"
  };
  const answers = buildAnswerPayloads({ quizRunId, userIndex, richnessAxis, brothBodyAxis, impactAxis, noodleBodyAxis });

  return [
    envelope("quiz_started", common, createdBase, {
      quizRunId,
      startedAt: new Date(createdBase).toISOString(),
      testMode: true,
      loadTestId: config.batchId
    }),
    ...answers.map((payload, index) =>
      envelope("question_answer", common, createdBase + index + 1, {
        ...payload,
        answeredAt: new Date(createdBase + index + 1).toISOString(),
        testMode: true,
        loadTestId: config.batchId
      })
    ),
    envelope("quiz_result", common, createdBase + 100, {
      quizRunId,
      typeCode,
      typeName,
      archetypeCode: typeCode,
      archetypeName: typeName,
      mainCategory: typeCode[0] === "R" ? "pork" : typeCode[1] === "W" ? "chicken" : "seafood",
      subCategory: `${typeName} load-test`,
      axes: { richnessAxis, brothBodyAxis, impactAxis, noodleBodyAxis },
      topFlavorTags: ["load-test", typeCode.toLowerCase()],
      allergenWarnings: userIndex % 8 === 0 ? ["pork"] : [],
      recommendationSummary: `${typeName} load test result`,
      answerCount: answers.length,
      schemaVersion: "2026-05-15",
      questionnaireVersion: "v1",
      resultVersion: "v1",
      topShare: 48 + (userIndex % 8) * 3,
      secondShare: 17 + (userIndex % 5) * 2,
      borderlineCode: typeCatalog[userIndex % typeCatalog.length][0],
      borderlineDistance: 8 + (userIndex % 7) * 2,
      borderlineStrength: userIndex % 2 === 0 ? "close" : "moderate",
      reasonTop4: [
        { label: "主型四軸一致度", score: 82 },
        { label: "風味傾向一致度", score: 76 },
        { label: "麵條偏好一致度", score: 72 },
        { label: "配料偏好一致度", score: 66 }
      ],
      resultGeneratedAt: new Date(createdBase + 100).toISOString(),
      testMode: true,
      loadTestId: config.batchId
    })
  ];
}

function buildAnswerPayloads({ quizRunId, userIndex, richnessAxis, brothBodyAxis, impactAxis, noodleBodyAxis }) {
  const axisValues = {
    axis_richness: richnessAxis,
    axis_broth_body: brothBodyAxis,
    axis_impact: impactAxis,
    axis_noodle_body: noodleBodyAxis,
    noodle_thickness: noodleBodyAxis,
    noodle_firmness: clamp(noodleBodyAxis + (userIndex % 3) * 4 - 4),
    noodle_chewiness: clamp(noodleBodyAxis + (userIndex % 5) * 3 - 6)
  };

  return questionGroups.flatMap(([questionStage, ids]) =>
    ids.map((questionId, questionIndex) => {
      const isAllergen = questionStage === "ALLERGENS";
      const answerValue = isAllergen ? Number((userIndex + questionIndex) % 13 === 0) : axisValues[questionId] ?? preferenceValue(userIndex, questionIndex);
      return {
        quizRunId,
        questionId,
        questionStage,
        questionText: questionId,
        answerValue,
        answerDirection: isAllergen
          ? answerValue
            ? "selected"
            : "not_selected"
          : answerValue < 50
            ? "left"
            : answerValue > 50
              ? "right"
              : "neutral",
        questionIndex,
        isFinalSnapshot: true
      };
    })
  );
}

function validateRows(rows, httpResponses) {
  const failures = [];
  const byEventType = countBy(rows, (row) => row.eventType);
  const answers = rows.filter((row) => row.eventType === "question_answer");
  const byStage = countBy(answers, (row) => row.questionStage);
  const runs = groupBy(rows, (row) => row.quizRunId);

  if (rows.length !== expected.totalEvents) failures.push(`rows ${rows.length}, expected ${expected.totalEvents}`);
  for (const [eventType, count] of Object.entries(expected.eventTypes)) {
    if ((byEventType[eventType] ?? 0) !== count) failures.push(`${eventType} ${(byEventType[eventType] ?? 0)}, expected ${count}`);
  }
  for (const [stage, count] of Object.entries(expected.stages)) {
    if ((byStage[stage] ?? 0) !== count) failures.push(`${stage} ${(byStage[stage] ?? 0)}, expected ${count}`);
  }
  if (runs.size !== config.users) failures.push(`unique runs ${runs.size}, expected ${config.users}`);

  let completeRuns = 0;
  let resultFieldCompleteRuns = 0;
  for (const [runId, runRows] of runs) {
    const started = runRows.filter((row) => row.eventType === "quiz_started").length;
    const answerCount = runRows.filter((row) => row.eventType === "question_answer").length;
    const results = runRows.filter((row) => row.eventType === "quiz_result");
    if (started === 1 && answerCount === 39 && results.length === 1) completeRuns += 1;
    else failures.push(`${runId} shape started=${started}, answers=${answerCount}, results=${results.length}`);

    const resultPayload = parseJson(results[0]?.payload ?? "{}");
    if (
      resultPayload.answerCount === 39 &&
      resultPayload.typeCode &&
      resultPayload.archetypeCode &&
      resultPayload.mainCategory &&
      typeof resultPayload.topShare === "number" &&
      Array.isArray(resultPayload.reasonTop4)
    ) {
      resultFieldCompleteRuns += 1;
    } else {
      failures.push(`${runId} incomplete quiz_result payload`);
    }
  }

  const responseIds = new Set(httpResponses.map((item) => item.eventId).filter(Boolean));
  const rowIds = new Set(rows.map((row) => row.eventId).filter(Boolean));
  if (responseIds.size !== expected.totalEvents) failures.push(`HTTP eventIds ${responseIds.size}, expected ${expected.totalEvents}`);
  for (const eventId of responseIds) {
    if (!rowIds.has(eventId)) {
      failures.push(`missing DynamoDB row for HTTP eventId ${eventId}`);
      break;
    }
  }

  return { summary: { rows: rows.length, byEventType, byStage, uniqueRuns: runs.size, completeRuns, resultFieldCompleteRuns, failures } };
}

function envelope(eventType, common, ms, payload) {
  return { eventType, ...common, createdAt: new Date(ms).toISOString(), payload };
}

function scanBatch({ tableName, region, batchId }) {
  return JSON.parse(
    execFileSync(
      "aws",
      [
        "dynamodb",
        "scan",
        "--table-name",
        tableName,
        "--region",
        region,
        "--consistent-read",
        "--filter-expression",
        "contains(payload, :batch)",
        "--expression-attribute-values",
        JSON.stringify({ ":batch": { S: batchId } }),
        "--output",
        "json"
      ],
      { encoding: "utf8", maxBuffer: 200 * 1024 * 1024 }
    )
  );
}

function summarizeResponses(items) {
  const latencies = items.map((item) => item.latencyMs).sort((a, b) => a - b);
  return {
    summary: {
      attemptedRequests: items.length,
      okResponses: items.filter((item) => item.ok).length,
      failedResponses: items.filter((item) => !item.ok).length,
      byStatus: countBy(items, (item) => String(item.status)),
      byEventType: countBy(items, (item) => item.eventType),
      latencyMs: {
        min: latencies[0] ?? 0,
        p50: percentile(latencies, 0.5),
        p95: percentile(latencies, 0.95),
        max: latencies.at(-1) ?? 0
      }
    },
    failed: items.filter((item) => !item.ok).slice(0, 20)
  };
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) parsed[key] = "true";
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function unmarshallItem(item) {
  return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, unmarshallValue(value)]));
}

function unmarshallValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if ("S" in value) return value.S;
  if ("N" in value) {
    const number = Number(value.N);
    return Number.isFinite(number) ? number : value.N;
  }
  if ("BOOL" in value) return Boolean(value.BOOL);
  if ("NULL" in value) return null;
  if ("M" in value) return unmarshallItem(value.M);
  if ("L" in value) return value.L.map(unmarshallValue);
  return value;
}

function toCsv(rows) {
  const preferred = [
    "createdAt",
    "eventType",
    "quizRunId",
    "sessionId",
    "source",
    "appVersion",
    "page",
    "questionId",
    "questionStage",
    "questionText",
    "answerValue",
    "answerDirection",
    "isFinalSnapshot",
    "answerCount",
    "typeCode",
    "typeName",
    "payload",
    "rawEvent"
  ];
  const columns = [...new Set([...preferred, ...rows.flatMap((row) => Object.keys(row))])].filter((key) => rows.some((row) => row[key] !== undefined));
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function csvCell(value) {
  if (value === undefined || value === null) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
  return text;
}

function parseJson(value) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value ?? {};
  } catch {
    return {};
  }
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
}

function preferenceValue(userIndex, questionIndex) {
  return clamp(35 + ((userIndex * 13 + questionIndex * 17) % 50));
}

function clamp(value) {
  return Math.min(100, Math.max(0, value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPool(items, concurrency, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next];
        next += 1;
        await worker(item);
      }
    })
  );
}

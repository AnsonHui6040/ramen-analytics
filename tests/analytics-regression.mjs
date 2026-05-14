import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolve.call(this, join(root, "src", request.slice(2)), parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTs(module, filename) {
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX
    }
  }).outputText;
  module._compile(output, filename);
};

const { normalizeCsvRow } = require("../src/parser/normalize.ts");
const { buildAnalytics } = require("../src/analytics/build-analytics.ts");

function analyzeRows(rows, fileName = "fixture.csv") {
  const events = [];
  const issues = [];
  rows.forEach((row, index) => {
    const normalized = normalizeCsvRow(row, { fileName, rowNumber: index + 2 });
    if (normalized.event) events.push(normalized.event);
    issues.push(...normalized.issues);
  });
  return buildAnalytics(events, issues, false);
}

function baseRow(offsetSeconds, eventType, payload) {
  return {
    createdAt: new Date(Date.UTC(2026, 4, 15, 3, 0, offsetSeconds)).toISOString(),
    eventType,
    quizRunId: "qa-run-001",
    sessionId: "qa-session-001",
    source: "ramen-style-finder",
    appVersion: "1.0.0",
    schemaVersion: "2026-05-15",
    questionnaireVersion: "v1",
    resultVersion: "v1",
    page: "/",
    payload: JSON.stringify({ quizRunId: "qa-run-001", ...payload })
  };
}

const finalSnapshotRows = [baseRow(0, "quiz_started", { startedAt: "2026-05-15T03:00:00.000Z" })];
for (let index = 0; index < 39; index += 1) {
  finalSnapshotRows.push(
    baseRow(index + 1, "question_answer", {
      questionId: `q${String(index + 1).padStart(2, "0")}`,
      questionStage:
        index < 4
          ? "CORE_AXES"
          : index < 9
            ? "FLAVOR_PROFILE"
            : index < 17
              ? "PROTEIN_PREFERENCES"
              : index < 33
                ? "NOODLE_TOPPING"
                : "ALLERGENS",
      questionText: `Question ${index + 1}`,
      answerValue: index >= 33 ? index % 2 : 50 + (index % 5),
      answerDirection: index >= 33 ? (index % 2 ? "selected" : "not_selected") : "right",
      questionIndex: index,
      isFinalSnapshot: true
    })
  );
}
finalSnapshotRows.push(
  baseRow(45, "quiz_result", {
    typeCode: "RWHT",
    typeName: "濃白重口型",
    axes: { richnessAxis: 75, brothBodyAxis: 70, impactAxis: 80, noodleBodyAxis: 65 },
    topShare: 72,
    secondShare: 18,
    borderlineCode: "RWHF",
    borderlineDistance: 11.8,
    answerCount: 39
  })
);

const finalSnapshot = analyzeRows(finalSnapshotRows, "question-answer-final-snapshot.csv");
assert.equal(finalSnapshot.runs.length, 1);
assert.equal(finalSnapshot.runs[0]?.hasAnswerSnapshot, true);
assert.equal(finalSnapshot.runs[0]?.actualAnswerCount, 39);
assert.equal(finalSnapshot.runs[0]?.isValidCompleted, true);
assert.equal(finalSnapshot.runs[0]?.resultInsights.borderlineCode, "RWHF");
assert.equal(typeof finalSnapshot.runs[0]?.resultInsights.confidenceScore, "number");

const dynamoRow = {
  createdAt: "{\"S\":\"2026-05-15T03:00:00.000Z\"}",
  eventType: "{\"S\":\"quiz_result\"}",
  quizRunId: "{\"S\":\"dynamo-run-001\"}",
  sessionId: "{\"S\":\"dynamo-session-001\"}",
  source: "{\"S\":\"ramen-style-finder\"}",
  appVersion: "{\"S\":\"1.0.0\"}",
  page: "{\"S\":\"/\"}",
  payload: JSON.stringify({
    typeCode: "CKLF",
    typeName: "清亮細緻型",
    axes: { richnessAxis: 25, brothBodyAxis: 25, impactAxis: 25, noodleBodyAxis: 25 },
    quizRunId: "dynamo-run-001"
  })
};

const dynamo = analyzeRows([dynamoRow], "dynamodb-attribute-value.csv");
assert.equal(dynamo.events[0]?.eventType, "quiz_result");
assert.equal(dynamo.runs[0]?.typeCode, "CKLF");
assert.equal(dynamo.runs[0]?.pagePath, "/");

console.log("analytics regression checks passed");

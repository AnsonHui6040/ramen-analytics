#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const tableName = options.table ?? "RamenUserEvents";
const region = options.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "ap-east-2";
const outputPath = resolve(
  options.output ?? `exports/ramen-events-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`
);

const rows = scanAll({ tableName, region, profile: options.profile }).map(unmarshallItem);
const columns = collectColumns(rows);
const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join(
  "\n"
);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, csv);

console.log(`Exported ${rows.length} DynamoDB item(s) from ${tableName} (${region})`);
console.log(outputPath);

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function scanAll({ tableName, region, profile }) {
  const items = [];
  let exclusiveStartKey;

  do {
    const args = ["dynamodb", "scan", "--table-name", tableName, "--region", region, "--output", "json"];
    if (profile) args.push("--profile", profile);
    if (exclusiveStartKey) args.push("--exclusive-start-key", JSON.stringify(exclusiveStartKey));

    const result = JSON.parse(execFileSync("aws", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }));
    items.push(...(result.Items ?? []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

function unmarshallItem(item) {
  const output = {};
  for (const [key, value] of Object.entries(item)) {
    output[key] = unmarshallValue(value);
  }
  return output;
}

function unmarshallValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if ("S" in value) return value.S;
  if ("N" in value) {
    const number = Number(value.N);
    return Number.isFinite(number) ? number : value.N;
  }
  if ("BOOL" in value) return Boolean(value.BOOL);
  if ("NULL" in value) return "";
  if ("M" in value) return unmarshallItem(value.M);
  if ("L" in value) return value.L.map(unmarshallValue);
  if ("SS" in value) return value.SS;
  if ("NS" in value) return value.NS.map((item) => {
    const number = Number(item);
    return Number.isFinite(number) ? number : item;
  });
  return value;
}

function collectColumns(rows) {
  const preferred = [
    "createdAt",
    "timestamp",
    "eventType",
    "quizRunId",
    "sessionId",
    "source",
    "appVersion",
    "page",
    "payload",
    "rawEvent",
    "questionId",
    "questionStage",
    "questionText",
    "leftLabel",
    "rightLabel",
    "answerValue",
    "answerDirection",
    "answerLabel",
    "questionIndex",
    "isFinalSnapshot",
    "answerCount",
    "typeCode",
    "typeName",
    "rating",
    "comment"
  ];
  const seen = new Set(preferred);
  const discovered = [];

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      discovered.push(key);
    }
  }

  return [...preferred, ...discovered].filter((column) => rows.some((row) => row[column] !== undefined));
}

function csvCell(value) {
  if (value === undefined || value === null) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
  return text;
}

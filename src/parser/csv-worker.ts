import Papa from "papaparse";
import { buildAnalytics } from "@/analytics/build-analytics";
import { normalizeCsvRow } from "@/parser/normalize";
import { createIssue } from "@/validation/issues";
import type { AnalyticsDataset, FileParseSummary, ParsedEvent, ValidationIssue } from "@/types/events";

type ParseRequest = {
  type: "parse-files";
  files: File[];
  exposeComments: boolean;
};

type WorkerProgressMessage = {
  type: "progress";
  fileName: string;
  rows: number;
  percent: number;
  message: string;
};

type WorkerDoneMessage = {
  type: "done";
  dataset: AnalyticsDataset;
};

type WorkerErrorMessage = {
  type: "error";
  message: string;
};

export type CsvWorkerMessage = WorkerProgressMessage | WorkerDoneMessage | WorkerErrorMessage;

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = async (message: MessageEvent<ParseRequest>) => {
  const request = message.data;
  if (request.type !== "parse-files") return;

  try {
    const allEvents: ParsedEvent[] = [];
    const allIssues: ValidationIssue[] = [];
    const files: FileParseSummary[] = [];

    for (const file of request.files) {
      workerScope.postMessage({
        type: "progress",
        fileName: file.name,
        rows: 0,
        percent: 0,
        message: `Parsing ${file.name}`
      } satisfies WorkerProgressMessage);

      const result = await parseFile(file);
      allEvents.push(...result.events);
      allIssues.push(...result.issues);
      files.push(result.summary);
    }

    const analytics = buildAnalytics(allEvents, allIssues, request.exposeComments);
    const dataset: AnalyticsDataset = {
      generatedAt: new Date().toISOString(),
      exposeComments: request.exposeComments,
      files,
      events: analytics.events,
      runs: analytics.runs,
      issues: analytics.issues
    };

    workerScope.postMessage({
      type: "done",
      dataset
    } satisfies WorkerDoneMessage);
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Unknown CSV parsing error"
    } satisfies WorkerErrorMessage);
  }
};

function parseFile(file: File) {
  return new Promise<{
    events: ParsedEvent[];
    issues: ValidationIssue[];
    summary: FileParseSummary;
  }>((resolve, reject) => {
    const events: ParsedEvent[] = [];
    const issues: ValidationIssue[] = [];
    let rowCount = 0;
    let malformedRows = 0;
    let lastProgressAt = 0;

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      worker: false,
      step: (result) => {
        rowCount += 1;
        const rowNumber = rowCount + 1;

        for (const error of result.errors) {
          issues.push(
            createIssue({
              severity: "error",
              category: "csv_parse_error",
              message: error.message,
              fileName: file.name,
              rowNumber,
              field: error.code
            })
          );
        }

        const normalized = normalizeCsvRow(result.data, {
          fileName: file.name,
          rowNumber
        });
        if (normalized.event) events.push(normalized.event);
        issues.push(...normalized.issues);
        if (normalized.malformed) malformedRows += 1;

        const cursor = result.meta.cursor ?? rowCount;
        const percent = file.size > 0 ? Math.min(99, Math.round((cursor / file.size) * 100)) : 0;
        if (rowCount - lastProgressAt >= 750) {
          lastProgressAt = rowCount;
          workerScope.postMessage({
            type: "progress",
            fileName: file.name,
            rows: rowCount,
            percent,
            message: `Parsed ${rowCount.toLocaleString()} rows from ${file.name}`
          } satisfies WorkerProgressMessage);
        }
      },
      complete: () => {
        workerScope.postMessage({
          type: "progress",
          fileName: file.name,
          rows: rowCount,
          percent: 100,
          message: `Finished ${file.name}`
        } satisfies WorkerProgressMessage);

        resolve({
          events,
          issues,
          summary: {
            fileName: file.name,
            rowCount,
            parsedRows: events.length,
            malformedRows
          }
        });
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export {};

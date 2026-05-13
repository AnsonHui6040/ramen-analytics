"use client";

import * as React from "react";
import { createSampleCsv } from "@/data/sample-csv";
import type { AnalyticsDataset } from "@/types/events";
import type { CsvWorkerMessage } from "@/parser/csv-worker";

export type ParseStatus = "idle" | "parsing" | "ready" | "error";

export interface ParseProgress {
  fileName: string;
  rows: number;
  percent: number;
  message: string;
}

export function useCsvAnalytics() {
  const workerRef = React.useRef<Worker | null>(null);
  const filesRef = React.useRef<File[]>([]);
  const [dataset, setDataset] = React.useState<AnalyticsDataset | null>(null);
  const [status, setStatus] = React.useState<ParseStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<ParseProgress | null>(null);
  const [exposeComments, setExposeCommentsState] = React.useState(false);
  const progressLabelsRef = React.useRef({
    preparing: "Preparing parser worker",
    ready: "Analytics ready"
  });

  const terminateWorker = React.useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  React.useEffect(() => terminateWorker, [terminateWorker]);

  const parseFiles = React.useCallback(
    (
      files: File[],
      nextExposeComments = exposeComments,
      labels?: {
        preparing?: string;
        ready?: string;
      }
    ) => {
      if (!files.length) return;
      progressLabelsRef.current = {
        preparing: labels?.preparing ?? progressLabelsRef.current.preparing,
        ready: labels?.ready ?? progressLabelsRef.current.ready
      };
      terminateWorker();
      filesRef.current = files;
      setExposeCommentsState(nextExposeComments);
      setStatus("parsing");
      setError(null);
      setProgress({
        fileName: files[0].name,
        rows: 0,
        percent: 0,
        message: progressLabelsRef.current.preparing
      });

      const worker = new Worker(new URL("../parser/csv-worker.ts", import.meta.url), {
        type: "module"
      });
      workerRef.current = worker;

      worker.onmessage = (message: MessageEvent<CsvWorkerMessage>) => {
        const data = message.data;
        if (data.type === "progress") {
          setProgress(data);
          return;
        }

        if (data.type === "done") {
          setDataset(data.dataset);
          setStatus("ready");
          setProgress({
            fileName: "all files",
            rows: data.dataset.events.length,
            percent: 100,
            message: progressLabelsRef.current.ready
          });
          terminateWorker();
          return;
        }

        setError(data.message);
        setStatus("error");
        terminateWorker();
      };

      worker.onerror = (event) => {
        setError(event.message);
        setStatus("error");
        terminateWorker();
      };

      worker.postMessage({
        type: "parse-files",
        files,
        exposeComments: nextExposeComments
      });
    },
    [exposeComments, terminateWorker]
  );

  const loadSample = React.useCallback((labels?: { preparing?: string; ready?: string }) => {
    const sampleFile = new File([createSampleCsv()], "synthetic-ramen-events.csv", {
      type: "text/csv"
    });
    parseFiles([sampleFile], false, labels);
  }, [parseFiles]);

  const setExposeComments = React.useCallback(
    (next: boolean, confirmMessage?: string, labels?: { preparing?: string; ready?: string }) => {
      if (next && !window.confirm(confirmMessage ?? "Raw feedback comments may contain personal or sensitive information. Re-parse and show comments?")) {
        return;
      }
      if (filesRef.current.length) {
        parseFiles(filesRef.current, next, labels);
      } else {
        setExposeCommentsState(next);
      }
    },
    [parseFiles]
  );

  const reset = React.useCallback(() => {
    terminateWorker();
    filesRef.current = [];
    setDataset(null);
    setStatus("idle");
    setError(null);
    setProgress(null);
    setExposeCommentsState(false);
  }, [terminateWorker]);

  return {
    dataset,
    status,
    error,
    progress,
    exposeComments,
    parseFiles,
    loadSample,
    setExposeComments,
    reset
  };
}

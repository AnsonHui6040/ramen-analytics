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

  const terminateWorker = React.useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  React.useEffect(() => terminateWorker, [terminateWorker]);

  const parseFiles = React.useCallback(
    (files: File[], nextExposeComments = exposeComments) => {
      if (!files.length) return;
      terminateWorker();
      filesRef.current = files;
      setExposeCommentsState(nextExposeComments);
      setStatus("parsing");
      setError(null);
      setProgress({
        fileName: files[0].name,
        rows: 0,
        percent: 0,
        message: "Preparing parser worker"
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
            message: "Analytics ready"
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

  const loadSample = React.useCallback(() => {
    const sampleFile = new File([createSampleCsv()], "synthetic-ramen-events.csv", {
      type: "text/csv"
    });
    parseFiles([sampleFile], false);
  }, [parseFiles]);

  const setExposeComments = React.useCallback(
    (next: boolean) => {
      if (next && !window.confirm("顯示原始 feedback comments 可能包含個資或敏感內容。確定要重新解析並顯示 comments？")) {
        return;
      }
      if (filesRef.current.length) {
        parseFiles(filesRef.current, next);
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

"use client";

import * as React from "react";
import { FileUp, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ParseProgress, ParseStatus } from "@/hooks/use-csv-analytics";
import type { Dictionary, Locale } from "@/i18n/dictionary";

interface UploadZoneProps {
  status: ParseStatus;
  progress: ParseProgress | null;
  error: string | null;
  onFiles: (files: File[]) => void;
  onLoadSample: () => void;
  t: Dictionary["upload"];
  locale: Locale;
}

export function UploadZone({ status, progress, error, onFiles, onLoadSample, t, locale }: UploadZoneProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [fileTypeError, setFileTypeError] = React.useState<string | null>(null);

  const handleFiles = React.useCallback(
    (fileList: FileList | null) => {
      const files = Array.from(fileList ?? []).filter((file) => file.name.toLowerCase().endsWith(".csv"));
      if (files.length) {
        setFileTypeError(null);
        onFiles(files);
        return;
      }
      if (fileList?.length) setFileTypeError(t.invalidFileType);
    },
    [onFiles, t.invalidFileType]
  );

  return (
    <Card
      className={cn(
        "overflow-hidden border-dashed transition-colors",
        dragging && "border-primary bg-primary/5"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <CardContent className="grid gap-5 p-5 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {status === "parsing" ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <h2 className="text-lg font-semibold tracking-normal">{t.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => inputRef.current?.click()}>
                <FileUp />
                {t.chooseCsv}
              </Button>
              <Button variant="outline" onClick={onLoadSample}>
                {t.demoMode}
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-md border bg-background/55 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-primary" />
            {t.privacyTitle}
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {t.privacyItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {(progress || error || fileTypeError) && (
          <div className="md:col-span-2">
            {progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{formatProgressMessage(progress, t, locale)}</span>
                  <span className="font-medium">{progress.percent}%</span>
                </div>
                <Progress value={progress.percent} />
              </div>
            )}
            {(error || fileTypeError) && <p className="mt-3 text-sm text-destructive">{error ?? fileTypeError}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatProgressMessage(progress: ParseProgress, t: Dictionary["upload"], locale: Locale) {
  if (progress.percent === 100) {
    if (progress.fileName === "all files") return t.progressReady;
    return t.finishedFile(progress.fileName);
  }
  if (progress.rows > 0) {
    return t.parsedRows(formatRows(progress.rows, locale), progress.fileName);
  }
  return progress.message === "Preparing parser worker" ? t.progressPreparing : t.parsingFile(progress.fileName);
}

function formatRows(rows: number, locale: Locale) {
  return rows.toLocaleString(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-US");
}

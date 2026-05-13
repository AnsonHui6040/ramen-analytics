"use client";

import * as React from "react";
import { FileUp, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ParseProgress, ParseStatus } from "@/hooks/use-csv-analytics";

interface UploadZoneProps {
  status: ParseStatus;
  progress: ParseProgress | null;
  error: string | null;
  onFiles: (files: File[]) => void;
  onLoadSample: () => void;
}

export function UploadZone({ status, progress, error, onFiles, onLoadSample }: UploadZoneProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleFiles = React.useCallback(
    (fileList: FileList | null) => {
      const files = Array.from(fileList ?? []).filter((file) => file.name.toLowerCase().endsWith(".csv"));
      if (files.length) onFiles(files);
    },
    [onFiles]
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
              <h2 className="text-lg font-semibold tracking-normal">Upload quiz event CSV</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                支援多個 CSV 檔案，本機瀏覽器解析，不會自動上傳到任何伺服器。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => inputRef.current?.click()}>
                <FileUp />
                選擇 CSV
              </Button>
              <Button variant="outline" onClick={onLoadSample}>
                Demo mode
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
            Privacy defaults
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>IDs 只顯示 hash，不顯示 raw sessionId 或 quizRunId。</li>
            <li>load-test runs 預設排除於 valid stats。</li>
            <li>feedback comments 預設隱藏，需要確認後才重新解析顯示。</li>
          </ul>
        </div>

        {(progress || error) && (
          <div className="md:col-span-2">
            {progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{progress.message}</span>
                  <span className="font-medium">{progress.percent}%</span>
                </div>
                <Progress value={progress.percent} />
              </div>
            )}
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

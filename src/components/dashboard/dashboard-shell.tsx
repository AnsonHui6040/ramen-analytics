"use client";

import * as React from "react";
import { Download, FileJson, Moon, RefreshCw, Sun } from "lucide-react";
import { DEFAULT_FILTERS } from "@/analytics/filters";
import { buildDashboardView } from "@/chart-transformers/dashboard-transformers";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { DataTables } from "@/components/dashboard/data-tables";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { UploadZone } from "@/components/dashboard/upload-zone";
import { ValidationPanel } from "@/components/dashboard/validation-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useCsvAnalytics } from "@/hooks/use-csv-analytics";
import { downloadBlob, toCsv } from "@/lib/utils";
import type { DashboardFilters } from "@/types/analytics";

export function DashboardShell() {
  const {
    dataset,
    status,
    error,
    progress,
    exposeComments,
    parseFiles,
    loadSample,
    setExposeComments,
    reset
  } = useCsvAnalytics();
  const [filters, setFilters] = React.useState<DashboardFilters>(DEFAULT_FILTERS);
  const [compareTypeCodes, setCompareTypeCodes] = React.useState<string[]>([]);
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem("ramen-analytics-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = stored ? stored === "dark" : prefersDark;
    setDarkMode(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
  }, []);

  const view = React.useMemo(
    () => buildDashboardView(dataset, filters, compareTypeCodes),
    [dataset, filters, compareTypeCodes]
  );

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("ramen-analytics-theme", next ? "dark" : "light");
  };

  const exportFilteredCsv = () => {
    downloadBlob("ramen-analytics-filtered-runs.csv", toCsv(view.runRows), "text/csv;charset=utf-8");
  };

  const exportSummaryJson = () => {
    downloadBlob(
      "ramen-analytics-summary.json",
      JSON.stringify(
        {
          generatedAt: dataset?.generatedAt ?? new Date().toISOString(),
          filters,
          metrics: view.metrics,
          typeDistribution: view.typeDistribution,
          axisRadar: view.axisRadar,
          funnel: view.funnel,
          questionDirection: view.questionDirection,
          feedbackRatings: view.feedbackRatings,
          flavorTags: view.flavorTags,
          allergenWarnings: view.allergenWarnings,
          versionAnalysis: view.versionAnalysis,
          validationIssueCount: view.issueRows.length
        },
        null,
        2
      ),
      "application/json;charset=utf-8"
    );
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setCompareTypeCodes([]);
  };

  const handleFullReset = () => {
    handleReset();
    reset();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_32rem),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.10),transparent_28rem)]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">ramen-style-finder CSV analytics</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal md:text-4xl">Ramen Analytics</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              本機解析 quiz event CSV，聚焦 proportions、distributions、completion rates、answer patterns 與 feedback quality。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle dark mode">
              {darkMode ? <Sun /> : <Moon />}
            </Button>
            <Button variant="outline" onClick={exportFilteredCsv} disabled={!dataset}>
              <Download />
              Filtered CSV
            </Button>
            <Button variant="outline" onClick={exportSummaryJson} disabled={!dataset}>
              <FileJson />
              Summary JSON
            </Button>
            <Button variant="outline" onClick={handleFullReset} disabled={!dataset && status === "idle"}>
              <RefreshCw />
              Reset
            </Button>
          </div>
        </header>

        <UploadZone status={status} progress={progress} error={error} onFiles={parseFiles} onLoadSample={loadSample} />

        {dataset ? (
          <>
            <Card>
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-sm text-muted-foreground">
                  Loaded {dataset.files.length} file(s), {dataset.events.length.toLocaleString()} event rows,{" "}
                  {dataset.runs.length.toLocaleString()} hashed quiz runs.
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">顯示 feedback comments</span>
                  <Switch checked={exposeComments} onCheckedChange={setExposeComments} />
                </div>
              </CardContent>
            </Card>

            <FilterBar
              filters={filters}
              onFiltersChange={setFilters}
              onReset={handleReset}
              typeCodes={view.availableTypeCodes}
              appVersions={view.availableAppVersions}
              sources={view.availableSources}
            />

            <KpiGrid metrics={view.metrics} />
            <AnalyticsCharts
              view={view}
              compareTypeCodes={compareTypeCodes}
              onCompareTypeCodesChange={setCompareTypeCodes}
            />
            <ValidationPanel issues={view.issueRows} />
            <DataTables view={view} />
          </>
        ) : (
          <MockPreview />
        )}
      </div>
    </main>
  );
}

function MockPreview() {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardContent className="p-5">
          <h2 className="text-base font-semibold">Demo preview</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            點 Demo mode 會載入 synthetic sample CSV，包含 valid runs、load-test 排除、duplicate answer_snapshot、
            incomplete run 與 malformed JSON 範例。
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {["Type donut", "Axis radar", "Completion funnel", "Validation issues"].map((label) => (
              <div key={label} className="rounded-md border bg-background/55 p-4">
                <div className="h-2 w-16 rounded-full bg-primary/50" />
                <div className="mt-4 h-16 rounded-md bg-muted/70" />
                <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
          {[
            ["100k+ rows", "Worker parsing and memoized dashboard transforms"],
            ["Privacy", "No backend, hashed IDs, hidden comments by default"],
            ["Exports", "Filtered CSV, summary JSON, PNG chart screenshots"],
            ["Validation", "Malformed JSON, duplicates, answer mismatches, incomplete runs"]
          ].map(([title, body]) => (
            <div key={title} className="rounded-md border bg-background/55 p-4">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

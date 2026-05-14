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
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCsvAnalytics } from "@/hooks/use-csv-analytics";
import { dictionaries, isLocale, localeNames, type Dictionary, type Locale } from "@/i18n/dictionary";
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
  const [locale, setLocale] = React.useState<Locale>("zh");
  const t = dictionaries[locale];

  React.useEffect(() => {
    const stored = window.localStorage.getItem("ramen-analytics-theme");
    const storedLocale = window.localStorage.getItem("ramen-analytics-locale");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = stored ? stored === "dark" : prefersDark;
    setDarkMode(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
    if (isLocale(storedLocale)) {
      setLocale(storedLocale);
      document.documentElement.lang = storedLocale === "zh" ? "zh-Hant" : storedLocale;
    }
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

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale === "zh" ? "zh-Hant" : nextLocale;
    window.localStorage.setItem("ramen-analytics-locale", nextLocale);
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
          axisTypeRankings: view.axisTypeRankings,
          preferenceHighlights: view.preferenceHighlights,
          funnel: view.funnel,
          questionDirection: view.questionDirection,
          questionnaireInfluence: view.questionnaireInfluence,
          feedbackRatings: view.feedbackRatings,
          flavorTags: view.flavorTags,
          allergenWarnings: view.allergenWarnings,
          issuePareto: view.issuePareto,
          personaSegments: view.personaSegments,
          dataQualityRows: view.dataQualityRows,
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

  const parseFilesWithLocale = (files: File[]) => {
    parseFiles(files, exposeComments, {
      preparing: t.upload.progressPreparing,
      ready: t.upload.progressReady
    });
  };

  const loadSampleWithLocale = () => {
    loadSample({
      preparing: t.upload.progressPreparing,
      ready: t.upload.progressReady
    });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_32rem),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.10),transparent_28rem)]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">{t.app.eyebrow}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal md:text-4xl">{t.app.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {t.app.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={locale}
              onChange={(event) => handleLocaleChange(event.target.value as Locale)}
              className="w-[118px]"
              aria-label="Language"
            >
              {Object.entries(localeNames).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label={t.app.darkMode}>
              {darkMode ? <Sun /> : <Moon />}
            </Button>
            <Button variant="outline" onClick={exportFilteredCsv} disabled={!dataset}>
              <Download />
              {t.app.filteredCsv}
            </Button>
            <Button variant="outline" onClick={exportSummaryJson} disabled={!dataset}>
              <FileJson />
              {t.app.summaryJson}
            </Button>
            <Button variant="outline" onClick={handleFullReset} disabled={!dataset && status === "idle"}>
              <RefreshCw />
              {t.app.reset}
            </Button>
          </div>
        </header>

        <UploadZone
          status={status}
          progress={progress}
          error={error}
          onFiles={parseFilesWithLocale}
          onLoadSample={loadSampleWithLocale}
          t={t.upload}
          locale={locale}
        />

        {dataset ? (
          <>
            <Card>
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-sm text-muted-foreground">
                  {t.loaded.summary(
                    dataset.files.length,
                    dataset.events.length.toLocaleString(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-US"),
                    dataset.runs.length.toLocaleString(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-US")
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{t.loaded.exposeComments}</span>
                  <Switch
                    checked={exposeComments}
                    onCheckedChange={(next) =>
                      setExposeComments(next, t.loaded.exposeConfirm, {
                        preparing: t.upload.progressPreparing,
                        ready: t.upload.progressReady
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {dataset.runs.length > 0 && dataset.runs.every((run) => run.isLoadTest) && (
              <Card className="border-primary/35 bg-primary/5">
                <CardContent className="p-4 text-sm text-muted-foreground">{t.loaded.loadTestOnly}</CardContent>
              </Card>
            )}

            <FilterBar
              filters={filters}
              onFiltersChange={setFilters}
              onReset={handleReset}
              typeCodes={view.availableTypeCodes}
              appVersions={view.availableAppVersions}
              sources={view.availableSources}
              t={t.filters}
              sourceLabels={t.values.sourceLabels}
            />

            <KpiGrid metrics={view.metrics} t={t.kpi} locale={locale} />
            <AnalyticsCharts
              view={view}
              compareTypeCodes={compareTypeCodes}
              onCompareTypeCodesChange={setCompareTypeCodes}
              t={t}
              locale={locale}
            />
            <ValidationPanel issues={view.issueRows} t={t} locale={locale} />
            <DataTables view={view} t={t} locale={locale} />
          </>
        ) : (
          <MockPreview t={t.demo} />
        )}
      </div>
    </main>
  );
}

function MockPreview({ t }: { t: Dictionary["demo"] }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardContent className="p-5">
          <h2 className="text-base font-semibold">{t.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.description}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {t.tiles.map((label) => (
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
          {t.cards.map(([title, body]) => (
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

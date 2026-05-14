"use client";

import * as React from "react";
import { Camera, Check } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { localizeChoiceLabel, localizeQuestionLabel } from "@/analytics/questionnaire-baseline";
import type { Dictionary, Locale } from "@/i18n/dictionary";
import { formatDecimal, formatNumber, formatPercent } from "@/lib/utils";
import type { DashboardView, PreferenceHighlightRow, TagRow, TypeDistributionRow } from "@/types/analytics";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))"
];

interface AnalyticsChartsProps {
  view: DashboardView;
  compareTypeCodes: string[];
  onCompareTypeCodesChange: (typeCodes: string[]) => void;
  t: Dictionary;
  locale: Locale;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--popover-foreground))"
};

export function AnalyticsCharts({ view, compareTypeCodes, onCompareTypeCodesChange, t, locale }: AnalyticsChartsProps) {
  const selectableTypes = view.typeDistribution.slice(0, 8).map((row) => row.typeCode);
  const axisData = React.useMemo(
    () =>
      view.axisRadar.map((row) => ({
        ...row,
        axisLabel: t.axes[row.axis]
      })),
    [t, view.axisRadar]
  );
  const funnelData = React.useMemo(
    () =>
      view.funnel.map((row) => ({
        ...row,
        label: t.funnelStages[row.name as keyof typeof t.funnelStages] ?? row.name
      })),
    [t, view.funnel]
  );
  const questionDirectionData = React.useMemo(
    () =>
      view.questionDirection.map((row, index) => ({
        ...row,
        questionDisplay: `Q${index + 1}`,
        stageLabel: t.stageLabels[row.questionStage as keyof typeof t.stageLabels] ?? row.questionStage,
        localizedQuestionLabel: localizeQuestionLabel(row.questionId, row.questionLabel, locale)
      })),
    [locale, t, view.questionDirection]
  );
  const influenceData = React.useMemo(
    () =>
      view.questionnaireInfluence.map((row) => ({
        ...row,
        label: t.influenceComponents[row.component as keyof typeof t.influenceComponents] ?? row.label,
        note: t.charts.questionnaireInfluence.notes[row.noteKey]
      })),
    [t, view.questionnaireInfluence]
  );
  const flavorTagData = React.useMemo(
    () => view.flavorTags.map((row) => ({ ...row, name: localizeTagLabel(row.name, locale) })),
    [locale, view.flavorTags]
  );
  const allergenWarningData = React.useMemo(
    () => view.allergenWarnings.map((row) => ({ ...row, name: localizeTagLabel(row.name, locale) })),
    [locale, view.allergenWarnings]
  );
  const preferenceHighlightData = React.useMemo(
    () =>
      view.preferenceHighlights.map((row) => ({
        ...row,
        label: localizeQuestionLabel(row.questionId, row.label, locale),
        valueLabel:
          row.valueLabel === "selected"
            ? t.charts.directionLabels.selected
            : localizeChoiceLabel(row.questionId, "right", row.valueLabel, locale)
      })),
    [locale, t, view.preferenceHighlights]
  );

  const toggleType = (typeCode: string) => {
    const active = compareTypeCodes.includes(typeCode);
    if (active) {
      onCompareTypeCodesChange(compareTypeCodes.filter((item) => item !== typeCode));
      return;
    }
    onCompareTypeCodesChange([...compareTypeCodes, typeCode].slice(-4));
  };

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ChartPanel
        id="chart-type-distribution"
        title={t.charts.typeDistribution.title}
        description={t.charts.typeDistribution.description}
        exportLabel={t.charts.exportPng(t.charts.typeDistribution.title)}
        errorLabel={t.charts.pngExportFailed}
        className="xl:col-span-2"
      >
        {view.typeDistribution.length ? (
          <TypeDistributionGrid rows={view.typeDistribution} locale={locale} />
        ) : (
          <NoData label={t.charts.noData} />
        )}
      </ChartPanel>

      <ChartPanel
        id="chart-axis-analysis"
        title={t.charts.axisAnalysis.title}
        description={t.charts.axisAnalysis.description}
        exportLabel={t.charts.exportPng(t.charts.axisAnalysis.title)}
        errorLabel={t.charts.pngExportFailed}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {selectableTypes.map((typeCode) => {
            const active = compareTypeCodes.includes(typeCode);
            return (
              <Button
                key={typeCode}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => toggleType(typeCode)}
                className="h-8"
              >
                {active && <Check className="size-3.5" />}
                {typeCode}
              </Button>
            );
          })}
        </div>
        {axisData.length ? (
          <AxisPercentagePanel
            rows={axisData}
            compareTypeCodes={view.compareTypeCodes}
            overallLabel={t.charts.axisAnalysis.overall}
            locale={locale}
          />
        ) : (
          <NoData label={t.charts.noData} />
        )}
      </ChartPanel>

      <ChartPanel
        id="chart-questionnaire-influence"
        title={t.charts.questionnaireInfluence.title}
        description={t.charts.questionnaireInfluence.description}
        exportLabel={t.charts.exportPng(t.charts.questionnaireInfluence.title)}
        errorLabel={t.charts.pngExportFailed}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={influenceData} layout="vertical" margin={{ left: 22, right: 18, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 45]} tickFormatter={(value) => `${value}%`} />
            <YAxis dataKey="label" type="category" width={126} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              formatter={(value, _name, item) => [
                `${formatNumber(Number(value), undefined, locale)}%`,
                item.payload.note
              ]}
            />
            <Bar dataKey="weight" name={t.charts.questionnaireInfluence.weight} fill={COLORS[4]} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel
        id="chart-completion-funnel"
        title={t.charts.completionFunnel.title}
        description={t.charts.completionFunnel.description}
        exportLabel={t.charts.exportPng(t.charts.completionFunnel.title)}
        errorLabel={t.charts.pngExportFailed}
      >
        {funnelData.some((row) => row.value > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart margin={{ left: 24, right: 132, top: 8, bottom: 8 }}>
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                formatter={(value) => formatNumberForLocale(Number(value), locale)}
                labelFormatter={(label) => t.funnelStages[label as keyof typeof t.funnelStages] ?? label}
              />
              <Funnel dataKey="value" nameKey="name" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="label" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        ) : (
          <NoData label={t.charts.noData} />
        )}
      </ChartPanel>

      <ChartPanel
        id="chart-question-direction"
        title={t.charts.questionDirection.title}
        description={t.charts.questionDirection.description}
        exportLabel={t.charts.exportPng(t.charts.questionDirection.title)}
        errorLabel={t.charts.pngExportFailed}
      >
        {questionDirectionData.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={questionDirectionData} margin={{ left: 8, right: 8, top: 8, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="questionDisplay" angle={-25} textAnchor="end" interval={0} height={58} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                formatter={(value, name) => [`${value}%`, name]}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload;
                  return row ? `${row.stageLabel} · ${row.localizedQuestionLabel}` : t.charts.questionDirection.question;
                }}
              />
              <Legend />
              <Bar dataKey="left" name={t.charts.directionLabels.left} stackId="direction" fill={COLORS[3]} />
              <Bar dataKey="right" name={t.charts.directionLabels.right} stackId="direction" fill={COLORS[0]} />
              <Bar dataKey="neutral" name={t.charts.directionLabels.neutral} stackId="direction" fill={COLORS[1]} />
              <Bar dataKey="selected" name={t.charts.directionLabels.selected} stackId="direction" fill={COLORS[4]} />
              <Bar dataKey="not_selected" name={t.charts.directionLabels.not_selected} stackId="direction" fill={COLORS[2]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData label={t.charts.noData} />
        )}
      </ChartPanel>

      <ChartPanel
        id="chart-feedback-rating"
        title={t.charts.feedbackRating.title}
        description={t.charts.feedbackRating.description}
        exportLabel={t.charts.exportPng(t.charts.feedbackRating.title)}
        errorLabel={t.charts.pngExportFailed}
      >
        <div className="mb-2 text-sm text-muted-foreground">
          {t.charts.feedbackRating.average}: {formatDecimal(view.metrics.averageRating, 2, locale)}
        </div>
        {view.feedbackRatings.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={view.feedbackRatings} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="rating" />
              <YAxis allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--popover-foreground))" }} />
              <Bar dataKey="count" name={t.charts.feedbackRating.title} fill={COLORS[2]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData label={t.charts.noData} />
        )}
      </ChartPanel>

      <ChartPanel
        id="chart-flavor-tags"
        title={t.charts.flavorTags.title}
        description={t.charts.flavorTags.description}
        exportLabel={t.charts.exportPng(t.charts.flavorTags.title)}
        errorLabel={t.charts.pngExportFailed}
      >
        {flavorTagData.length ? (
          <PercentageTiles rows={flavorTagData} locale={locale} />
        ) : (
          <NoData label={t.charts.noData} />
        )}
      </ChartPanel>

      <ChartPanel
        id="chart-allergens"
        title={t.charts.allergens.title}
        description={t.charts.allergens.description}
        exportLabel={t.charts.exportPng(t.charts.allergens.title)}
        errorLabel={t.charts.pngExportFailed}
      >
        {allergenWarningData.length ? (
          <PercentageTiles rows={allergenWarningData} locale={locale} />
        ) : (
          <NoData label={t.charts.noData} />
        )}
      </ChartPanel>

      <ChartPanel
        id="chart-preference-highlights"
        title={t.charts.preferenceHighlights.title}
        description={t.charts.preferenceHighlights.description}
        exportLabel={t.charts.exportPng(t.charts.preferenceHighlights.title)}
        errorLabel={t.charts.pngExportFailed}
      >
        {preferenceHighlightData.length ? (
          <PreferenceHighlightGrid rows={preferenceHighlightData} t={t} locale={locale} />
        ) : (
          <NoData label={t.charts.noData} />
        )}
      </ChartPanel>

      <ChartPanel
        id="chart-version-analysis"
        title={t.charts.versionAnalysis.title}
        description={t.charts.versionAnalysis.description}
        exportLabel={t.charts.exportPng(t.charts.versionAnalysis.title)}
        errorLabel={t.charts.pngExportFailed}
      >
        {view.versionAnalysis.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={view.versionAnalysis} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="appVersion" />
              <YAxis yAxisId="rate" tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
              <YAxis yAxisId="rating" orientation="right" domain={[0, 5]} />
              <Tooltip
                formatter={(value, name, item) => {
                  const key = String(item.dataKey ?? name);
                  const translatedName = t.charts.versionSeries[key as keyof typeof t.charts.versionSeries] ?? name;
                  if (key === "averageRating") return [formatDecimal(Number(value), 2, locale), translatedName];
                  return [formatPercent(Number(value), 1, locale), translatedName];
                }}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              />
              <Legend />
              <Line yAxisId="rate" type="monotone" dataKey="completionRate" name={t.charts.versionSeries.completionRate} stroke={COLORS[0]} strokeWidth={2} />
              <Line yAxisId="rate" type="monotone" dataKey="feedbackRate" name={t.charts.versionSeries.feedbackRate} stroke={COLORS[2]} strokeWidth={2} />
              <Line yAxisId="rating" type="monotone" dataKey="averageRating" name={t.charts.versionSeries.averageRating} stroke={COLORS[1]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <NoData label={t.charts.noData} />
        )}
      </ChartPanel>
    </section>
  );
}

function ChartPanel({
  id,
  title,
  description,
  exportLabel,
  errorLabel,
  children,
  className = ""
}: {
  id: string;
  title: string;
  description: string;
  exportLabel: string;
  errorLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card id={id} className={`min-h-[360px] animate-fade-in overflow-hidden ${className}`}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={() => exportChartPng(id, errorLabel)} aria-label={exportLabel}>
          <Camera />
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TypeDistributionGrid({ rows, locale }: { rows: TypeDistributionRow[]; locale: Locale }) {
  const maxPercentage = Math.max(...rows.map((row) => row.percentage), 0.01);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {rows.map((row, index) => {
        const active = row.count > 0;
        return (
          <div
            key={row.typeCode}
            className={`min-h-[116px] rounded-md border p-3 ${active ? "bg-background/80" : "bg-muted/25 text-muted-foreground"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{row.typeCode}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.typeName}</div>
              </div>
              <div className="text-right text-base font-semibold">{formatPercent(row.percentage, 1, locale)}</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max(2, (row.percentage / maxPercentage) * 100)}%`,
                  backgroundColor: COLORS[index % COLORS.length],
                  opacity: active ? 1 : 0.24
                }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{formatNumberForLocale(row.count, locale)} runs</div>
          </div>
        );
      })}
    </div>
  );
}

function AxisPercentagePanel({
  rows,
  compareTypeCodes,
  overallLabel,
  locale
}: {
  rows: Array<Record<string, string | number>>;
  compareTypeCodes: string[];
  overallLabel: string;
  locale: Locale;
}) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={String(row.axis)} className="rounded-md border bg-background/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{row.axisLabel}</div>
            <div className="text-lg font-semibold">{formatPercent(Number(row.overall) / 100, 1, locale)}</div>
          </div>
          <PercentBar value={Number(row.overall)} color={COLORS[0]} />
          {compareTypeCodes.length > 0 && (
            <div className="mt-3 grid gap-2">
              {compareTypeCodes.map((typeCode, index) => (
                <div key={typeCode} className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2 text-xs">
                  <span className="font-medium text-muted-foreground">{typeCode}</span>
                  <PercentBar value={Number(row[typeCode] ?? 0)} color={COLORS[(index + 1) % COLORS.length]} compact />
                  <span className="text-right text-muted-foreground">
                    {formatPercent(Number(row[typeCode] ?? 0) / 100, 0, locale)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">{overallLabel}</div>
        </div>
      ))}
    </div>
  );
}

function PreferenceHighlightGrid({
  rows,
  t,
  locale
}: {
  rows: Array<PreferenceHighlightRow & { label: string; valueLabel: string }>;
  t: Dictionary;
  locale: Locale;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.slice(0, 12).map((row, index) => (
        <div key={`${row.id}-${row.valueLabel}`} className="rounded-md border bg-background/70 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground">
                {t.preferenceCategories[row.category]}
              </div>
              <div className="mt-1 line-clamp-2 text-sm font-semibold">{row.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{row.valueLabel}</div>
            </div>
            <div className="text-lg font-semibold">{formatPercent(row.percentage, 1, locale)}</div>
          </div>
          <PercentBar value={row.percentage * 100} color={COLORS[index % COLORS.length]} />
          <div className="mt-2 text-xs text-muted-foreground">n={formatNumberForLocale(row.sampleSize, locale)}</div>
        </div>
      ))}
    </div>
  );
}

function PercentageTiles({ rows, locale }: { rows: TagRow[]; locale: Locale }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.slice(0, 10).map((row, index) => (
        <div key={row.name} className="rounded-md border bg-background/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 truncate text-sm font-semibold">{row.name}</div>
            <div className="text-base font-semibold">{formatPercent(row.percentage, 1, locale)}</div>
          </div>
          <PercentBar value={row.percentage * 100} color={COLORS[index % COLORS.length]} />
          <div className="mt-2 text-xs text-muted-foreground">{formatNumberForLocale(row.value, locale)} runs</div>
        </div>
      ))}
    </div>
  );
}

function PercentBar({ value, color, compact = false }: { value: number; color: string; compact?: boolean }) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className={`${compact ? "h-1.5" : "mt-3 h-2"} rounded-full bg-muted`}>
      <div className={`${compact ? "h-1.5" : "h-2"} rounded-full`} style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

function NoData({ label = "No chart data for current filters" }: { label?: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed bg-muted/25 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function formatNumberForLocale(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-US").format(value);
}

function localizeTagLabel(name: string, locale: Locale) {
  const labels: Record<Locale, Record<string, string>> = {
    zh: {
      "load-test": "壓力測試",
      creamy: "乳化濃厚",
      rich: "濃郁",
      balanced: "平衡",
      aromatic: "香氣",
      savory: "鮮味",
      soy: "醬油",
      wheat: "小麥",
      pork: "豬肉",
      egg: "蛋",
      milk: "乳製品",
      shellfish: "貝類",
      crustacean: "甲殼類"
    },
    en: {
      "load-test": "load-test"
    },
    ja: {
      "load-test": "負荷テスト",
      creamy: "クリーミー",
      rich: "濃厚",
      balanced: "バランス",
      aromatic: "香り",
      savory: "旨味",
      soy: "醤油",
      wheat: "小麦",
      pork: "豚肉",
      egg: "卵",
      milk: "乳製品",
      shellfish: "貝類",
      crustacean: "甲殻類"
    }
  };

  return labels[locale][name] ?? name;
}

async function exportChartPng(id: string, errorLabel: string) {
  const node = document.getElementById(id);
  if (!node) return;
  try {
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(node, {
      cacheBust: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      pixelRatio: 2
    });
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `${id}.png`;
    anchor.click();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : errorLabel);
  }
}

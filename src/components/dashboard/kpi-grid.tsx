import { AlertTriangle, CheckCircle2, CircleSlash, Gauge, MessageSquare, Star, TimerReset, Workflow } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Dictionary, Locale } from "@/i18n/dictionary";
import { formatDecimal, formatNumber, formatPercent } from "@/lib/utils";
import type { DashboardMetrics } from "@/types/analytics";

const kpiConfig = [
  {
    key: "totalQuizRuns",
    icon: Workflow,
    format: (value: DashboardMetrics, locale: Locale) => formatNumber(value.totalQuizRuns, undefined, locale)
  },
  {
    key: "validCompletedRuns",
    icon: CheckCircle2,
    format: (value: DashboardMetrics, locale: Locale) => formatNumber(value.validCompletedRuns, undefined, locale)
  },
  {
    key: "excludedLoadTestRuns",
    icon: CircleSlash,
    format: (value: DashboardMetrics, locale: Locale) => formatNumber(value.excludedLoadTestRuns, undefined, locale)
  },
  {
    key: "completionRate",
    icon: Gauge,
    format: (value: DashboardMetrics, locale: Locale) => formatPercent(value.completionRate, 1, locale)
  },
  {
    key: "feedbackRate",
    icon: MessageSquare,
    format: (value: DashboardMetrics, locale: Locale) => formatPercent(value.feedbackRate, 1, locale)
  },
  {
    key: "averageRating",
    icon: Star,
    format: (value: DashboardMetrics, locale: Locale) => formatDecimal(value.averageRating, 2, locale)
  },
  {
    key: "malformedRows",
    icon: AlertTriangle,
    format: (value: DashboardMetrics, locale: Locale) => formatNumber(value.malformedRows, undefined, locale)
  },
  {
    key: "duplicateEventCounts",
    icon: TimerReset,
    format: (value: DashboardMetrics, locale: Locale) => formatNumber(value.duplicateEventCounts, undefined, locale)
  }
] as const;

export function KpiGrid({
  metrics,
  t,
  locale
}: {
  metrics: DashboardMetrics;
  t: Dictionary["kpi"];
  locale: Locale;
}) {
  return (
    <section className="grid metric-grid gap-3">
      {kpiConfig.map((item) => {
        const Icon = item.icon;
        const label = t[item.key];
        return (
          <Card key={item.key} className="animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="min-h-8 text-xs font-medium uppercase leading-4 text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-normal">{item.format(metrics, locale)}</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

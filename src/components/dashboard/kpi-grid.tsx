import { AlertTriangle, CheckCircle2, CircleSlash, Gauge, MessageSquare, Star, TimerReset, Workflow } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDecimal, formatNumber, formatPercent } from "@/lib/utils";
import type { DashboardMetrics } from "@/types/analytics";

const kpiConfig = [
  {
    key: "totalQuizRuns",
    label: "Total quiz runs",
    icon: Workflow,
    format: (value: DashboardMetrics) => formatNumber(value.totalQuizRuns)
  },
  {
    key: "validCompletedRuns",
    label: "Valid completed",
    icon: CheckCircle2,
    format: (value: DashboardMetrics) => formatNumber(value.validCompletedRuns)
  },
  {
    key: "excludedLoadTestRuns",
    label: "Excluded load-test",
    icon: CircleSlash,
    format: (value: DashboardMetrics) => formatNumber(value.excludedLoadTestRuns)
  },
  {
    key: "completionRate",
    label: "Completion rate",
    icon: Gauge,
    format: (value: DashboardMetrics) => formatPercent(value.completionRate)
  },
  {
    key: "feedbackRate",
    label: "Feedback rate",
    icon: MessageSquare,
    format: (value: DashboardMetrics) => formatPercent(value.feedbackRate)
  },
  {
    key: "averageRating",
    label: "Average rating",
    icon: Star,
    format: (value: DashboardMetrics) => formatDecimal(value.averageRating)
  },
  {
    key: "malformedRows",
    label: "Malformed rows",
    icon: AlertTriangle,
    format: (value: DashboardMetrics) => formatNumber(value.malformedRows)
  },
  {
    key: "duplicateEventCounts",
    label: "Duplicate events",
    icon: TimerReset,
    format: (value: DashboardMetrics) => formatNumber(value.duplicateEventCounts)
  }
] as const;

export function KpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <section className="grid metric-grid gap-3">
      {kpiConfig.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-normal">{item.format(metrics)}</p>
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

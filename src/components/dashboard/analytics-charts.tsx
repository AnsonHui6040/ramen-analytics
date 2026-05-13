"use client";

import * as React from "react";
import { Camera, Check } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDecimal, formatPercent } from "@/lib/utils";
import type { DashboardView } from "@/types/analytics";

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
}

export function AnalyticsCharts({ view, compareTypeCodes, onCompareTypeCodesChange }: AnalyticsChartsProps) {
  const selectableTypes = view.typeDistribution.slice(0, 8).map((row) => row.typeCode);

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
      <ChartPanel id="chart-type-distribution" title="Type Distribution" description="typeCode / typeName proportions">
        {view.typeDistribution.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={view.typeDistribution}
                dataKey="count"
                nameKey="typeCode"
                innerRadius={72}
                outerRadius={108}
                paddingAngle={3}
              >
                {view.typeDistribution.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, _name, item) => [value, item.payload.typeName]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartPanel>

      <ChartPanel id="chart-axis-analysis" title="Axis Analysis" description="overall averages and selected type comparison">
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
        {view.axisRadar.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={view.axisRadar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" />
              <PolarRadiusAxis />
              <Radar name="overall" dataKey="overall" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.16} />
              {view.compareTypeCodes.map((typeCode, index) => (
                <Radar
                  key={typeCode}
                  name={typeCode}
                  dataKey={typeCode}
                  stroke={COLORS[(index + 1) % COLORS.length]}
                  fill={COLORS[(index + 1) % COLORS.length]}
                  fillOpacity={0.08}
                />
              ))}
              <Tooltip formatter={(value) => formatDecimal(Number(value), 2)} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartPanel>

      <ChartPanel id="chart-completion-funnel" title="Completion Funnel" description="quiz_started to valid_completed">
        {view.funnel.some((row) => row.value > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={view.funnel} isAnimationActive>
                <LabelList position="right" fill="currentColor" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartPanel>

      <ChartPanel
        id="chart-question-direction"
        title="Question Direction Distribution"
        description="left / right / neutral / selected / not_selected by question"
      >
        {view.questionDirection.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={view.questionDirection} margin={{ left: 8, right: 8, top: 8, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="questionId" angle={-25} textAnchor="end" interval={0} height={58} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value) => [`${value}%`, "share"]} labelFormatter={(label) => `Question ${label}`} />
              <Legend />
              <Bar dataKey="left" stackId="direction" fill={COLORS[3]} />
              <Bar dataKey="right" stackId="direction" fill={COLORS[0]} />
              <Bar dataKey="neutral" stackId="direction" fill={COLORS[1]} />
              <Bar dataKey="selected" stackId="direction" fill={COLORS[4]} />
              <Bar dataKey="not_selected" stackId="direction" fill={COLORS[2]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartPanel>

      <ChartPanel id="chart-feedback-rating" title="Feedback Rating Distribution" description="rating histogram and average">
        <div className="mb-2 text-sm text-muted-foreground">Average rating: {formatDecimal(view.metrics.averageRating)}</div>
        {view.feedbackRatings.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={view.feedbackRatings} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="rating" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS[2]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartPanel>

      <ChartPanel id="chart-flavor-tags" title="Flavor Tag Analysis" description="top flavor tags from quiz_result payload">
        {view.flavorTags.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <Treemap data={view.flavorTags} dataKey="value" nameKey="name" aspectRatio={4 / 3} stroke="hsl(var(--background))" fill={COLORS[0]} />
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartPanel>

      <ChartPanel id="chart-allergens" title="Allergen Warning Analysis" description="warning frequency by valid completed run">
        {view.allergenWarnings.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={view.allergenWarnings} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={88} />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS[1]} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartPanel>

      <ChartPanel id="chart-version-analysis" title="Version Analysis" description="completion rate, feedback rate, average rating by appVersion">
        {view.versionAnalysis.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={view.versionAnalysis} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="appVersion" />
              <YAxis yAxisId="rate" tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
              <YAxis yAxisId="rating" orientation="right" domain={[0, 5]} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "averageRating") return [formatDecimal(Number(value)), "averageRating"];
                  return [formatPercent(Number(value)), name];
                }}
              />
              <Legend />
              <Line yAxisId="rate" type="monotone" dataKey="completionRate" stroke={COLORS[0]} strokeWidth={2} />
              <Line yAxisId="rate" type="monotone" dataKey="feedbackRate" stroke={COLORS[2]} strokeWidth={2} />
              <Line yAxisId="rating" type="monotone" dataKey="averageRating" stroke={COLORS[1]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartPanel>
    </section>
  );
}

function ChartPanel({
  id,
  title,
  description,
  children
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="min-h-[360px] animate-fade-in overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={() => exportChartPng(id)} aria-label={`Export ${title} as PNG`}>
          <Camera />
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function NoData() {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed bg-muted/25 text-sm text-muted-foreground">
      No chart data for current filters
    </div>
  );
}

async function exportChartPng(id: string) {
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
    window.alert(error instanceof Error ? error.message : "PNG export failed");
  }
}

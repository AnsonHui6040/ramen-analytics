"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { localizeChoiceLabel, localizeQuestionLabel } from "@/analytics/questionnaire-baseline";
import { issueCategoryLabels, severityLabels, type Dictionary, type Locale } from "@/i18n/dictionary";
import { localizeIssueMessage } from "@/i18n/issue-messages";
import { formatDecimal, formatNumber } from "@/lib/utils";
import type { DashboardView } from "@/types/analytics";

const ROW_LIMIT = 350;

export function DataTables({ view, t, locale }: { view: DashboardView; t: Dictionary; locale: Locale }) {
  const [query, setQuery] = React.useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const runRows = filterRows(view.runRows, normalizedQuery);
  const answerRows = filterRows(view.answerRows, normalizedQuery);
  const feedbackRows = filterRows(view.feedbackRows, normalizedQuery);
  const issueRows = filterRows(view.issueRows, normalizedQuery);

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>{t.tables.title}</CardTitle>
          <CardDescription>{t.tables.description}</CardDescription>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.tables.search}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="runs">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="runs">{t.tables.runs} ({formatNumber(runRows.length, undefined, locale)})</TabsTrigger>
            <TabsTrigger value="answers">{t.tables.answers} ({formatNumber(answerRows.length, undefined, locale)})</TabsTrigger>
            <TabsTrigger value="feedback">{t.tables.feedback} ({formatNumber(feedbackRows.length, undefined, locale)})</TabsTrigger>
            <TabsTrigger value="issues">{t.tables.issues} ({formatNumber(issueRows.length, undefined, locale)})</TabsTrigger>
          </TabsList>

          <TabsContent value="runs">
            <TableShell
              rows={runRows}
              columns={[
                t.tables.headers.runHash,
                t.tables.headers.status,
                t.tables.headers.type,
                t.tables.headers.version,
                t.tables.headers.source,
                t.tables.headers.feedback,
                t.tables.headers.rating,
                t.tables.headers.events,
                t.tables.headers.answers
              ]}
              t={t}
              locale={locale}
            >
              {runRows.slice(0, ROW_LIMIT).map((row) => (
                <TableRow key={row.quizRunIdHash}>
                  <TableCell className="font-mono text-xs">{row.quizRunIdHash}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "valid" ? "secondary" : row.status === "load-test" ? "muted" : "destructive"}>
                      {statusLabel(row.status, t)}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.typeCode === "unknown" ? t.values.unknown : row.typeCode}</TableCell>
                  <TableCell>{row.appVersion}</TableCell>
                  <TableCell>{sourceLabel(row.source, t)}</TableCell>
                  <TableCell>{row.hasFeedback ? t.values.yes : t.values.no}</TableCell>
                  <TableCell>{formatDecimal(row.rating, 1, locale)}</TableCell>
                  <TableCell>{formatNumber(row.eventCount, undefined, locale)}</TableCell>
                  <TableCell>{formatNumber(row.answerCount, undefined, locale)}</TableCell>
                </TableRow>
              ))}
            </TableShell>
          </TabsContent>

          <TabsContent value="answers">
            <TableShell
              rows={answerRows}
              columns={[
                t.tables.headers.runHash,
                t.tables.headers.stage,
                t.tables.headers.question,
                t.tables.headers.leftLabel,
                t.tables.headers.rightLabel,
                t.tables.headers.direction,
                t.tables.headers.selected,
                t.tables.headers.axis,
                t.tables.headers.value
              ]}
              t={t}
              locale={locale}
            >
              {answerRows.slice(0, ROW_LIMIT).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.quizRunIdHash}</TableCell>
                  <TableCell>{stageLabel(row.questionStage, t)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{row.questionId}</div>
                    <div className="max-w-[320px] truncate text-xs text-muted-foreground">
                      {localizeQuestionLabel(row.questionId, row.questionLabel, locale)}
                    </div>
                  </TableCell>
                  <TableCell>{localizeChoiceLabel(row.questionId, "left", row.leftLabel, locale)}</TableCell>
                  <TableCell>{localizeChoiceLabel(row.questionId, "right", row.rightLabel, locale)}</TableCell>
                  <TableCell>{directionLabel(row.direction, t)}</TableCell>
                  <TableCell>{selectedLabel(row.selected, t)}</TableCell>
                  <TableCell>{axisLabel(row.axis, t)}</TableCell>
                  <TableCell>{row.value}</TableCell>
                </TableRow>
              ))}
            </TableShell>
          </TabsContent>

          <TabsContent value="feedback">
            <TableShell
              rows={feedbackRows}
              columns={[
                t.tables.headers.runHash,
                t.tables.headers.rating,
                t.tables.headers.comment,
                t.tables.headers.length,
                t.tables.headers.version,
                t.tables.headers.source,
                t.tables.headers.timestamp
              ]}
              t={t}
              locale={locale}
            >
              {feedbackRows.slice(0, ROW_LIMIT).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.quizRunIdHash}</TableCell>
                  <TableCell>{formatDecimal(row.rating, 1, locale)}</TableCell>
                  <TableCell className="max-w-[360px] truncate">{row.comment === "[hidden]" ? t.values.hidden : row.comment}</TableCell>
                  <TableCell>{formatNumber(row.commentLength, undefined, locale)}</TableCell>
                  <TableCell>{row.appVersion}</TableCell>
                  <TableCell>{sourceLabel(row.source, t)}</TableCell>
                  <TableCell>{row.timestamp ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableShell>
          </TabsContent>

          <TabsContent value="issues">
            <TableShell
              rows={issueRows}
              columns={[
                t.tables.headers.severity,
                t.tables.headers.category,
                t.tables.headers.runHash,
                t.tables.headers.row,
                t.tables.headers.message
              ]}
              t={t}
              locale={locale}
            >
              {issueRows.slice(0, ROW_LIMIT).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Badge variant={row.severity === "error" ? "destructive" : "outline"}>{severityLabels[locale][row.severity]}</Badge>
                  </TableCell>
                  <TableCell>{issueCategoryLabels[locale][row.category]}</TableCell>
                  <TableCell className="font-mono text-xs">{row.runIdHash ?? ""}</TableCell>
                  <TableCell>{row.rowNumber ?? ""}</TableCell>
                  <TableCell className="min-w-[280px]">{localizeIssueMessage(row, locale)}</TableCell>
                </TableRow>
              ))}
            </TableShell>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TableShell({
  rows,
  columns,
  t,
  locale,
  children
}: {
  rows: unknown[];
  columns: string[];
  t: Dictionary;
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {children}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">
                  {t.tables.noRows}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {rows.length > ROW_LIMIT && (
        <p className="text-xs text-muted-foreground">
          {t.tables.limit(formatNumber(ROW_LIMIT, undefined, locale), formatNumber(rows.length, undefined, locale))}
        </p>
      )}
    </div>
  );
}

function statusLabel(status: string, t: Dictionary) {
  if (status === "valid") return t.values.valid;
  if (status === "invalid") return t.values.invalid;
  if (status === "load-test") return t.values.loadTest;
  return status;
}

function directionLabel(direction: string, t: Dictionary) {
  if (direction === "left") return t.values.left;
  if (direction === "right") return t.values.right;
  if (direction === "neutral") return t.values.neutral;
  if (direction === "selected") return t.values.selected;
  if (direction === "not_selected") return t.values.not_selected;
  return t.values.unknown;
}

function selectedLabel(selected: string, t: Dictionary) {
  if (selected === "true") return t.values.yes;
  if (selected === "false") return t.values.no;
  return t.values.unknown;
}

function stageLabel(stage: string, t: Dictionary) {
  return t.stageLabels[stage as keyof typeof t.stageLabels] ?? stage;
}

function axisLabel(axis: string, t: Dictionary) {
  if (!axis) return "";
  return t.axes[axis as keyof typeof t.axes] ?? axis;
}

function sourceLabel(source: string, t: Dictionary) {
  return t.values.sourceLabels[source as keyof typeof t.values.sourceLabels] ?? source;
}

function filterRows<T>(rows: T[], query: string) {
  if (!query) return rows;
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
}

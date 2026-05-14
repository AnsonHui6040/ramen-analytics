"use client";

import * as React from "react";
import { AlertTriangle, Check, CheckCircle2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { issueCategoryLabels, severityLabels, type Dictionary, type Locale } from "@/i18n/dictionary";
import { localizeIssueMessage } from "@/i18n/issue-messages";
import { formatNumber } from "@/lib/utils";
import type { IssueCategory, ValidationIssue } from "@/types/events";

const trackedCategories: IssueCategory[] = [
  "malformed_json",
  "duplicate_answer_snapshot",
  "duplicate_quiz_result",
  "invalid_axis_values",
  "incomplete_quiz_run",
  "answer_count_mismatch",
  "answers_length_mismatch",
  "questionnaire_count_mismatch",
  "duplicate_event"
];

export function ValidationPanel({
  issues,
  t,
  locale
}: {
  issues: ValidationIssue[];
  t: Dictionary;
  locale: Locale;
}) {
  const counts = new Map<IssueCategory, number>();
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");
  for (const issue of issues) {
    counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1);
  }
  const hasErrors = issues.some((issue) => issue.severity === "error");

  const copyIssues = async () => {
    try {
      await window.navigator.clipboard.writeText(formatIssuesForCopy(issues, locale));
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2200);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>{t.validation.title}</CardTitle>
          <CardDescription>{t.validation.description}</CardDescription>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={copyIssues} disabled={!issues.length}>
            {copyState === "copied" ? <Check /> : <Copy />}
            {copyState === "copied"
              ? t.validation.copiedIssues
              : copyState === "failed"
                ? t.validation.copyFailed
                : t.validation.copyIssues}
          </Button>
          <Badge variant={hasErrors ? "destructive" : "secondary"} className="gap-1">
            {hasErrors ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
            {formatNumber(issues.length, undefined, locale)} {t.validation.issues}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {trackedCategories.map((category) => (
            <div key={category} className="rounded-md border bg-background/55 p-3">
              <p className="text-xs font-medium text-muted-foreground">{issueCategoryLabels[locale][category]}</p>
              <p className="mt-1 text-xl font-semibold">{formatNumber(counts.get(category) ?? 0, undefined, locale)}</p>
            </div>
          ))}
        </div>

        <div className="max-h-[360px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.tables.headers.severity}</TableHead>
                <TableHead>{t.tables.headers.category}</TableHead>
                <TableHead>{t.tables.headers.runHash}</TableHead>
                <TableHead>{t.tables.headers.row}</TableHead>
                <TableHead>{t.tables.headers.message}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.slice(0, 200).map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <Badge variant={issue.severity === "error" ? "destructive" : "outline"}>
                      {severityLabels[locale][issue.severity]}
                    </Badge>
                  </TableCell>
                  <TableCell>{issueCategoryLabels[locale][issue.category]}</TableCell>
                  <TableCell className="font-mono text-xs">{issue.runIdHash ?? ""}</TableCell>
                  <TableCell>{issue.rowNumber ?? ""}</TableCell>
                  <TableCell className="min-w-[280px]">{localizeIssueMessage(issue, locale)}</TableCell>
                </TableRow>
              ))}
              {!issues.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    {t.validation.noIssues}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatIssuesForCopy(issues: ValidationIssue[], locale: Locale) {
  const header = ["severity", "category", "runIdHash", "rowNumber", "fileName", "eventType", "field", "message"];
  const rows = issues.map((issue) =>
    [
      severityLabels[locale][issue.severity],
      issueCategoryLabels[locale][issue.category],
      issue.runIdHash ?? "",
      issue.rowNumber ?? "",
      issue.fileName ?? "",
      issue.eventType ?? "",
      issue.field ?? "",
      localizeIssueMessage(issue, locale)
    ].map(escapeTsvCell)
  );
  return [header.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
}

function escapeTsvCell(value: string | number) {
  return String(value).replaceAll("\t", " ").replaceAll("\n", " ");
}

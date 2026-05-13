"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDecimal, formatNumber } from "@/lib/utils";
import type { DashboardView } from "@/types/analytics";

const ROW_LIMIT = 350;

export function DataTables({ view }: { view: DashboardView }) {
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
          <CardTitle>Data Tables</CardTitle>
          <CardDescription>searchable hashed run, answer, feedback, and validation tables</CardDescription>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tables"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="runs">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="runs">Quiz runs ({formatNumber(runRows.length)})</TabsTrigger>
            <TabsTrigger value="answers">Answers ({formatNumber(answerRows.length)})</TabsTrigger>
            <TabsTrigger value="feedback">Feedback ({formatNumber(feedbackRows.length)})</TabsTrigger>
            <TabsTrigger value="issues">Issues ({formatNumber(issueRows.length)})</TabsTrigger>
          </TabsList>

          <TabsContent value="runs">
            <TableShell rows={runRows} columns={["Run hash", "Status", "Type", "Version", "Source", "Feedback", "Rating", "Events", "Answers"]}>
              {runRows.slice(0, ROW_LIMIT).map((row) => (
                <TableRow key={row.quizRunIdHash}>
                  <TableCell className="font-mono text-xs">{row.quizRunIdHash}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "valid" ? "secondary" : row.status === "load-test" ? "muted" : "destructive"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.typeCode}</TableCell>
                  <TableCell>{row.appVersion}</TableCell>
                  <TableCell>{row.source}</TableCell>
                  <TableCell>{row.hasFeedback ? "yes" : "no"}</TableCell>
                  <TableCell>{formatDecimal(row.rating, 1)}</TableCell>
                  <TableCell>{row.eventCount}</TableCell>
                  <TableCell>{row.answerCount}</TableCell>
                </TableRow>
              ))}
            </TableShell>
          </TabsContent>

          <TabsContent value="answers">
            <TableShell rows={answerRows} columns={["Run hash", "Question", "Direction", "Selected", "Axis", "Value"]}>
              {answerRows.slice(0, ROW_LIMIT).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.quizRunIdHash}</TableCell>
                  <TableCell>
                    <div className="font-medium">{row.questionId}</div>
                    <div className="max-w-[320px] truncate text-xs text-muted-foreground">{row.questionLabel}</div>
                  </TableCell>
                  <TableCell>{row.direction}</TableCell>
                  <TableCell>{row.selected}</TableCell>
                  <TableCell>{row.axis}</TableCell>
                  <TableCell>{row.value}</TableCell>
                </TableRow>
              ))}
            </TableShell>
          </TabsContent>

          <TabsContent value="feedback">
            <TableShell rows={feedbackRows} columns={["Run hash", "Rating", "Comment", "Length", "Version", "Source", "Timestamp"]}>
              {feedbackRows.slice(0, ROW_LIMIT).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.quizRunIdHash}</TableCell>
                  <TableCell>{formatDecimal(row.rating, 1)}</TableCell>
                  <TableCell className="max-w-[360px] truncate">{row.comment}</TableCell>
                  <TableCell>{row.commentLength}</TableCell>
                  <TableCell>{row.appVersion}</TableCell>
                  <TableCell>{row.source}</TableCell>
                  <TableCell>{row.timestamp ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableShell>
          </TabsContent>

          <TabsContent value="issues">
            <TableShell rows={issueRows} columns={["Severity", "Category", "Run hash", "Row", "Message"]}>
              {issueRows.slice(0, ROW_LIMIT).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Badge variant={row.severity === "error" ? "destructive" : "outline"}>{row.severity}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.category}</TableCell>
                  <TableCell className="font-mono text-xs">{row.runIdHash ?? ""}</TableCell>
                  <TableCell>{row.rowNumber ?? ""}</TableCell>
                  <TableCell className="min-w-[280px]">{row.message}</TableCell>
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
  children
}: {
  rows: unknown[];
  columns: string[];
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
                  No rows
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {rows.length > ROW_LIMIT && (
        <p className="text-xs text-muted-foreground">
          Showing first {formatNumber(ROW_LIMIT)} rows of {formatNumber(rows.length)} for browser performance.
        </p>
      )}
    </div>
  );
}

function filterRows<T>(rows: T[], query: string) {
  if (!query) return rows;
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
}

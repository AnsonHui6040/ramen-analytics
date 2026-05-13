import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  "duplicate_event"
];

export function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  const counts = new Map<IssueCategory, number>();
  for (const issue of issues) {
    counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1);
  }
  const hasErrors = issues.some((issue) => issue.severity === "error");

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Validation Panel</CardTitle>
          <CardDescription>malformed rows, duplicate events, incomplete runs, and schema consistency checks</CardDescription>
        </div>
        <Badge variant={hasErrors ? "destructive" : "secondary"} className="gap-1">
          {hasErrors ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
          {formatNumber(issues.length)} issues
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {trackedCategories.map((category) => (
            <div key={category} className="rounded-md border bg-background/55 p-3">
              <p className="text-xs font-medium text-muted-foreground">{category}</p>
              <p className="mt-1 text-xl font-semibold">{formatNumber(counts.get(category) ?? 0)}</p>
            </div>
          ))}
        </div>

        <div className="max-h-[360px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Run hash</TableHead>
                <TableHead>Row</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.slice(0, 200).map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <Badge variant={issue.severity === "error" ? "destructive" : "outline"}>{issue.severity}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{issue.category}</TableCell>
                  <TableCell className="font-mono text-xs">{issue.runIdHash ?? ""}</TableCell>
                  <TableCell>{issue.rowNumber ?? ""}</TableCell>
                  <TableCell className="min-w-[280px]">{issue.message}</TableCell>
                </TableRow>
              ))}
              {!issues.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    No validation issues for current filters
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

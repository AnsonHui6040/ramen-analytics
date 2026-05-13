import type { IssueCategory, IssueSeverity, ValidationIssue } from "@/types/events";
import { hashString } from "@/parser/hash";

export function createIssue({
  severity,
  category,
  message,
  fileName,
  rowNumber,
  runIdHash,
  eventType,
  field
}: {
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  fileName?: string;
  rowNumber?: number;
  runIdHash?: string;
  eventType?: string;
  field?: string;
}): ValidationIssue {
  return {
    id: hashString(`${category}:${message}:${fileName ?? ""}:${rowNumber ?? ""}:${runIdHash ?? ""}:${field ?? ""}`, "issue"),
    severity,
    category,
    message,
    fileName,
    rowNumber,
    runIdHash,
    eventType,
    field
  };
}

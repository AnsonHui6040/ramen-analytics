"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DashboardFilters } from "@/types/analytics";

interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onReset: () => void;
  typeCodes: string[];
  appVersions: string[];
  sources: string[];
}

export function FilterBar({
  filters,
  onFiltersChange,
  onReset,
  typeCodes,
  appVersions,
  sources
}: FilterBarProps) {
  const setFilter = (key: keyof DashboardFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card>
      <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]">
        <Field label="Type">
          <Select value={filters.typeCode} onChange={(event) => setFilter("typeCode", event.target.value)}>
            <option value="all">All types</option>
            {typeCodes.map((typeCode) => (
              <option key={typeCode} value={typeCode}>
                {typeCode}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="App version">
          <Select value={filters.appVersion} onChange={(event) => setFilter("appVersion", event.target.value)}>
            <option value="all">All versions</option>
            {appVersions.map((version) => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source">
          <Select value={filters.source} onChange={(event) => setFilter("source", event.target.value)}>
            <option value="all">All sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Validity">
          <Select value={filters.validity} onChange={(event) => setFilter("validity", event.target.value)}>
            <option value="all">All runs</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
            <option value="load-test">Load-test</option>
          </Select>
        </Field>
        <Field label="Feedback">
          <Select value={filters.hasFeedback} onChange={(event) => setFilter("hasFeedback", event.target.value)}>
            <option value="all">All feedback</option>
            <option value="yes">Has feedback</option>
            <option value="no">No feedback</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="From">
            <Input type="date" value={filters.dateFrom} onChange={(event) => setFilter("dateFrom", event.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={filters.dateTo} onChange={(event) => setFilter("dateTo", event.target.value)} />
          </Field>
        </div>
        <div className="flex items-end">
          <Button variant="outline" size="icon" onClick={onReset} aria-label="Reset filters">
            <RotateCcw />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

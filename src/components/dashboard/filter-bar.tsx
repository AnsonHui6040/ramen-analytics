"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Dictionary } from "@/i18n/dictionary";
import type { DashboardFilters } from "@/types/analytics";

interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onReset: () => void;
  typeCodes: string[];
  appVersions: string[];
  sources: string[];
  t: Dictionary["filters"];
  sourceLabels: Dictionary["values"]["sourceLabels"];
}

export function FilterBar({
  filters,
  onFiltersChange,
  onReset,
  typeCodes,
  appVersions,
  sources,
  t,
  sourceLabels
}: FilterBarProps) {
  const setFilter = (key: keyof DashboardFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card>
      <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_minmax(170px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(170px,1fr)_minmax(300px,1.35fr)_auto]">
        <Field label={t.type}>
          <Select value={filters.typeCode} onChange={(event) => setFilter("typeCode", event.target.value)}>
            <option value="all">{t.allTypes}</option>
            {typeCodes.map((typeCode) => (
              <option key={typeCode} value={typeCode}>
                {typeCode}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.appVersion}>
          <Select value={filters.appVersion} onChange={(event) => setFilter("appVersion", event.target.value)}>
            <option value="all">{t.allVersions}</option>
            {appVersions.map((version) => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.source}>
          <Select value={filters.source} onChange={(event) => setFilter("source", event.target.value)}>
            <option value="all">{t.allSources}</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {sourceLabels[source as keyof typeof sourceLabels] ?? source}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.validity}>
          <Select value={filters.validity} onChange={(event) => setFilter("validity", event.target.value)}>
            <option value="all">{t.allRuns}</option>
            <option value="valid">{t.valid}</option>
            <option value="invalid">{t.invalid}</option>
            <option value="load-test">{t.loadTest}</option>
          </Select>
        </Field>
        <Field label={t.feedback}>
          <Select value={filters.hasFeedback} onChange={(event) => setFilter("hasFeedback", event.target.value)}>
            <option value="all">{t.allFeedback}</option>
            <option value="yes">{t.hasFeedback}</option>
            <option value="no">{t.noFeedback}</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t.from}>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilter("dateFrom", event.target.value)}
              className="min-w-[132px]"
            />
          </Field>
          <Field label={t.to}>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilter("dateTo", event.target.value)}
              className="min-w-[132px]"
            />
          </Field>
        </div>
        <div className="flex items-end">
          <Button variant="outline" size="icon" onClick={onReset} aria-label={t.reset}>
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

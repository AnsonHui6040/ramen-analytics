import type { DashboardFilters } from "@/types/analytics";
import type { QuizRunSummary } from "@/types/events";

export const DEFAULT_FILTERS: DashboardFilters = {
  typeCode: "all",
  appVersion: "all",
  source: "all",
  validity: "all",
  hasFeedback: "all",
  dateFrom: "",
  dateTo: ""
};

export function applyRunFilters(runs: QuizRunSummary[], filters: DashboardFilters) {
  return runs.filter((run) => {
    if (filters.typeCode !== "all" && run.typeCode !== filters.typeCode) return false;
    if (filters.appVersion !== "all" && run.appVersion !== filters.appVersion) return false;
    if (filters.source !== "all" && run.source !== filters.source) return false;

    if (filters.validity === "valid" && !run.isValidCompleted) return false;
    if (filters.validity === "invalid" && (run.isValidCompleted || run.isLoadTest)) return false;
    if (filters.validity === "load-test" && !run.isLoadTest) return false;

    if (filters.hasFeedback === "yes" && !run.hasFeedback) return false;
    if (filters.hasFeedback === "no" && run.hasFeedback) return false;

    if (filters.dateFrom || filters.dateTo) {
      const timestamp = run.firstSeenAt ?? run.lastSeenAt;
      if (!timestamp) return false;
      const time = Date.parse(timestamp);
      if (filters.dateFrom && time < Date.parse(`${filters.dateFrom}T00:00:00`)) return false;
      if (filters.dateTo && time > Date.parse(`${filters.dateTo}T23:59:59`)) return false;
    }

    return true;
  });
}

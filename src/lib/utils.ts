import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/i18n/dictionary";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const intlLocale: Record<Locale, string> = {
  zh: "zh-TW",
  en: "en-US",
  ja: "ja-JP"
};

export function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale: Locale = "en") {
  return new Intl.NumberFormat(intlLocale[locale], {
    maximumFractionDigits: 0,
    ...options
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, digits = 1, locale: Locale = "en") {
  return `${formatNumber(value * 100, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }, locale)}%`;
}

export function formatDecimal(value: number | null | undefined, digits = 2, locale: Locale = "en") {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return formatNumber(value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }, locale);
}

export function downloadBlob(fileName: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function toCsv<T extends object>(rows: T[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    if (/[",\n]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
    return text;
  };

  return [
    headers.join(","),
    ...rows.map((row) => {
      const record = row as Record<string, unknown>;
      return headers.map((header) => escape(record[header])).join(",");
    })
  ].join("\n");
}

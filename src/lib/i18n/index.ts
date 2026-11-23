/**
 * Global Learning OS — Internationalization & Regional Localization Architecture
 * Supports locale-aware date/time, numbers, currencies, and English variants.
 */

export interface LocaleConfig {
  code: string;
  name: string;
  englishVariant: "en-US" | "en-GB" | "en-IN" | "en-CA" | "en-AU" | "en-SG" | "en-NZ" | "en-ZA" | "en-IE";
  dateFormat: string;
  measurementSystem: "metric" | "us_customary" | "imperial";
  currencyCode: string;
  currencySymbol: string;
}

export const SUPPORTED_LOCALES: Record<string, LocaleConfig> = {
  "en-IN": {
    code: "en-IN",
    name: "English (India)",
    englishVariant: "en-IN",
    dateFormat: "DD/MM/YYYY",
    measurementSystem: "metric",
    currencyCode: "INR",
    currencySymbol: "₹",
  },
  "en-US": {
    code: "en-US",
    name: "English (United States)",
    englishVariant: "en-US",
    dateFormat: "MM/DD/YYYY",
    measurementSystem: "us_customary",
    currencyCode: "USD",
    currencySymbol: "$",
  },
  "en-GB": {
    code: "en-GB",
    name: "English (United Kingdom)",
    englishVariant: "en-GB",
    dateFormat: "DD/MM/YYYY",
    measurementSystem: "metric",
    currencyCode: "GBP",
    currencySymbol: "£",
  },
  "en-CA": {
    code: "en-CA",
    name: "English (Canada)",
    englishVariant: "en-CA",
    dateFormat: "YYYY-MM-DD",
    measurementSystem: "metric",
    currencyCode: "CAD",
    currencySymbol: "CAD$",
  },
  "en-AU": {
    code: "en-AU",
    name: "English (Australia)",
    englishVariant: "en-AU",
    dateFormat: "DD/MM/YYYY",
    measurementSystem: "metric",
    currencyCode: "AUD",
    currencySymbol: "A$",
  },
  "en-NZ": {
    code: "en-NZ",
    name: "English (New Zealand)",
    englishVariant: "en-NZ",
    dateFormat: "DD/MM/YYYY",
    measurementSystem: "metric",
    currencyCode: "NZD",
    currencySymbol: "NZ$",
  },
  "en-SG": {
    code: "en-SG",
    name: "English (Singapore)",
    englishVariant: "en-SG",
    dateFormat: "DD/MM/YYYY",
    measurementSystem: "metric",
    currencyCode: "SGD",
    currencySymbol: "S$",
  },
  "en-ZA": {
    code: "en-ZA",
    name: "English (South Africa)",
    englishVariant: "en-ZA",
    dateFormat: "YYYY/MM/DD",
    measurementSystem: "metric",
    currencyCode: "ZAR",
    currencySymbol: "R",
  },
  "en-IE": {
    code: "en-IE",
    name: "English (Ireland)",
    englishVariant: "en-IE",
    dateFormat: "DD/MM/YYYY",
    measurementSystem: "metric",
    currencyCode: "EUR",
    currencySymbol: "€",
  },
};

export function formatCurrency(amount: number, currencyCode = "USD", locale = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch (_) {
    return `${currencyCode} ${amount}`;
  }
}

export function formatDate(date: Date | string | number, locale = "en-US"): string {
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch (_) {
    return String(date);
  }
}

export function formatRelativeTime(date: Date | string | number, locale = "en-US"): string {
  try {
    const now = Date.now();
    const target = new Date(date).getTime();
    const diffSec = Math.round((target - now) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    if (Math.abs(diffSec) < 60) return "just now";
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    const diffHours = Math.round(diffMin / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
    const diffDays = Math.round(diffHours / 24);
    return rtf.format(diffDays, "day");
  } catch (_) {
    return formatDate(date, locale);
  }
}

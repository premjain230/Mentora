/**
 * Global Learning OS — Regional Multi-Currency Pricing Catalog
 * Covers all 15 target countries with purchasing-power parity (PPP) consideration.
 */

import { RegionalPrice } from "./types";
import { formatCurrency } from "../i18n";

export const REGIONAL_PRICING: Record<string, RegionalPrice> = {
  IN: {
    countryCode: "IN",
    currencyCode: "INR",
    currencySymbol: "₹",
    monthlyAmount: 499,
    annualAmount: 4999,
    monthlyFormatted: "₹499",
    annualFormatted: "₹4,999",
    monthlySavingsText: "Save 17% with annual billing",
    preferredGateway: "razorpay",
  },
  US: {
    countryCode: "US",
    currencyCode: "USD",
    currencySymbol: "$",
    monthlyAmount: 14.99,
    annualAmount: 119,
    monthlyFormatted: "$14.99",
    annualFormatted: "$119",
    monthlySavingsText: "Save 34% with annual billing",
    preferredGateway: "stripe",
  },
  GB: {
    countryCode: "GB",
    currencyCode: "GBP",
    currencySymbol: "£",
    monthlyAmount: 11.99,
    annualAmount: 99,
    monthlyFormatted: "£11.99",
    annualFormatted: "£99",
    monthlySavingsText: "Save 31% with annual billing",
    preferredGateway: "stripe",
  },
  CA: {
    countryCode: "CA",
    currencyCode: "CAD",
    currencySymbol: "CAD$",
    monthlyAmount: 19.99,
    annualAmount: 159,
    monthlyFormatted: "CAD$ 19.99",
    annualFormatted: "CAD$ 159",
    monthlySavingsText: "Save 34% with annual billing",
    preferredGateway: "stripe",
  },
  AU: {
    countryCode: "AU",
    currencyCode: "AUD",
    currencySymbol: "A$",
    monthlyAmount: 22.99,
    annualAmount: 179,
    monthlyFormatted: "A$ 22.99",
    annualFormatted: "A$ 179",
    monthlySavingsText: "Save 35% with annual billing",
    preferredGateway: "stripe",
  },
  NZ: {
    countryCode: "NZ",
    currencyCode: "NZD",
    currencySymbol: "NZ$",
    monthlyAmount: 24.99,
    annualAmount: 199,
    monthlyFormatted: "NZ$ 24.99",
    annualFormatted: "NZ$ 199",
    monthlySavingsText: "Save 33% with annual billing",
    preferredGateway: "stripe",
  },
  SG: {
    countryCode: "SG",
    currencyCode: "SGD",
    currencySymbol: "S$",
    monthlyAmount: 19.99,
    annualAmount: 159,
    monthlyFormatted: "S$ 19.99",
    annualFormatted: "S$ 159",
    monthlySavingsText: "Save 34% with annual billing",
    preferredGateway: "stripe",
  },
  AE: {
    countryCode: "AE",
    currencyCode: "AED",
    currencySymbol: "AED",
    monthlyAmount: 55,
    annualAmount: 440,
    monthlyFormatted: "AED 55",
    annualFormatted: "AED 440",
    monthlySavingsText: "Save 33% with annual billing",
    preferredGateway: "stripe",
  },
  SA: {
    countryCode: "SA",
    currencyCode: "SAR",
    currencySymbol: "SAR",
    monthlyAmount: 55,
    annualAmount: 440,
    monthlyFormatted: "SAR 55",
    annualFormatted: "SAR 440",
    monthlySavingsText: "Save 33% with annual billing",
    preferredGateway: "stripe",
  },
  MY: {
    countryCode: "MY",
    currencyCode: "MYR",
    currencySymbol: "RM",
    monthlyAmount: 49,
    annualAmount: 399,
    monthlyFormatted: "RM 49",
    annualFormatted: "RM 399",
    monthlySavingsText: "Save 32% with annual billing",
    preferredGateway: "stripe",
  },
  PK: {
    countryCode: "PK",
    currencyCode: "PKR",
    currencySymbol: "PKR",
    monthlyAmount: 2999,
    annualAmount: 24999,
    monthlyFormatted: "PKR 2,999",
    annualFormatted: "PKR 24,999",
    monthlySavingsText: "Save 30% with annual billing",
    preferredGateway: "stripe",
  },
  BD: {
    countryCode: "BD",
    currencyCode: "BDT",
    currencySymbol: "৳",
    monthlyAmount: 1199,
    annualAmount: 9999,
    monthlyFormatted: "৳ 1,199",
    annualFormatted: "৳ 9,999",
    monthlySavingsText: "Save 31% with annual billing",
    preferredGateway: "stripe",
  },
  ZA: {
    countryCode: "ZA",
    currencyCode: "ZAR",
    currencySymbol: "R",
    monthlyAmount: 249,
    annualAmount: 1999,
    monthlyFormatted: "R 249",
    annualFormatted: "R 1,999",
    monthlySavingsText: "Save 33% with annual billing",
    preferredGateway: "stripe",
  },
  NG: {
    countryCode: "NG",
    currencyCode: "NGN",
    currencySymbol: "₦",
    monthlyAmount: 14999,
    annualAmount: 119999,
    monthlyFormatted: "₦ 14,999",
    annualFormatted: "₦ 119,999",
    monthlySavingsText: "Save 33% with annual billing",
    preferredGateway: "stripe",
  },
  IE: {
    countryCode: "IE",
    currencyCode: "EUR",
    currencySymbol: "€",
    monthlyAmount: 13.99,
    annualAmount: 109,
    monthlyFormatted: "€13.99",
    annualFormatted: "€109",
    monthlySavingsText: "Save 35% with annual billing",
    preferredGateway: "stripe",
  },
};

export const DEFAULT_GLOBAL_PRICE: RegionalPrice = REGIONAL_PRICING.US;

export function getRegionalPrice(countryCode?: string): RegionalPrice {
  if (!countryCode) return DEFAULT_GLOBAL_PRICE;
  return REGIONAL_PRICING[countryCode.toUpperCase()] || DEFAULT_GLOBAL_PRICE;
}

export function formatPlanPrice(amount: number, countryCode: string): string {
  const price = getRegionalPrice(countryCode);
  return formatCurrency(amount, price.currencyCode);
}

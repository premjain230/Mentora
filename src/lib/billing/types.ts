/**
 * Global Learning OS — Billing, Monetization & Payment Provider Types
 * Supports multi-currency pricing across 15 countries and multiple payment gateways.
 */

export type BillingInterval = "month" | "year";

export type PaymentProviderName = "stripe" | "razorpay" | "early_access";

export interface PlanFeature {
  text: string;
  subtext?: string;
  included: boolean;
  highlight?: boolean;
}

export interface PricingTier {
  id: "free" | "pro";
  name: string;
  tagline: string;
  badge?: string;
  interval: BillingInterval;
  features: PlanFeature[];
}

export interface RegionalPrice {
  countryCode: string;
  currencyCode: string;
  currencySymbol: string;
  monthlyAmount: number;
  annualAmount: number;
  monthlyFormatted: string;
  annualFormatted: string;
  monthlySavingsText?: string;
  preferredGateway: PaymentProviderName;
}

export interface ParentConsent {
  isUnderAge: boolean;
  parentFullName?: string;
  parentEmail?: string;
  consentGiven: boolean;
  consentTimestamp?: string;
}

export interface CheckoutSessionRequest {
  planId: "pro";
  interval: BillingInterval;
  countryCode: string;
  currencyCode: string;
  returnUrl?: string;
  parentConsent?: ParentConsent;
}

export interface CheckoutSessionResponse {
  sessionId?: string;
  gateway: PaymentProviderName;
  checkoutUrl?: string;
  status: "ready" | "early_access_free" | "unsupported";
  message?: string;
}

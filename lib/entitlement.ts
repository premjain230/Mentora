/**
 * Client-side mirror of the server entitlement decision.
 *
 * The server remains authoritative (API quotas and admin checks never trust
 * the browser). The dashboard only needs to agree with it so Pro UI, quotas
 * and the subscription page do not contradict the real entitlement.
 *
 * Precedence (identical to server/_admin.js):
 *   1. verified Firebase custom claims (server-issued, not user-writable)
 *   2. server-owned entitlements/{uid} record — authoritative when present
 *   3. hardened users/{uid} legacy fields
 *
 * Client-writable user fields (role, plan, isPro, referralRewards) are ignored
 * unless they live in one of those server-owned sources.
 */

export interface EntitlementClaims {
  admin?: boolean;
  pro?: boolean;
  role?: string;
  proExpiresAt?: unknown;
  proUntil?: unknown;
  subscriptionExpiresAt?: unknown;
  email?: string | null;
  [key: string]: unknown;
}

export interface EntitlementData {
  plan?: string;
  tier?: string;
  subscriptionTier?: string;
  isPro?: boolean;
  pro?: boolean;
  isPremium?: boolean;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: unknown;
  proExpiresAt?: unknown;
  proUntil?: unknown;
  subscription?: { status?: string; plan?: string; expiresAt?: unknown; [key: string]: unknown };
  referralRewards?: {
    bonusChats?: number;
    proDays?: number;
    proExpiresAt?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ResolveEntitlementArgs {
  claims?: EntitlementClaims | null;
  entitlement?: EntitlementData | null;
  userData?: EntitlementData | null;
}

export interface ResolvedEntitlement {
  plan: "pro" | "free";
  source: "claims-admin" | "claims-pro" | "entitlement" | "user-doc" | "default";
  isAdmin: boolean;
  bonusChats: number;
}

export const MAX_REFERRAL_BONUS_CHATS = 500;
export const MAX_REFERRAL_PRO_DAYS = 3650;

export function normalizePlan(raw: unknown): "pro" | "free" {
  const plan = String(raw || "").trim().toLowerCase();
  if (
    plan === "pro" ||
    plan === "premium" ||
    plan === "paid" ||
    plan === "unlimited" ||
    plan === "lifetime"
  ) {
    return "pro";
  }
  return "free";
}

/** Firestore Timestamp / ISO string / seconds / ms → epoch ms. */
export function toMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  const maybeTimestamp = value as { toDate?: () => Date; seconds?: number };
  if (typeof maybeTimestamp.toDate === "function") {
    const date = maybeTimestamp.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  }
  if (typeof maybeTimestamp.seconds === "number") {
    return maybeTimestamp.seconds * 1000;
  }
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function expiryIsFuture(value: unknown): boolean {
  const ms = toMillis(value);
  return ms != null && ms > Date.now();
}

function expiryIsPast(value: unknown): boolean {
  const ms = toMillis(value);
  return ms != null && ms <= Date.now();
}

/**
 * Admin is a server-issued custom claim only. We deliberately ignore
 * userData.role / userData.isAdmin because those fields are profile data,
 * not proof of identity.
 */
function isAdminClaims(claims?: EntitlementClaims | null): boolean {
  if (!claims) return false;
  return claims.admin === true || claims.role === "admin";
}

function isProClaims(claims?: EntitlementClaims | null): boolean {
  if (!claims || claims.pro !== true) return false;
  const expiry =
    claims.proExpiresAt || claims.proUntil || claims.subscriptionExpiresAt;
  return expiry ? expiryIsFuture(expiry) : true;
}

export function entitlementDataIsPro(data?: EntitlementData | null): boolean {
  if (!data) return false;

  const proExpiresAt =
    data.subscriptionExpiresAt ||
    data.proExpiresAt ||
    data.proUntil ||
    data.referralRewards?.proExpiresAt;
  if (expiryIsPast(proExpiresAt)) return false;

  if (normalizePlan(data.plan) === "pro") return true;
  if (normalizePlan(data.tier) === "pro") return true;
  if (normalizePlan(data.subscriptionTier) === "pro") return true;
  if (data.isPro === true || data.pro === true || data.isPremium === true) return true;
  if (data.subscriptionStatus === "active" || data.subscriptionStatus === "pro") return true;
  if (data.subscription?.status === "active") return true;
  if (normalizePlan(data.subscription?.plan) === "pro") return true;

  // Referral Pro days require an explicit, still-valid expiry.
  const proDays = Number(data.referralRewards?.proDays) || 0;
  if (proDays > 0 && proDays <= MAX_REFERRAL_PRO_DAYS && expiryIsFuture(proExpiresAt)) {
    return true;
  }

  return expiryIsFuture(proExpiresAt);
}

export function referralBonusChats(data?: EntitlementData | null): number {
  const raw = Number(data?.referralRewards?.bonusChats);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.floor(Math.min(raw, MAX_REFERRAL_BONUS_CHATS));
}

export function resolveEntitlement({
  claims,
  entitlement,
  userData,
}: ResolveEntitlementArgs = {}): ResolvedEntitlement {
  const bonusSource = entitlement || userData;

  if (isAdminClaims(claims)) {
    return {
      plan: "pro",
      source: "claims-admin",
      isAdmin: true,
      bonusChats: referralBonusChats(bonusSource),
    };
  }
  if (isProClaims(claims)) {
    return {
      plan: "pro",
      source: "claims-pro",
      isAdmin: false,
      bonusChats: referralBonusChats(bonusSource),
    };
  }
  if (entitlement) {
    return {
      plan: entitlementDataIsPro(entitlement) ? "pro" : "free",
      source: "entitlement",
      isAdmin: false,
      bonusChats: referralBonusChats(entitlement),
    };
  }
  return {
    plan: entitlementDataIsPro(userData) ? "pro" : "free",
    source: userData ? "user-doc" : "default",
    isAdmin: false,
    bonusChats: referralBonusChats(userData),
  };
}

export function resolveIsPro(args: ResolveEntitlementArgs = {}): boolean {
  return resolveEntitlement(args).plan === "pro";
}

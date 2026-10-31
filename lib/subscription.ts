/**
 * Learning Allied — Subscription & Plan Utilities
 * Matches client and server verification rules.
 */

import {
  resolveEntitlement,
  resolveIsPro,
  type EntitlementClaims,
  type EntitlementData,
} from "./entitlement";

export interface UserPlanData extends EntitlementData {
  role?: string;
  [key: string]: any;
}

export const FREE_LIMITS = {
  chat: 20,
  analysis: 20,
  planner: 30, // minutes
};

export const PRO_LIMITS = {
  chat: Infinity,
  analysis: Infinity,
  planner: Infinity,
};

export { resolveEntitlement, resolveIsPro };
export type { EntitlementClaims, EntitlementData };

/**
 * Legacy helper — evaluates only the (now server-owned) user document.
 * Prefer resolveIsPro({ claims, entitlement, userData }) when claims and the
 * entitlements record are available.
 */
export function isProUser(userData?: UserPlanData | null): boolean {
  if (!userData || typeof userData !== "object") return false;
  return resolveIsPro({ userData });
}

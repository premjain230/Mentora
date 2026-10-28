/**
 * Learning Allied — Subscription & Plan Utilities
 * Matches client and server verification rules.
 */

export interface UserPlanData {
  plan?: string;
  isPro?: boolean;
  role?: string;
  subscriptionStatus?: string;
  subscription?: {
    status?: string;
    expiresAt?: any;
    [key: string]: any;
  };
  subscriptionExpiresAt?: any;
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

export function isProUser(userData?: UserPlanData | null): boolean {
  if (!userData || typeof userData !== "object") return false;

  const role = String(userData.role || "").toLowerCase();
  if (role === "admin") return true;

  const plan = String(userData.plan || "");
  const isProPlan = plan === "pro" || plan === "Pro" || plan === "PREMIUM";
  const hasProFlag = userData.isPro === true;

  // Check expiration if present
  if (isProPlan || hasProFlag) {
    const rawExp = userData.subscriptionExpiresAt || userData.subscription?.expiresAt;
    if (rawExp) {
      const expDate = typeof rawExp.toDate === "function" ? rawExp.toDate() : new Date(rawExp);
      if (!isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) {
        return false; // Expired, reverts to free
      }
    }
    return true;
  }

  const subStatus = String(userData.subscriptionStatus || "").toLowerCase();
  const nestedSubStatus = String(userData.subscription?.status || "").toLowerCase();
  if (subStatus === "active" || nestedSubStatus === "active") {
    const rawExp = userData.subscriptionExpiresAt || userData.subscription?.expiresAt;
    if (rawExp) {
      const expDate = typeof rawExp.toDate === "function" ? rawExp.toDate() : new Date(rawExp);
      if (!isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) {
        return false;
      }
    }
    return true;
  }

  return false;
}

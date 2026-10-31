/** Shared plan detection for the vanilla dashboard controllers. */

export function normalizePlan(raw) {
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

export function isProUserData(data) {
  if (!data) return false;

  const expiresAt =
    data.subscriptionExpiresAt ||
    data.proExpiresAt ||
    data.proUntil ||
    data.referralRewards?.proExpiresAt;
  if (expiresAt) {
    const expires = new Date(expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() <= Date.now()) {
      return false;
    }
  }

  if (data.role === "admin" || data.isAdmin === true) return true;
  if (normalizePlan(data.plan) === "pro") return true;
  if (normalizePlan(data.tier) === "pro") return true;
  if (normalizePlan(data.subscriptionTier) === "pro") return true;
  if (data.isPro === true || data.pro === true || data.isPremium === true) {
    return true;
  }
  if (data.subscriptionStatus === "active" || data.subscriptionStatus === "pro") {
    return true;
  }
  if (data.subscription?.status === "active") return true;
  if (normalizePlan(data.subscription?.plan) === "pro") return true;

  const proDays = Number(data.referralRewards?.proDays) || 0;
  if (proDays > 0) {
    const referralExpiry = data.referralRewards?.proExpiresAt;
    if (!referralExpiry) return true;
    const expires = new Date(referralExpiry);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() > Date.now()) {
      return true;
    }
  }

  return false;
}

/** Shared plan detection for the vanilla dashboard controllers. */
import {
  entitlementDataIsPro,
  normalizePlan,
  referralBonusChats,
  resolveEntitlement,
  resolveIsPro,
} from "../../lib/entitlement";

export {
  entitlementDataIsPro,
  normalizePlan,
  referralBonusChats,
  resolveEntitlement,
  resolveIsPro,
};

/** Legacy helper: evaluates an entitlement-shaped user document only. */
export function isProUserData(data) {
  return resolveIsPro({ userData: data });
}

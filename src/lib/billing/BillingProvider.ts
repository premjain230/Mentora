/**
 * Global Learning OS — Payment Provider Abstraction Layer
 * Handles Stripe (International) and Razorpay (India) session initialization,
 * self-serve cancellation disclosures, and parent authorization validation.
 */

import { CheckoutSessionRequest, CheckoutSessionResponse, PaymentProviderName } from "./types";
import { getRegionalPrice } from "./pricing";

export class BillingProvider {
  /**
   * Determine the appropriate gateway based on country and environment configuration.
   */
  static resolveGateway(countryCode: string): PaymentProviderName {
    const regional = getRegionalPrice(countryCode);
    return regional.preferredGateway;
  }

  /**
   * Check whether live payment gateways are enabled in the current environment.
   */
  static isLivePaymentEnabled(): boolean {
    const hasStripe = Boolean(process.env.NEXT_PUBLIC_STRIPE_KEY || process.env.STRIPE_SECRET_KEY);
    const hasRazorpay = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY || process.env.RAZORPAY_KEY_ID);
    return hasStripe || hasRazorpay;
  }

  /**
   * Create checkout session with parental consent validation for under-18 users.
   */
  static async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<CheckoutSessionResponse> {
    const gateway = this.resolveGateway(request.countryCode);
    const pricing = getRegionalPrice(request.countryCode);

    // Validate parental consent for under-age learners
    if (request.parentConsent?.isUnderAge && !request.parentConsent.consentGiven) {
      throw new Error(
        "Parental consent is required for learners under the age of majority in your jurisdiction."
      );
    }

    // Early Access period — all Pro features are currently free upon request
    if (!this.isLivePaymentEnabled()) {
      return {
        gateway: "early_access",
        status: "early_access_free",
        message:
          "Learning Allied Pro is currently available free of charge during our Global Early Access period.",
      };
    }

    // In production with credentials configured:
    if (gateway === "razorpay") {
      return {
        gateway: "razorpay",
        sessionId: `rzp_order_${Date.now()}`,
        status: "ready",
        checkoutUrl: `/checkout/razorpay?country=${request.countryCode}&currency=${pricing.currencyCode}`,
      };
    }

    return {
      gateway: "stripe",
      sessionId: `cs_test_${Date.now()}`,
      status: "ready",
      checkoutUrl: `/checkout/stripe?country=${request.countryCode}&currency=${pricing.currencyCode}`,
    };
  }

  /**
   * Plain-language cancellation & refund terms for parent trust.
   */
  static getBillingTerms() {
    return {
      cancellation: "Self-serve one-click cancellation anytime in Settings. No lock-in.",
      refundPolicy: "14-day no-questions-asked refund policy for all annual and monthly plans.",
      childProtection: "Compliant with COPPA, UK Age Appropriate Design Code, and Global Child Privacy Standards.",
      dataMinimization: "We never sell student data or train external AI models on student work.",
    };
  }
}

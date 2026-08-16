export type PricingTierId = "practice";

export interface PricingTier {
  id: PricingTierId;
  name: string;
  priceLabel: string;
  priceSubLabel: string;
  features: string[];
  paymentLinkEnvVar: "NEXT_PUBLIC_STRIPE_LINK_PLATFORM";
}

export const PLATFORM_FEE_MONTHLY = 500;
export const PRICE_PER_CASE = 50;

export function monthlyPriceForCases(caseCount: number): number {
  return PLATFORM_FEE_MONTHLY + PRICE_PER_CASE * Math.max(0, caseCount);
}

export const WORKED_EXAMPLES = [10, 20, 40].map((cases) => ({
  cases,
  price: monthlyPriceForCases(cases),
}));

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "practice",
    name: "Practice",
    priceLabel: `$${PLATFORM_FEE_MONTHLY}/mo + $${PRICE_PER_CASE} per PA packet`,
    priceSubLabel: "Unlimited staff logins. You pay for packets, not seats.",
    features: [
      "AI-assisted Letter of Medical Necessity",
      "PA Strength Score with inline fix suggestions",
      "Denial risk flagging before submission",
      "Denial & appeal support — chart-grounded rebuttal points",
      "20+ orthopedic CPT codes (TKA, THA, rotator cuff, spine, shoulder)",
      "All major payers supported",
      "Sub-60-second turnaround",
      "Submission-ready DOCX download",
      "Multiple staff logins (PA coordinators + front desk)",
      "Dedicated onboarding call + setup support",
      "Priority email support",
    ],
    paymentLinkEnvVar: "NEXT_PUBLIC_STRIPE_LINK_PLATFORM",
  },
];

export const CONTACT_FALLBACK_EMAIL = "kamari@orthren.com";

export function getPaymentLinkUrl(tier: PricingTier): string | null {
  // NEXT_PUBLIC_STRIPE_LINK_SOLO is the pre-repricing env var name, kept as a
  // fallback so an unmigrated deploy doesn't silently drop the CTA to mailto.
  const url = process.env[tier.paymentLinkEnvVar] || process.env.NEXT_PUBLIC_STRIPE_LINK_SOLO;
  return url && url.trim().length > 0 ? url : null;
}

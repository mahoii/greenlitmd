import type { Metadata } from "next";
import PricingCtaButton from "@/components/pricing/PricingCtaButton";
import {
  PRICING_TIERS,
  WORKED_EXAMPLES,
  PLATFORM_FEE_MONTHLY,
  PRICE_PER_CASE,
  CONTACT_FALLBACK_EMAIL,
  getPaymentLinkUrl,
} from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing — Orthren",
  description: "Pricing for orthopedic prior authorization packets — you pay for packets, not seats.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="px-6 pt-20 pb-10 text-center">
        <p className="text-xs font-medium tracking-widest uppercase text-clinical-blue mb-4">
          Pricing
        </p>
        <h1 className="mx-auto max-w-[560px] text-3xl font-bold tracking-tight text-clinical-navy sm:text-4xl leading-snug">
          You pay for packets, not seats
        </h1>
        <p className="mt-4 text-slate-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          One denied surgery costs $15k–$50k. A flat platform fee plus a per-packet rate scales with the volume that
          actually protects that revenue.
        </p>
        <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-green-700 shadow-sm">
          First 2 weeks free — see it on a real chart.
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-md">
          {PRICING_TIERS.map((tier) => {
            const paymentLinkUrl = getPaymentLinkUrl(tier);
            return (
              <div
                key={tier.id}
                className="flex flex-col justify-between rounded-2xl border-2 border-clinical-navy bg-white p-8 shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                <div>
                  <h2 className="text-xl font-bold text-clinical-navy">{tier.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{tier.priceSubLabel}</p>

                  <div className="mt-6">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                      {tier.priceLabel}
                    </span>
                  </div>

                  <div className="mt-4 rounded-lg bg-clinical-mist p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                      ${PLATFORM_FEE_MONTHLY} platform fee + ${PRICE_PER_CASE} per PA packet
                    </p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {WORKED_EXAMPLES.map((example) => (
                        <li key={example.cases} className="flex justify-between">
                          <span>{example.cases} packets/mo</span>
                          <span className="font-medium text-slate-800">
                            ${example.price.toLocaleString()}/mo
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <ul className="mt-8 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <span className="mt-0.5 text-green-500">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <PricingCtaButton
                  tierId={tier.id}
                  tierName={tier.name}
                  paymentLinkUrl={paymentLinkUrl}
                  className={`mt-8 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold shadow transition ${
                    paymentLinkUrl
                      ? "bg-clinical-navy text-white hover:bg-clinical-blue"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-6 pb-16 text-center">
        <p className="text-sm text-slate-500">
          Questions about a plan? Email{" "}
          <a
            href={`mailto:${CONTACT_FALLBACK_EMAIL}`}
            className="text-clinical-blue hover:underline"
          >
            {CONTACT_FALLBACK_EMAIL}
          </a>
        </p>
      </section>
    </div>
  );
}

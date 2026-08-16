"use client";

import { useState } from "react";
import Link from "next/link";
import { PRICING_TIERS, CONTACT_FALLBACK_EMAIL, monthlyPriceForCases } from "@/lib/pricing";

const FAQS = [
  {
    q: "How do you handle PHI?",
    a: "Charts reach our server intact and are processed in memory only — never persisted. All 18 HIPAA identifiers are stripped by two independent de-identification layers before any AI call. See our data handling page for the full posture.",
  },
  {
    q: "Does my surgeon need to review everything?",
    a: "Yes, and that's by design. Every PA packet is AI-assisted and requires physician review and approval before submission. Nothing is auto-submitted. The AI handles the drafting; the physician confirms accuracy.",
  },
  {
    q: "How long does it take to get started?",
    a: "Most practices are generating their first PA packet within 10 minutes of signing up. Upload a chart, fill in 4 fields, and your packet is ready. No lengthy onboarding required.",
  },
  {
    q: "What if a PA gets denied?",
    a: "The PA Strength Score and denial risk flagging catch documentation gaps before submission. If a denial still comes back, paste the payer's reason in and Orthren generates chart-grounded rebuttal points and criteria citations for a peer-to-peer call or written appeal.",
  },
  {
    q: "Is there a long-term contract?",
    a: "No. Month-to-month. Cancel anytime.",
  },
  {
    q: "Does it work with my payer?",
    a: "Orthren works with all major commercial payers including Aetna, BCBS, United Healthcare, Cigna, and Medicare Advantage plans. If you have a specific payer question, reach out before booking a demo.",
  },
];

const PAYERS = [
  "Aetna",
  "BCBS",
  "United Healthcare",
  "Cigna",
  "Medicare Advantage",
  "+ more",
];

function IconShieldCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconUserCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75l1.5 1.5 3-3" />
    </svg>
  );
}

function IconCalculator() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.498-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm2.504-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm2.498-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

const BASELINE_DENIAL_RATE = 0.09; // 8–10% industry baseline, midpoint
const AVG_CASE_VALUE = 32500; // midpoint of the $15k–$50k industry est. cited above

export default function PricingSection() {
  const [packetsPerMonth, setPacketsPerMonth] = useState(20);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const practiceTier = PRICING_TIERS.find((t) => t.id === "practice")!;
  const price = monthlyPriceForCases(packetsPerMonth);
  const exposedRevenue = Math.round(packetsPerMonth * BASELINE_DENIAL_RATE * AVG_CASE_VALUE);

  function handleFaqClick(index: number) {
    setOpenFaq(openFaq === index ? null : index);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* 1. Eyebrow + headline + subhead */}
      <section className="px-6 pt-20 pb-10 text-center">
        <p className="text-xs font-medium tracking-widest uppercase text-clinical-blue mb-4">
          Pricing
        </p>
        <h1 className="mx-auto max-w-[520px] text-3xl font-bold tracking-tight text-clinical-navy sm:text-4xl leading-snug">
          Prior auth denials cost your practice $15K–$50K each. We help prevent — and recover — them.
        </h1>
        <p className="mt-4 text-slate-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          A flat platform fee plus a per-packet rate. You pay for packets, not seats.
        </p>
      </section>

      {/* 2. Pricing card with packet-volume slider */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-lg">
          <div className="relative rounded-2xl border-2 border-clinical-navy bg-white p-8 shadow-lg flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-0.5">
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-clinical-navy px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow">
              Simple, volume-based pricing
            </span>
            <div>
              <h2 className="text-xl font-bold text-clinical-navy">
                Practice plan
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {practiceTier.priceLabel}
              </p>

              <div className="mt-6 flex items-center justify-between gap-4">
                <label htmlFor="packets-per-month" className="text-sm text-slate-600">
                  PA packets per month:
                </label>
                <input
                  id="packets-per-month"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={packetsPerMonth}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isNaN(next)) return;
                    setPacketsPerMonth(Math.min(100, Math.max(0, next)));
                  }}
                  className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-right text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-clinical-blue"
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={packetsPerMonth}
                onChange={(e) => setPacketsPerMonth(Number(e.target.value))}
                className="mt-3 w-full accent-clinical-navy"
              />

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-slate-900">
                  ${price.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-slate-500">/mo</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                $500 platform fee + $50 × {packetsPerMonth} packets
              </p>

              <ul className="mt-8 space-y-3">
                {practiceTier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="mt-0.5"><IconCheck /></span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/pricing"
              id="pricing-practice-cta"
              className="mt-8 block w-full rounded-lg bg-clinical-navy px-4 py-2.5 text-center text-sm font-semibold text-white shadow transition hover:bg-clinical-blue"
            >
              See plans &amp; start free
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Denial-exposure calculator */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-slate-50 p-8">
          <div className="flex items-center gap-2 mb-6 text-clinical-navy">
            <IconCalculator />
            <h2 className="text-sm font-medium">
              See what denials are putting at risk each month
            </h2>
          </div>

          <div className="mt-1 space-y-3">
            <div className="grid sm:grid-cols-2 gap-4 items-center">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Revenue exposed to denial
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  At an 8–10% industry baseline denial rate × $15k–$50k lost per denial (est., midpoints used)
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-2xl font-medium text-red-500">${exposedRevenue.toLocaleString()}/mo</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 items-center">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  vs. Orthren
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Platform fee + per-packet rate at this volume
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-2xl font-medium text-green-600">${price.toLocaleString()}/mo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trust signals */}
      <section className="px-6 pb-14">
        <div className="mx-auto max-w-2xl flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-clinical-blue"><IconShieldCheck /></span>
            PHI de-identified before AI processing
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-clinical-blue"><IconClock /></span>
            Sub-60-second turnaround
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-clinical-blue"><IconUserCheck /></span>
            Physician-reviewed workflow
          </div>
        </div>
      </section>

      {/* 5. Payer compatibility */}
      <section className="px-6 pb-16 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">
          Works with:
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {PAYERS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
            >
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="px-6 pb-16 bg-slate-50 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-xl font-medium text-clinical-navy mb-8">
            Common Questions
          </h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => handleFaqClick(i)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <IconChevron open={isOpen} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-500 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Footer CTA strip */}
      <section className="px-6 py-16 text-center border-t border-slate-200">
        <p className="text-sm text-slate-600">
          High-volume practice or multi-site group?{" "}
          <a
            href={`mailto:${CONTACT_FALLBACK_EMAIL}`}
            className="text-clinical-blue hover:underline"
          >
            Contact us for enterprise pricing.
          </a>
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Still deciding? See plans and pricing — no commitment required.
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-block rounded-lg border-2 border-clinical-navy px-6 py-2.5 text-sm font-medium text-clinical-navy transition hover:bg-slate-50"
        >
          See plans
        </Link>
      </section>

    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How we handle your data — Orthren",
  description: "What Orthren receives, what it never stores, and how PHI is de-identified before any AI call.",
};

export default function SecurityPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-clinical-navy mb-6">How we handle your data</h1>

      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">What we receive</h2>
        <p className="text-slate-600 text-sm leading-7">
          A chart or clinical note you upload to generate a PA packet. The chart reaches our server intact —
          de-identification runs there, before any text is sent to an AI model. It is read into server memory for
          the duration of that request only.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">What we never store</h2>
        <p className="text-slate-600 text-sm leading-7">
          We do not persist the chart, the generated letter, or the patient&apos;s name. For Team-tier organizations,
          we log metadata about each packet generated — CPT code, payer, PA Strength Score, and a one-way hashed
          patient name — solely to meter usage for billing. Solo (non-org) use leaves no record at all.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">De-identification</h2>
        <p className="text-slate-600 text-sm leading-7">
          Before any text reaches an AI model, it passes through two independent de-identification layers. The
          first strips all 18 HIPAA Safe Harbor identifiers — names, dates, contact info, device and record
          numbers, and more — across 25 ordered passes. The second layer independently verifies the result and
          fails closed: if anything looks like it might still be identifying, it is redacted rather than passed
          through. This is stress-tested against a fixed set of adversarial cases on every change.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">Subprocessors</h2>
        <p className="text-slate-600 text-sm leading-7">
          Anthropic (receives de-identified text only), Supabase (application database), Vercel (hosting), Resend
          (transactional email), and Upstash (rate limiting and short-lived caching).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">Physician review</h2>
        <p className="text-slate-600 text-sm leading-7">
          Every generated packet requires review and sign-off by a licensed provider before it is submitted to any
          payer. Nothing is submitted automatically.
        </p>
      </section>

      <p className="mt-10 text-sm text-slate-500">
        Questions about our data handling? See our <Link href="/privacy" className="text-clinical-blue underline">Privacy Policy</Link>{" "}
        or email <a href="mailto:kamari@orthren.com" className="text-clinical-blue underline">kamari@orthren.com</a>.
      </p>
    </main>
  );
}

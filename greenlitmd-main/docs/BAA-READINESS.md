# BAA readiness — internal tracking only

Not linked from any public page. Do not reference this file from `app/` or `components/` —
its existence is fine, but the app should not point at it.

## Why this exists

`/security` states data-handling facts and makes no compliance attestation. It used to also
state that no BAA was signed — that line was removed 2026-08-14 because publishing the gap
was a self-inflicted, Google-indexable disqualifier (see `docs/STATUS-ROADMAP.md`). Removing
the sentence does not close the gap. This file tracks the actual work.

**Outreach should not start until this list is meaningfully done**, not just this file created.

Real chart upload is currently hard-blocked in `app/builder/BuilderClient.tsx` (no way to proceed
past the "paused" modal) specifically because a click-through acknowledgment was reviewed and
rejected as a substitute for a signed BAA — see `docs/STATUS-ROADMAP.md`, 2026-08-14. Don't lift
that block by adding a "continue anyway" button; lift it by finishing this checklist.

## Checklist

- [ ] **Anthropic BAA** — available commercially. This is a "not yet obtained" item, not a
  "cannot obtain" one. Get it wrong in a live sales conversation and it's worse than the gap.
- [ ] **Vercel BAA** — Enterprise-gated. Known escape hatch: move PHI-touching compute
  (the chart-upload/extraction path) to AWS/GCP, which offer BAAs without an enterprise tier.
  Real architectural decision with cost implications — don't treat as a checkbox.
- [ ] **Supabase BAA** — available on paid tiers; confirm current plan qualifies.
- [ ] **Resend** — confirm it never receives PHI. If it can't be guaranteed, that's the
  mitigation: write down the guarantee, don't chase a BAA for it.
- [ ] **Upstash** — same question. Note the open `AUDIT-FINDINGS.md` A5 item: PHI-bearing
  `denialReason` is currently stored raw in Redis. That's a live PHI path into Upstash and
  needs closing regardless of BAA status — it's a bug, not a policy gap.
- [ ] **Customer-facing BAA template** — needed before any practice can legally send a live
  chart under contract.
- [ ] **Prepared verbal answer** for when an office manager asks in person, so the honest
  response is ready without ever being indexed.
- [ ] **`PA_HASH_SALT` set in production** — unrelated to BAA, but also currently silently
  unset-tolerant, and under per-case pricing a missing salt now drops billable events. Track
  separately, don't conflate with compliance work, but don't forget it either.

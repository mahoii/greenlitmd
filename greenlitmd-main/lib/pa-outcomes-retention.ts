// Shared by app/api/feedback/route.ts and scripts/scrub-pa-outcomes.ts so the
// two can never drift. No reader of "pa_outcomes:*" exists anywhere in the
// repo (write-only) -- the key scheme is free to change, but every key must
// carry a real TTL. See A5, AUDIT-FINDINGS.md.
export const PA_OUTCOMES_TTL_SECONDS = 60 * 60 * 24 * 730; // 24 months
export const PA_OUTCOMES_MAX_PER_DAY = 1000;

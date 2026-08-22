import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createHmac } from "crypto";
import { requireEnv } from "@/lib/env-guard";

const redis = Redis.fromEnv();

/**
 * Rate-limit keys are HMAC'd, never the raw IP — a bare IP is a HIPAA Safe
 * Harbor identifier (#15) and would otherwise sit in Upstash tied to
 * PA-generation activity indefinitely. requireEnv("PA_HASH_SALT") already
 * throws at import time (lib/env-guard.ts), so no fallback path is needed
 * here — every route that imports a limiter from this file guarantees the
 * salt is present before this function can ever be called.
 *
 * Known limitation, not a full anonymization guarantee: IPv4 is only a ~4.3B
 * keyspace, so if PA_HASH_SALT itself ever leaks, the entire IP mapping is
 * brute-forceable offline in hours on commodity hardware (HHS de-id guidance
 * treats a keyed/HMAC'd identifier as Expert-Determination territory, not
 * Safe Harbor, for exactly this reason). This still meaningfully raises the
 * bar over storing the raw IP directly in Upstash — the two secrets (salt,
 * Upstash access) are separate trust boundaries — but is a mitigation, not
 * a guarantee, and depends on PA_HASH_SALT never being logged or exposed.
 */
export function rateLimitKey(ip: string): string {
  return createHmac("sha256", requireEnv("PA_HASH_SALT")).update(ip).digest("hex");
}

// Separate budgets per route class instead of one shared 5-req/60s bucket for
// the entire product. Previously every user-facing route imported the same
// `rateLimiter` instance and default key prefix, so a single normal workflow
// (generate -> anchor-flags -> regenerate -> export) could exhaust the whole
// budget on its own, and a clinic behind one shared NAT IP split 5
// requests/minute across every user and every route. Upstash's Ratelimit
// namespaces by the `prefix` option, so these share one Redis instance without
// key collisions. See C7 in AUDIT-FINDINGS.md.

/** Expensive: file parsing + 2-3 Anthropic calls per request (generate-pa). */
export const generationRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(8, "60 s"),
  analytics: false,
  prefix: "ratelimit:generation",
});

/** Moderate: a single Anthropic call per request (regenerate-letter, regenerate-denial-fix, generate-appeal-talking-points). */
export const regenerationRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, "60 s"),
  analytics: false,
  prefix: "ratelimit:regeneration",
});

/** Cheap: no Anthropic call, or one small structured-output call (anchor-flags, export, feedback). */
export const lightRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  analytics: false,
  prefix: "ratelimit:light",
});

/** Admin/ops routes — single-operator traffic; kept separate so it never competes with user-facing budgets. */
export const adminRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: false,
  prefix: "ratelimit:admin",
});

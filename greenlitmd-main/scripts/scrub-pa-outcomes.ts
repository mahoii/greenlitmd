/**
 * One-time scrub for pa_outcomes entries written before commit 78b9f03,
 * which stored denialReason verbatim (no deidentify() pass). Dry-run by
 * default — never mutates Redis unless both --apply AND the confirmation
 * env var are set. See A5, AUDIT-FINDINGS.md.
 *
 * Usage:
 *   node -r dotenv/config scripts/scrub-pa-outcomes.ts                # dry run, reports only
 *   PA_OUTCOMES_SCRUB_CONFIRM=yes node -r dotenv/config scripts/scrub-pa-outcomes.ts --apply
 *
 * This script only exists to be reviewed and run manually by a human who has
 * decided to touch prod data — it is never invoked from application code or CI.
 */
import { Redis } from "@upstash/redis";
import { deidentify } from "../lib/deidentify";
import { PA_OUTCOMES_TTL_SECONDS, PA_OUTCOMES_MAX_PER_DAY } from "../lib/pa-outcomes-retention";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const APPLY = process.argv.includes("--apply");
const CPT_CODE_RE = /^\d{5}(-\d{2})?$/;
const PAYER_NAME_ID_SHAPE_RE = /\d{4,}/;
const MAX_PAYER_NAME_LENGTH = 120;

interface LegacyRecord {
  id: string;
  timestamp: string;
  cptCode: string;
  payerName: string;
  outcome: "approved" | "denied" | "pending";
  denialReason: string | null;
  paScore: number;
}

async function main() {
  if (APPLY && process.env.PA_OUTCOMES_SCRUB_CONFIRM !== "yes") {
    console.error(
      "Refusing to apply: set PA_OUTCOMES_SCRUB_CONFIRM=yes to confirm you intend to mutate prod Redis."
    );
    process.exit(1);
  }

  // Legacy key from before the per-day bucketing change in this pass.
  // New writes go to pa_outcomes:<YYYY-MM-DD> and are already de-identified
  // at write time — this script only ever touches the old immortal key.
  const legacyKey = "pa_outcomes";
  const raw = await redis.lrange(legacyKey, 0, -1);
  console.log(`Found ${raw.length} entries in legacy key "${legacyKey}".`);

  let needsDenialScrub = 0;
  let needsPayerRejection = 0;
  let needsCptRejection = 0;
  const rewritten: string[] = [];

  for (const entry of raw) {
    const record: LegacyRecord = typeof entry === "string" ? JSON.parse(entry) : entry;

    let changed = false;
    const next = { ...record };

    if (record.denialReason) {
      const { redacted, map } = deidentify(record.denialReason);
      if (Object.keys(map).length > 0 || redacted !== record.denialReason) {
        needsDenialScrub++;
        next.denialReason = redacted;
        changed = true;
      }
    }

    if (PAYER_NAME_ID_SHAPE_RE.test(record.payerName) || record.payerName.length > MAX_PAYER_NAME_LENGTH) {
      needsPayerRejection++;
      // Flagged, not auto-rewritten — an identifier-shaped payerName means
      // the field likely holds the wrong data entirely; a human should look
      // at it rather than have this script guess a replacement.
    }

    if (!CPT_CODE_RE.test(record.cptCode)) {
      needsCptRejection++;
    }

    rewritten.push(JSON.stringify(changed ? next : record));
  }

  console.log(`  denialReason needing scrub: ${needsDenialScrub}`);
  console.log(`  payerName flagged (identifier-shaped or oversized): ${needsPayerRejection}`);
  console.log(`  cptCode not matching CPT shape: ${needsCptRejection}`);

  if (!APPLY) {
    console.log("\nDry run only — no writes made. Re-run with --apply (+ confirm env var) to persist.");
    return;
  }

  // Apply: redistribute each scrubbed record into the same per-day bucket
  // scheme app/api/feedback/route.ts writes to (pa_outcomes:<YYYY-MM-DD>),
  // each carrying a real TTL, then delete the legacy key entirely. Rewriting
  // legacyKey in place and adding a bare expire() (the initially-proposed
  // fix) would still leave one oversized immortal-shaped key outside the
  // retention scheme this pass introduced — redistributing is no more work
  // and leaves no legacy shape to reason about going forward.
  const byDay = new Map<string, string[]>();
  for (let i = 0; i < rewritten.length; i++) {
    const record: LegacyRecord = JSON.parse(rewritten[i]);
    const parsed = Date.parse(record.timestamp);
    // A record whose timestamp can't be parsed still gets a bucket with a
    // TTL (never falls through to an immortal key) — it just can't be dated.
    const day = Number.isNaN(parsed) ? "undated" : record.timestamp.slice(0, 10);
    const key = `pa_outcomes:${day}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(rewritten[i]);
  }

  for (const [dayKey, entries] of byDay) {
    const pipeline = redis.pipeline();
    // Newest-first to match lpush's prepend semantics on the live write path.
    for (const entry of entries.slice().reverse()) {
      pipeline.lpush(dayKey, entry);
    }
    pipeline.ltrim(dayKey, 0, PA_OUTCOMES_MAX_PER_DAY - 1);
    pipeline.expire(dayKey, PA_OUTCOMES_TTL_SECONDS);
    await pipeline.exec();
  }

  await redis.del(legacyKey);
  console.log(
    `Applied: redistributed ${rewritten.length} entries across ${byDay.size} day-bucket key(s); deleted legacy key "${legacyKey}".`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

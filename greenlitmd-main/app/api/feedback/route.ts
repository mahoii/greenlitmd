import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { lightRateLimiter, rateLimitKey } from "@/lib/rate-limit";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { deidentify } from "@/lib/deidentify";
import { assertDeidentified, DeidVerificationError } from "@/lib/deid-verify";
import { captureEvent } from "@/lib/posthog";
import { PA_OUTCOMES_TTL_SECONDS, PA_OUTCOMES_MAX_PER_DAY } from "@/lib/pa-outcomes-retention";

const MAX_DENIAL_REASON_LENGTH = 5000;
const MAX_PAYER_NAME_LENGTH = 120;
// Payer names never contain a 4+ digit run — a match here is a member
// ID/DOB/MRN shape leaking into the wrong field. Validate-and-reject rather
// than deidentify(): the fail-closed residual pass in lib/deidentify.ts
// masks any multi-word Titlecase span, which would turn "Blue Cross Blue
// Shield" into [REDACTED] and destroy the analytics signal this field exists
// for.
const PAYER_NAME_ID_SHAPE_RE = /\d{4,}/;
const CPT_CODE_RE = /^\d{5}(-\d{2})?$/;
// No reader of "pa_outcomes" exists anywhere in the repo (write-only), so the
// key scheme is free to change. Daily buckets + a real expire() give every
// key an actual time bound; refreshing a TTL on one shared key on every
// write would mean an actively-written list never actually expires.

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const runtime = "nodejs";

interface FeedbackPayload {
  cptCode: string;
  payerName: string;
  outcome: "approved" | "denied" | "pending";
  denialReason?: string | null;
  paScore: number;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
    const { success } = await lightRateLimiter.limit(rateLimitKey(ip));
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const supabase = createSupabaseAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as FeedbackPayload;
    const { cptCode, payerName, outcome, denialReason, paScore } = body;

    // Validate required fields
    if (!cptCode || typeof cptCode !== "string") {
      return NextResponse.json({ error: "cptCode is required and must be a string" }, { status: 400 });
    }
    if (!CPT_CODE_RE.test(cptCode.trim())) {
      return NextResponse.json({ error: "cptCode must be a 5-digit CPT code" }, { status: 400 });
    }
    if (!payerName || typeof payerName !== "string") {
      return NextResponse.json({ error: "payerName is required and must be a string" }, { status: 400 });
    }
    if (payerName.trim().length > MAX_PAYER_NAME_LENGTH) {
      return NextResponse.json(
        { error: `payerName must be ${MAX_PAYER_NAME_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    if (PAYER_NAME_ID_SHAPE_RE.test(payerName)) {
      return NextResponse.json({ error: "payerName must not contain an identifier-shaped value" }, { status: 400 });
    }
    if (!outcome || !["approved", "denied", "pending"].includes(outcome)) {
      return NextResponse.json({ error: "outcome must be 'approved', 'denied', or 'pending'" }, { status: 400 });
    }
    if (typeof paScore !== "number" || isNaN(paScore)) {
      return NextResponse.json({ error: "paScore is required and must be a number" }, { status: 400 });
    }
    if (denialReason != null && typeof denialReason !== "string") {
      return NextResponse.json({ error: "denialReason must be a string" }, { status: 400 });
    }
    if (denialReason && denialReason.length > MAX_DENIAL_REASON_LENGTH) {
      return NextResponse.json(
        { error: `denialReason must be ${MAX_DENIAL_REASON_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    // denialReason is clinician-pasted free text and routinely contains a
    // patient name/DOB/MRN copied straight out of a denial letter — it must
    // be de-identified before it's persisted, not just excluded from the
    // record's other fields. Previously this was stored verbatim under a
    // comment claiming "zero PHI storage." See A5 in AUDIT-FINDINGS.md.
    const trimmedReason = outcome === "denied" ? (denialReason?.trim() || null) : null;
    let redactedDenialReason: string | null = null;
    if (trimmedReason) {
      const { redacted, map } = deidentify(trimmedReason);
      assertDeidentified(redacted, map, "feedback.denialReason");
      redactedDenialReason = redacted;
    }

    // Construct record — No Patient Name, No DOB to ensure zero PHI storage
    const record = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      cptCode: cptCode.trim(),
      payerName: payerName.trim(),
      outcome,
      denialReason: redactedDenialReason,
      paScore,
    };

    // Store in a per-day Upstash Redis list with a real TTL — see the
    // PA_OUTCOMES_TTL_SECONDS comment above. A5, AUDIT-FINDINGS.md.
    // Pipelined (single HTTP round-trip) rather than three sequential
    // await calls -- @upstash/redis's REST client issues each bare command
    // as an independent HTTP request, so a crash/timeout between them could
    // leave lpush/ltrim applied with expire() never reached, silently
    // recreating an immortal key (the exact bug this change fixes).
    // pipeline().exec() sends all three as one request, atomically from the
    // caller's perspective.
    const dayKey = `pa_outcomes:${record.timestamp.slice(0, 10)}`;
    const pipeline = redis.pipeline();
    pipeline.lpush(dayKey, JSON.stringify(record));
    // lpush prepends, so index 0 is newest -- keep only the most recent
    // entries per day so this list doesn't grow unbounded within its TTL.
    pipeline.ltrim(dayKey, 0, PA_OUTCOMES_MAX_PER_DAY - 1);
    pipeline.expire(dayKey, PA_OUTCOMES_TTL_SECONDS);
    await pipeline.exec();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof DeidVerificationError) {
      await captureEvent({
        distinctId: "server",
        event: "deid_verification_failed",
        properties: { seam: error.seam, route: "feedback", categories: error.categories, leak_count: error.leakCount },
      });
      return NextResponse.json(
        { error: "DEID_VERIFICATION_FAILED", categories: error.categories },
        { status: 422 }
      );
    }
    console.error("[feedback] POST handler error:", error);
    return NextResponse.json({ error: "Unable to submit feedback. Please try again." }, { status: 500 });
  }
}

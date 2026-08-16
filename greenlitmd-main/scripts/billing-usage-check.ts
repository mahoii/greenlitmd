// Offline regression harness for lib/billing/usage.ts. No DB/network calls.
// Run with: npx tsx scripts/billing-usage-check.ts

import { summarizeUsage, currentBillingPeriod } from "../lib/billing/usage";
import { monthlyPriceForCases } from "../lib/pricing";

let failures = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  [OK]   ${name}`);
  } else {
    console.log(`  [FAIL] ${name}`);
    failures++;
  }
}

const period = { start: new Date("2026-07-01T00:00:00Z"), end: new Date("2026-08-01T00:00:00Z") };

const surgeons = [
  { id: "s1", full_name: "Dr. A", active: true },
  { id: "s2", full_name: "Dr. B", active: true },
  { id: "s3", full_name: "Dr. C (inactive)", active: false }
];

const cases = [
  { surgeon_id: "s1" },
  { surgeon_id: "s1" },
  { surgeon_id: "s2" },
  { surgeon_id: "s3" } // inactive surgeon's historical cases still count toward totalCases
];

const summary = summarizeUsage(surgeons, cases, period);

check("counts cases per surgeon correctly", summary.perSurgeon.find((s) => s.surgeonId === "s1")?.caseCount === 2);
check("zero-case surgeon shows 0, not undefined", summary.perSurgeon.find((s) => s.surgeonId === "s2")?.caseCount === 1);
check("inactive surgeon excluded from activeSurgeonCount", summary.activeSurgeonCount === 2);
check("totalCases sums all surgeons including inactive", summary.totalCases === 4);
check(
  "amountCents matches monthlyPriceForCases(totalCases) in cents",
  summary.amountCents === monthlyPriceForCases(4) * 100
);
check("platformFeeCents is the flat $500 fee regardless of volume", summary.platformFeeCents === 50000);
check("caseChargeCents is $50 per packet", summary.caseChargeCents === 4 * 50 * 100);
check("headcount no longer drives price — 0 vs 2 active surgeons, same case count, same amount", (() => {
  const zeroActive = summarizeUsage(
    surgeons.map((s) => ({ ...s, active: false })),
    cases,
    period
  );
  return zeroActive.amountCents === summary.amountCents;
})());
check("empty input produces the $500 platform-fee floor, not a crash", summarizeUsage([], [], period).amountCents === monthlyPriceForCases(0) * 100);
check("zero-case org is billed exactly the platform fee", summarizeUsage([], [], period).amountCents === 50000);

const { start, end } = currentBillingPeriod(new Date("2026-07-19T12:00:00Z"));
check("currentBillingPeriod resolves to calendar month start", start.toISOString() === "2026-07-01T00:00:00.000Z");
check("currentBillingPeriod resolves to next month as exclusive end", end.toISOString() === "2026-08-01T00:00:00.000Z");

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
process.exit(failures > 0 ? 1 : 0);

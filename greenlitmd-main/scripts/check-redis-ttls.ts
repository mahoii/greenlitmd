/**
 * Asserts no key this product writes has TTL == -1 (immortal). Run manually
 * or in CI against a non-prod Redis to catch a regression back to unbounded
 * retention. See A5, AUDIT-FINDINGS.md.
 *
 * Usage: node -r dotenv/config scripts/check-redis-ttls.ts
 */
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function main() {
  let cursor = "0";
  const immortal: string[] = [];
  let scanned = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { count: 200 });
    cursor = nextCursor;
    for (const key of keys) {
      scanned++;
      const ttl = await redis.ttl(key);
      if (ttl === -1) immortal.push(key);
    }
  } while (cursor !== "0");

  console.log(`Scanned ${scanned} keys.`);
  if (immortal.length > 0) {
    console.error(`FAIL: ${immortal.length} key(s) with no TTL:`);
    for (const key of immortal) console.error(`  - ${key}`);
    process.exit(1);
  }
  console.log("PASS: every key has a TTL.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

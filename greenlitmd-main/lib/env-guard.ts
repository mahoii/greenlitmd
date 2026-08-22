/**
 * Fail-closed required-env accessor. Throws at call time (imported from a
 * module-load site so the throw happens at boot, not mid-request) rather
 * than letting a missing secret degrade silently — see PA_HASH_SALT below:
 * under per-packet pricing, a missing salt used to mean cases went unbilled
 * with a 200 response and a swallowed error, not a visible failure.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured — this is required at boot, not optional.`);
  }
  return value;
}

// Asserted at import time so any route importing lib/rate-limit.ts (every
// user-facing route does) fails to boot rather than serve without it.
requireEnv("PA_HASH_SALT");

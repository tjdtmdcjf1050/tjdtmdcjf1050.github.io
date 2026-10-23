import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { authAttempts } from "../db/schema";

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function requestFingerprint(
  request: Request,
  scope: string,
  subject = "anonymous",
) {
  const forwarded = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const ip = forwarded.split(",")[0].trim();
  return digest(`${scope}:${ip}:${subject.toLowerCase().slice(0, 80)}`);
}

export async function checkAttemptLimit(options: {
  scope: string;
  identifier: string;
  limit: number;
  windowMinutes: number;
}) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - options.windowMinutes * 60_000).toISOString();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(authAttempts)
    .where(
      and(
        eq(authAttempts.scope, options.scope),
        eq(authAttempts.identifier, options.identifier),
        gte(authAttempts.attemptedAt, cutoff),
      ),
    );
  return Number(row?.count || 0) < options.limit;
}

export async function recordFailedAttempt(scope: string, identifier: string) {
  const db = await getDb();
  const cleanupBefore = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  await db.insert(authAttempts).values({ scope, identifier });
  await db.delete(authAttempts).where(lt(authAttempts.attemptedAt, cleanupBefore));
}

export async function clearFailedAttempts(scope: string, identifier: string) {
  const db = await getDb();
  await db
    .delete(authAttempts)
    .where(
      and(eq(authAttempts.scope, scope), eq(authAttempts.identifier, identifier)),
    );
}

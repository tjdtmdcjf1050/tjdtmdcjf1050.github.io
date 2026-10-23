import { cookies } from "next/headers";

const COOKIE = "growbook_admin";
const encoder = new TextEncoder();

async function adminEnv() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as Record<string, string | undefined>;
}

async function signature(value: string) {
  const secret = (await adminEnv()).ADMIN_SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("ADMIN_SESSION_SECRET is required");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyAdminCredentials(username: string, password: string) {
  const runtime = await adminEnv();
  const expectedUser = runtime.ADMIN_USERNAME || "";
  const expectedPassword = runtime.ADMIN_PASSWORD || "";
  if (!expectedUser || !expectedPassword || (runtime.ADMIN_SESSION_SECRET || "").length < 32 || username.length !== expectedUser.length || password.length !== expectedPassword.length) return false;
  let mismatch = 0;
  for (let i = 0; i < username.length; i++) mismatch |= username.charCodeAt(i) ^ expectedUser.charCodeAt(i);
  for (let i = 0; i < password.length; i++) mismatch |= password.charCodeAt(i) ^ expectedPassword.charCodeAt(i);
  return mismatch === 0;
}

export async function createAdminSession() {
  const runtime = await adminEnv();
  const expires = Date.now() + 1000 * 60 * 60 * 8;
  const value = String(expires);
  const token = `${value}.${await signature(value)}`;
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: runtime.ADMIN_COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function isAdmin() {
  const token = (await cookies()).get(COOKIE)?.value || "";
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || Number(expires) < Date.now()) return false;
  try {
    const expected = await signature(expires);
    if (supplied.length !== expected.length) return false;
    let mismatch = 0;
    for (let index = 0; index < supplied.length; index++)
      mismatch |= supplied.charCodeAt(index) ^ expected.charCodeAt(index);
    return mismatch === 0;
  } catch {
    return false;
  }
}

export async function clearAdminSession() { (await cookies()).delete(COOKIE); }

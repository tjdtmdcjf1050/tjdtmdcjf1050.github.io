import { getD1 } from "../../../../db";
import {
  createSessionToken,
  getSessionUser,
  sessionExpiry,
  setUserSessionCookie,
} from "../../../chatgpt-auth";
import { checkAttemptLimit, requestFingerprint } from "../../../rate-limit";

function randomHex(byteLength: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(byteLength)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function POST(request: Request) {
  try {
    const current = await getSessionUser();
    if (current)
      return Response.json({ signedIn: true, demo: current.role === "tester", message: "내 공간을 열고 있습니다." });

    const body = (await request.json().catch(() => ({}))) as {
      deviceId?: string;
    };
    const deviceId = /^[a-z0-9-]{16,80}$/i.test(body.deviceId || "")
      ? body.deviceId!
      : request.headers.get("oai-authenticated-user-id") ||
        request.headers.get("oai-authenticated-user-email") ||
        "anonymous";
    const identifier = await requestFingerprint(
      request,
      "demo_access",
      deviceId,
    );
    if (!(await checkAttemptLimit({ scope: "demo_access", identifier, limit: 12, windowMinutes: 60 })))
      return Response.json(
        { error: "체험 공간 생성 요청이 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );

    const username = `demo_${identifier.slice(0, 12)}`;
    const token = createSessionToken();
    const expiresAt = sessionExpiry();
    const d1 = await getD1();
    const results = await d1.batch([
      d1
        .prepare(
          "INSERT INTO users (username,email,display_name,password_hash,password_salt,role) VALUES (?,?,?,?,?,'tester') ON CONFLICT(username) DO NOTHING",
        )
        .bind(
          username,
          `${username}@demo.growbook`,
          "체험 작가",
          randomHex(32),
          randomHex(16),
        ),
      d1
        .prepare(
          "INSERT INTO user_sessions (token,user_id,expires_at) SELECT ?,id,? FROM users WHERE username=?",
        )
        .bind(token, expiresAt, username),
      d1
        .prepare(
          "INSERT INTO auth_attempts (scope,identifier) VALUES ('demo_access',?)",
        )
        .bind(identifier),
    ]);
    if (!results[1]?.success || Number(results[1].meta?.changes || 0) !== 1)
      throw new Error("Demo session could not be created");
    await setUserSessionCookie(token);
    return Response.json({ signedIn: true, demo: true, message: "체험 공간을 준비했습니다." });
  } catch (error) {
    console.error("[GROW BOOK DEMO AUTH]", error);
    return Response.json({ error: "체험 공간을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}

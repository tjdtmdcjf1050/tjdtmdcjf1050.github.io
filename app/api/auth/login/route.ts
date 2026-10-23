import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { createUserSession } from "../../../chatgpt-auth";
import { hashPassword } from "../../../password";
import {
  checkAttemptLimit,
  clearFailedAttempts,
  recordFailedAttempt,
  requestFingerprint,
} from "../../../rate-limit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = (body.username || "").trim().toLowerCase();
    const password = body.password || "";
    if (!username || !password)
      return Response.json(
        { error: "아이디와 비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    const identifier = await requestFingerprint(request, "member_login", username);
    if (
      !(await checkAttemptLimit({
        scope: "member_login",
        identifier,
        limit: 8,
        windowMinutes: 15,
      }))
    )
      return Response.json(
        { error: "로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": "900" } },
      );

    const db = await getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    const verified = user
      ? (await hashPassword(password, user.passwordSalt)).hash === user.passwordHash
      : false;
    if (!user || !verified) {
      await recordFailedAttempt("member_login", identifier);
      return Response.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }
    await clearFailedAttempts("member_login", identifier);
    await createUserSession(user.id);
    return Response.json({ signedIn: true });
  } catch {
    return Response.json({ error: "로그인을 처리하지 못했습니다." }, { status: 500 });
  }
}

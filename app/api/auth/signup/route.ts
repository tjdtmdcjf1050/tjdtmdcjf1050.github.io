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
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      displayName?: string;
    };
    const username = (body.username || "").trim().toLowerCase();
    const password = body.password || "";
    const displayName = (body.displayName || username).trim();
    const identifier = await requestFingerprint(request, "member_signup");
    if (
      !(await checkAttemptLimit({
        scope: "member_signup",
        identifier,
        limit: 5,
        windowMinutes: 60,
      }))
    )
      return Response.json(
        { error: "가입 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    if (!/^[a-z0-9_]{4,20}$/.test(username))
      return Response.json(
        { error: "아이디는 영문 소문자, 숫자, 밑줄 4~20자로 입력해 주세요." },
        { status: 400 },
      );
    if (password.length < 8)
      return Response.json({ error: "비밀번호는 8자 이상 입력해 주세요." }, { status: 400 });
    if (displayName.length < 1 || displayName.length > 40)
      return Response.json({ error: "표시 이름을 확인해 주세요." }, { status: 400 });
    const db = await getDb();
    if (
      (
        await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, username))
          .limit(1)
      )[0]
    ) {
      await recordFailedAttempt("member_signup", identifier);
      return Response.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
    }
    const encrypted = await hashPassword(password);
    await db.insert(users).values({
      username,
      email: `${username}@local.growbook`,
      displayName,
      passwordHash: encrypted.hash,
      passwordSalt: encrypted.salt,
    });
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!user) throw new Error("Created member account could not be loaded");
    await createUserSession(user.id);
    await clearFailedAttempts("member_signup", identifier);
    return Response.json({ signedIn: true, message: "회원가입이 완료되었습니다." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE"))
      return Response.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
    return Response.json({ error: "가입을 처리하지 못했습니다." }, { status: 500 });
  }
}

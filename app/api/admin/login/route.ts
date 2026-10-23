import { createAdminSession, verifyAdminCredentials } from "../../../admin-auth";
import {
  checkAttemptLimit,
  clearFailedAttempts,
  recordFailedAttempt,
  requestFingerprint,
} from "../../../rate-limit";

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as {
      username?: string;
      password?: string;
    };
    const identifier = await requestFingerprint(request, "admin_login", username || "");
    if (
      !(await checkAttemptLimit({
        scope: "admin_login",
        identifier,
        limit: 5,
        windowMinutes: 15,
      }))
    )
      return Response.json(
        { error: "관리자 로그인 시도가 잠겼습니다. 15분 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    if (!(await verifyAdminCredentials(username || "", password || ""))) {
      await recordFailedAttempt("admin_login", identifier);
      return Response.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }
    await clearFailedAttempts("admin_login", identifier);
    await createAdminSession();
    return Response.json({ signedIn: true });
  } catch {
    return Response.json(
      { error: "관리자 보안 설정이 준비되지 않았습니다." },
      { status: 503 },
    );
  }
}

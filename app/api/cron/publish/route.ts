import { ensureScheduledPostsPublished } from "../../../growth";

function sameSecret(received: string, expected: string) {
  if (received.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1)
    difference |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export async function POST(request: Request) {
  const secret = process.env.SCHEDULED_JOB_SECRET || "";
  if (secret.length < 32)
    return Response.json(
      { error: "예약 작업 보안 설정이 준비되지 않았습니다." },
      { status: 503 },
    );
  const authorization = request.headers.get("authorization") || "";
  const received = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!sameSecret(received, secret))
    return Response.json({ error: "권한이 없습니다." }, { status: 401 });
  await ensureScheduledPostsPublished();
  return Response.json({ processed: true, processedAt: new Date().toISOString() });
}

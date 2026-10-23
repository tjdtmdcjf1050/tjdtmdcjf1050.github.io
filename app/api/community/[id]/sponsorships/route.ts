import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { notifications, posts, sponsorships } from "../../../../../db/schema";
import { apiError, parsePositiveId, requireApiUser } from "../../../utils";

const SPONSOR_AMOUNTS = new Set([3000, 5000, 10000, 30000]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id: rawId } = await context.params;
  const id = parsePositiveId(rawId);
  if (!id) return Response.json({ error: "잘못된 글입니다." }, { status: 400 });

  try {
    const payload = (await request.json()) as { amount?: unknown; message?: unknown };
    const amount = Number(payload.amount);
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    if (!SPONSOR_AMOUNTS.has(amount)) {
      return Response.json({ error: "후원 금액을 선택해 주세요." }, { status: 400 });
    }
    if (message.length > 120) {
      return Response.json({ error: "응원 메시지는 120자 이하로 입력해 주세요." }, { status: 400 });
    }

    const db = await getDb();
    const [post] = await db
      .select({ id: posts.id, ownerEmail: posts.ownerEmail, title: posts.title, sponsorshipEnabled: posts.sponsorshipEnabled })
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.status, "published")))
      .limit(1);
    if (!post) return Response.json({ error: "발행된 글을 찾을 수 없습니다." }, { status: 404 });
    if (!post.sponsorshipEnabled) return Response.json({ error: "후원 의사를 받지 않는 작품입니다." }, { status: 403 });

    const now = new Date().toISOString();
    await db
      .insert(sponsorships)
      .values({ postId: id, userEmail: auth.user.email, amount, message, updatedAt: now })
      .onConflictDoUpdate({
        target: [sponsorships.postId, sponsorships.userEmail],
        set: { amount, message, updatedAt: now },
      });

    if (post.ownerEmail !== auth.user.email) await db.insert(notifications).values({ userEmail:post.ownerEmail,type:"sponsorship",title:"후원 의사가 도착했습니다.",message:`${amount.toLocaleString("ko-KR")}원 · ${post.title}`,href:`/community/${id}` });

    const [totals] = await db
      .select({ count: sql<number>`count(*)`, amount: sql<number>`coalesce(sum(${sponsorships.amount}), 0)` })
      .from(sponsorships)
      .where(eq(sponsorships.postId, id));

    return Response.json({
      sponsoredAmount: amount,
      sponsorCount: Number(totals?.count ?? 0),
      sponsorAmount: Number(totals?.amount ?? 0),
    });
  } catch (error) {
    return apiError(error);
  }
}

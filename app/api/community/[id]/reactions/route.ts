import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { notifications, postReactions, posts, reactionEvents, reactionFlags } from "../../../../../db/schema";
import { getPublishingRule, recalculateCandidate, startPublishingChallenge } from "../../../../growth";
import { apiError, parsePositiveId, requireApiUser } from "../../../utils";

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
    const payload = (await request.json()) as { type?: unknown };
    const type = payload.type === "like" || payload.type === "purchase" || payload.type === "recommend" ? payload.type : null;
    if (!type) return Response.json({ error: "반응 유형을 확인해 주세요." }, { status: 400 });

    const db = await getDb();
    const [post] = await db
      .select({ id: posts.id, ownerEmail: posts.ownerEmail, title: posts.title, publishChallenge: posts.publishChallenge, purchaseGoal: posts.purchaseGoal })
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.status, "published")))
      .limit(1);
    if (!post) return Response.json({ error: "발행된 글을 찾을 수 없습니다." }, { status: 404 });

    const [existing] = await db
      .select({ id: postReactions.id })
      .from(postReactions)
      .where(
        and(
          eq(postReactions.postId, id),
          eq(postReactions.userEmail, auth.user.email),
          eq(postReactions.type, type),
        ),
      )
      .limit(1);

    const rules = await getPublishingRule();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const [risk] = await db.select({
      hourly: sql<number>`count(*)`,
      repeated: sql<number>`sum(case when ${reactionEvents.postId}=${id} and ${reactionEvents.createdAt}>=${tenMinutesAgo} then 1 else 0 end)`,
    }).from(reactionEvents).where(and(eq(reactionEvents.userEmail, auth.user.email), gte(reactionEvents.createdAt, hourAgo)));
    const riskReason = Number(risk?.hourly || 0) >= rules.abnormalHourlyLimit ? "한 시간 동안 과도한 반응" : Number(risk?.repeated || 0) >= 6 ? "같은 작품의 반복 반응" : "";
    const excluded = Boolean(riskReason) && auth.user.role !== "tester";

    let active = true;
    if (existing) {
      await db.delete(postReactions).where(eq(postReactions.id, existing.id));
      active = false;
    } else {
      await db.insert(postReactions).values({ postId: id, userEmail: auth.user.email, type });
      if (post.ownerEmail !== auth.user.email) {
        const label = type === "purchase" ? "구매희망" : type === "recommend" ? "추천" : "좋아요";
        await db.insert(notifications).values({ userEmail: post.ownerEmail, type: `reaction_${type}`, title: `작품에 ${label} 반응이 도착했습니다.`, message: post.title, href: `/community/${id}` });
      }
    }

    await db.insert(reactionEvents).values({ postId: id, userEmail: auth.user.email, type, action: active ? "add" : "remove", riskReason, excluded });
    if (excluded) {
      const [flag] = await db.select({ id: reactionFlags.id }).from(reactionFlags).where(and(eq(reactionFlags.userEmail, auth.user.email), eq(reactionFlags.postId, id), eq(reactionFlags.status, "active"))).limit(1);
      if (!flag) await db.insert(reactionFlags).values({ userEmail: auth.user.email, postId: id, reason: riskReason });
    }

    const [counts] = await db
      .select({
        likeCount: sql<number>`sum(case when ${postReactions.type} = 'like' then 1 else 0 end)`,
        purchaseCount: sql<number>`sum(case when ${postReactions.type} = 'purchase' then 1 else 0 end)`,
        recommendCount: sql<number>`sum(case when ${postReactions.type} = 'recommend' then 1 else 0 end)`,
      })
      .from(postReactions)
      .where(eq(postReactions.postId, id));

    const purchaseTotal=Number(counts?.purchaseCount??0),recommendTotal=Number(counts?.recommendCount??0),likeTotal=Number(counts?.likeCount??0);
    if(post.publishChallenge){await startPublishingChallenge(id,post.purchaseGoal);await recalculateCandidate(id);}

    return Response.json({
      active,
      likeCount: likeTotal,
      purchaseCount: purchaseTotal,
      recommendCount: recommendTotal,
      excluded,
      riskNotice: excluded ? "비정상 반복 반응으로 점수에서 제외되었습니다." : "",
    });
  } catch (error) {
    return apiError(error);
  }
}

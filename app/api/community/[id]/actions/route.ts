import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { bookmarks, follows, posts, reports } from "../../../../../db/schema";
import { apiError, parsePositiveId, requireApiUser } from "../../../utils";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(); if (auth.error) return auth.error;
  const id = parsePositiveId((await context.params).id); if (!id) return Response.json({ error: "잘못된 글입니다." }, { status: 400 });
  try {
    const { action, reason } = await request.json() as { action?: string; reason?: string };
    const db = await getDb();
    const [post] = await db.select({ ownerEmail: posts.ownerEmail }).from(posts).where(eq(posts.id, id)).limit(1);
    if (!post) return Response.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    if (action === "bookmark") {
      const existing = await db.select({ id: bookmarks.id }).from(bookmarks).where(and(eq(bookmarks.postId, id), eq(bookmarks.userEmail, auth.user.email))).limit(1);
      if (existing[0]) await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id)); else await db.insert(bookmarks).values({ postId: id, userEmail: auth.user.email });
      return Response.json({ active: !existing[0] });
    }
    if (action === "follow") {
      if (post.ownerEmail === auth.user.email) return Response.json({ error: "자신은 팔로우할 수 없습니다." }, { status: 400 });
      const existing = await db.select({ id: follows.id }).from(follows).where(and(eq(follows.followerEmail, auth.user.email), eq(follows.authorEmail, post.ownerEmail))).limit(1);
      if (existing[0]) await db.delete(follows).where(eq(follows.id, existing[0].id)); else await db.insert(follows).values({ followerEmail: auth.user.email, authorEmail: post.ownerEmail });
      return Response.json({ active: !existing[0] });
    }
    if (action === "report") {
      await db.insert(reports).values({ postId: id, reporterEmail: auth.user.email, reason: (reason || "기타").slice(0, 200) }).onConflictDoUpdate({ target: [reports.postId, reports.reporterEmail], set: { reason: (reason || "기타").slice(0, 200), status: "received" } });
      return Response.json({ received: true });
    }
    return Response.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
  } catch (error) { return apiError(error); }
}

import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { posts, readingProgress } from "../../../../../db/schema";
import { apiError, parsePositiveId, requireApiUser } from "../../../utils";
import { recalculateCandidate } from "../../../../growth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const id = parsePositiveId((await context.params).id);
  if (!id) return Response.json({ error: "잘못된 작품입니다." }, { status: 400 });
  try {
    const body = await request.json() as { chapterIndex?: unknown; progressPercent?: unknown; completed?: unknown };
    const chapterIndex = Math.max(0, Math.round(Number(body.chapterIndex) || 0));
    const progressPercent = Math.min(100, Math.max(0, Math.round(Number(body.progressPercent) || 0)));
    const completed = body.completed === true || progressPercent >= 100;
    const db = await getDb();
    const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id,id),eq(posts.status,"published"))).limit(1);
    if (!post) return Response.json({ error: "작품을 찾을 수 없습니다." }, { status: 404 });
    const now = new Date().toISOString();
    await db.insert(readingProgress).values({ postId:id,userEmail:auth.user.email,chapterIndex,progressPercent,completed,updatedAt:now }).onConflictDoUpdate({ target:[readingProgress.postId,readingProgress.userEmail], set:{chapterIndex,progressPercent,completed,updatedAt:now} });
    await recalculateCandidate(id);
    return Response.json({ saved:true,chapterIndex,progressPercent,completed });
  } catch (error) { return apiError(error); }
}

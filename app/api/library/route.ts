import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { bookmarks, posts, readingHistory, readingProgress, savedFilters, topics } from "../../../db/schema";
import { apiError, parsePositiveId, requireApiUser } from "../utils";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error)
    return Response.json({ recent: [], later: [], filters: [], signedIn: false });
  try {
    const db = await getDb();
    const recent = await db.select({
      id: posts.id, title: posts.title, authorName: posts.authorName, topicName: topics.name,
      topicColor: topics.color, coverImage: posts.coverImage, lastViewedAt: readingHistory.lastViewedAt,
      progressPercent: readingProgress.progressPercent,
    }).from(readingHistory)
      .innerJoin(posts, eq(readingHistory.postId, posts.id))
      .innerJoin(topics, eq(posts.topicId, topics.id))
      .leftJoin(readingProgress, and(eq(readingProgress.postId, posts.id), eq(readingProgress.userEmail, auth.user.email)))
      .where(and(eq(readingHistory.userEmail, auth.user.email), isNull(posts.deletedAt)))
      .orderBy(desc(readingHistory.lastViewedAt)).limit(8);
    const later = await db.select({ id: posts.id, title: posts.title, topicName: topics.name, topicColor: topics.color, savedAt: bookmarks.createdAt })
      .from(bookmarks).innerJoin(posts, eq(bookmarks.postId, posts.id)).innerJoin(topics, eq(posts.topicId, topics.id))
      .where(and(eq(bookmarks.userEmail, auth.user.email), isNull(posts.deletedAt))).orderBy(desc(bookmarks.createdAt)).limit(20);
    const filters = await db.select().from(savedFilters).where(eq(savedFilters.userEmail, auth.user.email)).orderBy(desc(savedFilters.createdAt));
    return Response.json({ recent, later, filters, signedIn: true });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = String(body.name || "").trim().slice(0, 40);
    const query = String(body.query || "").replace(/^\?/, "").slice(0, 500);
    if (!name || !query) return Response.json({ error: "필터 이름과 조건을 확인해 주세요." }, { status: 400 });
    const db = await getDb();
    const [filter] = await db.insert(savedFilters).values({ userEmail: auth.user.email, name, query }).onConflictDoUpdate({
      target: [savedFilters.userEmail, savedFilters.name], set: { query, createdAt: new Date().toISOString() },
    }).returning();
    return Response.json({ filter });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const id = parsePositiveId(new URL(request.url).searchParams.get("id"));
    if (!id) return Response.json({ error: "저장 필터를 확인해 주세요." }, { status: 400 });
    const db = await getDb();
    await db.delete(savedFilters).where(and(eq(savedFilters.id, id), eq(savedFilters.userEmail, auth.user.email)));
    return Response.json({ deleted: true });
  } catch (error) { return apiError(error); }
}

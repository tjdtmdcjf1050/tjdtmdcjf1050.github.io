import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  bookmarks,
  postMetrics,
  posts,
  publicationCandidates,
  topics,
  workSeries,
} from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureScheduledPostsPublished } from "../../growth";
import { apiError } from "../utils";

function csv(value: string | null) {
  return (value || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

export async function GET(request: Request) {
  try {
    await ensureScheduledPostsPublished();
    const url = new URL(request.url);
    const topicValues = csv(url.searchParams.get("topics") || url.searchParams.get("topic"));
    const formatValues = csv(url.searchParams.get("formats") || url.searchParams.get("format"));
    const statusValues = csv(url.searchParams.get("statuses") || url.searchParams.get("workStatus"));
    const challengeOnly = url.searchParams.get("challenge") === "1";
    const savedOnly = url.searchParams.get("saved") === "1";
    const search = url.searchParams.get("search")?.trim().slice(0, 80) ?? "";
    const sort = url.searchParams.get("sort") ?? "recent";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(24, Math.max(6, Number(url.searchParams.get("limit")) || 12));
    const db = await getDb();
    const user = await getChatGPTUser();
    const viewerEmail = user?.email || "__anonymous__";

    const conditions = [eq(posts.status, "published"), eq(posts.visibility, "public"), isNull(posts.deletedAt)];
    if (topicValues.length) conditions.push(inArray(topics.slug, topicValues));
    if (formatValues.length) conditions.push(inArray(posts.format, formatValues));
    if (statusValues.length) conditions.push(inArray(posts.workStatus, statusValues));
    if (challengeOnly) conditions.push(eq(posts.publishChallenge, true));
    if (savedOnly) conditions.push(user ? sql`exists (select 1 from ${bookmarks} saved where saved.post_id=${posts.id} and saved.user_email=${viewerEmail})` : sql`0 = 1`);
    if (search) {
      const term = `%${search}%`;
      const searchCondition = or(like(posts.title, term), like(posts.authorName, term), like(posts.summary, term), like(posts.content, term), like(posts.tags, term));
      if (searchCondition) conditions.push(searchCondition);
    }

    const likeCount = sql<number>`coalesce(${postMetrics.likeCount},0)`;
    const purchaseCount = sql<number>`coalesce(${postMetrics.purchaseCount},0)`;
    const recommendCount = sql<number>`coalesce(${postMetrics.recommendCount},0)`;
    const bookmarkCount = sql<number>`coalesce(${postMetrics.bookmarkCount},0)`;
    const readerCount = sql<number>`coalesce(${postMetrics.readerCount},0)`;
    const completionCount = sql<number>`coalesce(${postMetrics.completionCount},0)`;
    const commentCount = sql<number>`coalesce(${postMetrics.commentCount},0)`;
    const sponsorCount = sql<number>`coalesce(${postMetrics.sponsorCount},0)`;
    const recommendedScore = sql<number>`(${purchaseCount} * 4 + ${completionCount} * 3 + ${recommendCount} * 2 + ${likeCount})`;
    const publishRatio = sql<number>`(cast(${purchaseCount} as real) / max(1, ${posts.purchaseGoal}))`;
    const completedFirst = sql<number>`case when ${posts.workStatus}='completed' then 1 else 0 end`;

    const order = sort === "popular" ? desc(likeCount)
      : sort === "purchase" ? desc(purchaseCount)
      : sort === "recommended" ? desc(recommendedScore)
      : sort === "completion" ? desc(completionCount)
      : sort === "work-completed" ? desc(completedFirst)
      : sort === "near-publish" ? desc(publishRatio)
      : desc(posts.publishedAt);

    const rows = await db.select({
      id: posts.id, title: posts.title, summary: posts.summary, content: posts.content,
      authorName: posts.authorName, authorEmail: posts.ownerEmail,
      topicName: topics.name, topicSlug: topics.slug, topicColor: topics.color,
      format: posts.format, workStatus: posts.workStatus, publishChallenge: posts.publishChallenge,
      purchaseGoal: posts.purchaseGoal, candidateStatus: publicationCandidates.status,
      candidateScore: publicationCandidates.score, challengeEndsAt: publicationCandidates.challengeEndsAt,
      coverImage: posts.coverImage, seriesTitle: workSeries.title,
      publishedAt: posts.publishedAt,
      likeCount, purchaseCount, recommendCount, bookmarkCount, readerCount, completionCount, commentCount, sponsorCount,
      isSaved: sql<number>`exists (select 1 from ${bookmarks} saved where saved.post_id=${posts.id} and saved.user_email=${viewerEmail})`,
    }).from(posts)
      .innerJoin(topics, eq(posts.topicId, topics.id))
      .leftJoin(publicationCandidates, eq(publicationCandidates.postId, posts.id))
      .leftJoin(workSeries, eq(posts.seriesId, workSeries.id))
      .leftJoin(postMetrics, eq(postMetrics.postId, posts.id))
      .where(and(...conditions)).orderBy(order, desc(posts.id)).limit(limit).offset((page - 1) * limit);

    const [totalRow] = await db.select({ count: sql<number>`count(distinct ${posts.id})` }).from(posts)
      .innerJoin(topics, eq(posts.topicId, topics.id)).where(and(...conditions));
    const total = Number(totalRow?.count || 0);

    const topicRows = await db.select({ name: topics.name, slug: topics.slug, color: topics.color, count: sql<number>`count(*)` })
      .from(posts).innerJoin(topics, eq(posts.topicId, topics.id))
      .where(and(eq(posts.status, "published"), eq(posts.visibility, "public"), isNull(posts.deletedAt)))
      .groupBy(topics.id).orderBy(topics.position);

    return Response.json({ posts: rows, categories: topicRows, topics: topicRows, total, page, hasMore: page * limit < total });
  } catch (error) {
    return apiError(error);
  }
}

import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  categories,
  comments,
  postReactions,
  postMetrics,
  posts,
  sponsorships,
  bookmarks,
  postChapters,
  profiles,
  publicationAttempts,
  publicationCandidates,
  readingHistory,
  readingProgress,
  topics,
  workSeries,
} from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  ensureScheduledPostsPublished,
  getPublishingRule,
  recalculateCandidate,
} from "../../../growth";
import { apiError, parsePositiveId } from "../../utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = parsePositiveId(rawId);
  if (!id) return Response.json({ error: "잘못된 글입니다." }, { status: 400 });

  try {
    await ensureScheduledPostsPublished();
    const user = await getChatGPTUser();
    const db = await getDb();
    await recalculateCandidate(id);
    const [post] = await db
      .select({
        id: posts.id,
        title: posts.title,
        summary: posts.summary,
        content: posts.content,
        tags: posts.tags,
        coverImage: posts.coverImage,
        seriesTitle: sql<string>`coalesce(${workSeries.title}, ${posts.seriesTitle})`,
        seriesId: posts.seriesId,
        seriesOrder: posts.seriesOrder,
        fontFamily: posts.fontFamily,
        fontSize: posts.fontSize,
        lineHeight: posts.lineHeight,
        authorEmail: posts.ownerEmail,
        authorName: posts.authorName,
        authorProfileImage: profiles.profileImage,
        categoryName: categories.name,
        categoryColor: categories.color,
        topicName: topics.name,
        topicSlug: topics.slug,
        topicColor: topics.color,
        format: posts.format,
        workStatus: posts.workStatus,
        visibility: posts.visibility,
        publishChallenge: posts.publishChallenge,
        sponsorshipEnabled: posts.sponsorshipEnabled,
        commentsEnabled: posts.commentsEnabled,
        purchaseGoal: posts.purchaseGoal,
        candidateStatus: publicationCandidates.status,
        candidateScore: publicationCandidates.score,
        selectionReason: publicationCandidates.selectionReason,
        decisionReason: publicationCandidates.decisionReason,
        challengeStartsAt: publicationCandidates.challengeStartsAt,
        challengeEndsAt: publicationCandidates.challengeEndsAt,
        targetCount: publicationCandidates.targetCount,
        attemptNumber: publicationCandidates.attemptNumber,
        eligibleAgainAt: publicationCandidates.eligibleAgainAt,
        scoreBreakdown: publicationCandidates.scoreBreakdown,
        anomalousExcluded: publicationCandidates.anomalousExcluded,
        publishedAt: posts.publishedAt,
        likeCount: sql<number>`coalesce(${postMetrics.likeCount},0)`,
        purchaseCount: sql<number>`coalesce(${postMetrics.purchaseCount},0)`,
        recommendCount: sql<number>`coalesce(${postMetrics.recommendCount},0)`,
        completionCount: sql<number>`coalesce(${postMetrics.completionCount},0)`,
        sponsorCount: sql<number>`coalesce(${postMetrics.sponsorCount},0)`,
        sponsorAmount: sql<number>`coalesce(${postMetrics.sponsorAmount},0)`,
      })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .innerJoin(topics, eq(posts.topicId, topics.id))
      .leftJoin(
        publicationCandidates,
        eq(publicationCandidates.postId, posts.id),
      )
      .leftJoin(workSeries, eq(posts.seriesId, workSeries.id))
      .leftJoin(profiles, eq(profiles.email, posts.ownerEmail))
      .leftJoin(postMetrics, eq(postMetrics.postId, posts.id))
      .where(
        and(
          eq(posts.id, id),
          eq(posts.status, "published"),
          or(eq(posts.visibility, "public"), eq(posts.visibility, "preview")),
          isNull(posts.deletedAt),
        ),
      )
      .limit(1);

    if (!post)
      return Response.json(
        { error: "발행된 글을 찾을 수 없습니다." },
        { status: 404 },
      );

    if (user) {
      const now = new Date().toISOString();
      await db
        .insert(readingHistory)
        .values({
          postId: id,
          userEmail: user.email,
          viewCount: 1,
          lastViewedAt: now,
        })
        .onConflictDoUpdate({
          target: [readingHistory.postId, readingHistory.userEmail],
          set: {
            viewCount: sql`${readingHistory.viewCount} + 1`,
            lastViewedAt: now,
          },
        });
    }

    const commentRows = post.commentsEnabled
      ? await db
          .select({
            id: comments.id,
            userDisplayName: comments.userDisplayName,
            content: comments.content,
            createdAt: comments.createdAt,
            isOwner: user
              ? sql<boolean>`${comments.userEmail} = ${user.email}`
              : sql<boolean>`0`,
          })
          .from(comments)
          .where(eq(comments.postId, id))
          .orderBy(asc(comments.createdAt), asc(comments.id))
          .limit(200)
      : [];

    const chapters = await db
      .select({
        id: postChapters.id,
        title: postChapters.title,
        content: postChapters.content,
        position: postChapters.position,
        status: postChapters.status,
        scheduledAt: postChapters.scheduledAt,
      })
      .from(postChapters)
      .where(eq(postChapters.postId, id))
      .orderBy(asc(postChapters.position));
    const attempts = await db
      .select({
        attemptNumber: publicationAttempts.attemptNumber,
        startsAt: publicationAttempts.startsAt,
        endsAt: publicationAttempts.endsAt,
        targetCount: publicationAttempts.targetCount,
        score: publicationAttempts.score,
        status: publicationAttempts.status,
        resultReason: publicationAttempts.resultReason,
      })
      .from(publicationAttempts)
      .where(eq(publicationAttempts.postId, id))
      .orderBy(asc(publicationAttempts.attemptNumber));
    const seriesWorks = post.seriesId
      ? await db
          .select({
            id: posts.id,
            title: posts.title,
            seriesOrder: posts.seriesOrder,
          })
          .from(posts)
          .where(
            and(
              eq(posts.seriesId, post.seriesId),
              eq(posts.status, "published"),
              isNull(posts.deletedAt),
            ),
          )
          .orderBy(asc(posts.seriesOrder))
      : [];
    const publishingRule = await getPublishingRule();

    let viewer = {
      like: false,
      purchase: false,
      recommend: false,
      bookmark: false,
      sponsoredAmount: 0,
      chapterIndex: 0,
      progressPercent: 0,
      completed: false,
    };
    if (user) {
      const reactionRows = await db
        .select({ type: postReactions.type })
        .from(postReactions)
        .where(
          and(
            eq(postReactions.postId, id),
            eq(postReactions.userEmail, user.email),
          ),
        );
      const [sponsorship] = await db
        .select({ amount: sponsorships.amount })
        .from(sponsorships)
        .where(
          and(
            eq(sponsorships.postId, id),
            eq(sponsorships.userEmail, user.email),
          ),
        )
        .limit(1);
      const [bookmark] = await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(
          and(eq(bookmarks.postId, id), eq(bookmarks.userEmail, user.email)),
        )
        .limit(1);
      const [progress] = await db
        .select({
          chapterIndex: readingProgress.chapterIndex,
          progressPercent: readingProgress.progressPercent,
          completed: readingProgress.completed,
        })
        .from(readingProgress)
        .where(
          and(
            eq(readingProgress.postId, id),
            eq(readingProgress.userEmail, user.email),
          ),
        )
        .limit(1);
      viewer = {
        like: reactionRows.some((row) => row.type === "like"),
        purchase: reactionRows.some((row) => row.type === "purchase"),
        recommend: reactionRows.some((row) => row.type === "recommend"),
        bookmark: Boolean(bookmark),
        sponsoredAmount: sponsorship?.amount ?? 0,
        chapterIndex: progress?.chapterIndex ?? 0,
        progressPercent: progress?.progressPercent ?? 0,
        completed: Boolean(progress?.completed),
      };
    }

    let scoreBreakdown: Record<string, number> = {};
    try {
      scoreBreakdown = JSON.parse(post.scoreBreakdown || "{}");
    } catch {
      scoreBreakdown = {};
    }
    return Response.json({
      post: { ...post, scoreBreakdown, chapters, attempts, seriesWorks },
      comments: commentRows,
      viewer,
      publishingRule,
      serverNow: new Date().toISOString(),
      signedIn: Boolean(user),
    });
  } catch (error) {
    return apiError(error);
  }
}

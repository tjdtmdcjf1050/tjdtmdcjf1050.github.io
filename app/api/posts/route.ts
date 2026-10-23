import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  categories,
  challengeEntries,
  challenges,
  postChapters,
  postDrafts,
  posts,
  topics,
  workSeries,
} from "../../../db/schema";
import { ensureScheduledPostsPublished, startPublishingChallenge } from "../../growth";
import { parseManuscriptChapters } from "../../manuscript";
import { parsePostInput } from "../../post-input";
import { parsePostSnapshot } from "../../post-snapshot";
import { apiError, parsePositiveId, requireApiUser } from "../utils";

async function validateRelations(
  ownerEmail: string,
  categoryId: number,
  topicId: number | null,
  seriesId: number | null,
) {
  const db = await getDb();
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.ownerEmail, ownerEmail)))
    .limit(1);
  if (!category) return { error: "카테고리를 찾을 수 없습니다." } as const;
  const [topic] = await db
    .select({ id: topics.id, slug: topics.slug })
    .from(topics)
    .where(eq(topics.id, topicId || 0))
    .limit(1);
  if (!topic) return { error: "주제 카테고리를 찾을 수 없습니다." } as const;
  if (seriesId) {
    const [series] = await db
      .select({ id: workSeries.id })
      .from(workSeries)
      .where(and(eq(workSeries.id, seriesId), eq(workSeries.ownerEmail, ownerEmail)))
      .limit(1);
    if (!series) return { error: "시리즈를 찾을 수 없습니다." } as const;
  }
  return { error: null, topic } as const;
}

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    await ensureScheduledPostsPublished();
    const db = await getDb();
    const id = parsePositiveId(new URL(request.url).searchParams.get("id"));

    if (id) {
      const [post] = await db
        .select({
          id: posts.id,
          ownerEmail: posts.ownerEmail,
          title: posts.title,
          summary: posts.summary,
          content: posts.content,
          tags: posts.tags,
          coverImage: posts.coverImage,
          seriesTitle: posts.seriesTitle,
          seriesId: posts.seriesId,
          seriesOrder: posts.seriesOrder,
          scheduledAt: posts.scheduledAt,
          fontFamily: posts.fontFamily,
          fontSize: posts.fontSize,
          lineHeight: posts.lineHeight,
          topicId: posts.topicId,
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
          status: posts.status,
          categoryId: posts.categoryId,
          categoryName: categories.name,
          categoryColor: categories.color,
          publishedAt: posts.publishedAt,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          version: posts.version,
        })
        .from(posts)
        .innerJoin(categories, eq(posts.categoryId, categories.id))
        .leftJoin(topics, eq(posts.topicId, topics.id))
        .where(
          and(
            eq(posts.id, id),
            eq(posts.ownerEmail, auth.user.email),
            isNull(posts.deletedAt),
          ),
        )
        .limit(1);

      if (!post)
        return Response.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

      const [chapters, draft] = await Promise.all([
        db
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
          .orderBy(asc(postChapters.position)),
        db
          .select()
          .from(postDrafts)
          .where(
            and(eq(postDrafts.postId, id), eq(postDrafts.ownerEmail, auth.user.email)),
          )
          .limit(1)
          .then((rows) => rows[0] || null),
      ]);

      const validDraft = draft && draft.baseVersion === post.version ? draft : null;
      const editable = validDraft ? parsePostSnapshot(validDraft.snapshot, post) : post;
      return Response.json({
        post: {
          ...post,
          ...editable,
          status: post.status,
          chapters,
          hasPendingDraft: Boolean(validDraft),
          draftState: validDraft?.state || null,
          draftVersion: validDraft?.draftVersion || 0,
          draftUpdatedAt: validDraft?.updatedAt || null,
        },
      });
    }

    const rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        summary: posts.summary,
        content: posts.content,
        topicId: posts.topicId,
        topicName: topics.name,
        topicSlug: topics.slug,
        topicColor: topics.color,
        format: posts.format,
        workStatus: posts.workStatus,
        visibility: posts.visibility,
        publishChallenge: posts.publishChallenge,
        purchaseGoal: posts.purchaseGoal,
        status: posts.status,
        categoryId: posts.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        publishedAt: posts.publishedAt,
        scheduledAt: posts.scheduledAt,
        seriesId: posts.seriesId,
        seriesOrder: posts.seriesOrder,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        version: posts.version,
      })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(topics, eq(posts.topicId, topics.id))
      .where(and(eq(posts.ownerEmail, auth.user.email), isNull(posts.deletedAt)))
      .orderBy(desc(posts.updatedAt), desc(posts.id))
      .limit(100);

    return Response.json({ posts: rows });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const parsed = parsePostInput(payload);
    if (parsed.error)
      return Response.json({ error: parsed.error }, { status: 400 });
    const snapshot = parsed.snapshot;
    const relations = await validateRelations(
      auth.user.email,
      snapshot.categoryId,
      snapshot.topicId,
      snapshot.seriesId,
    );
    if (relations.error)
      return Response.json({ error: relations.error }, { status: 404 });

    const db = await getDb();
    const now = new Date().toISOString();
    const [post] = await db
      .insert(posts)
      .values({
        ownerEmail: auth.user.email,
        authorName: auth.user.displayName,
        ...snapshot,
        scheduledAt: snapshot.status === "scheduled" ? snapshot.scheduledAt : null,
        publishedAt: snapshot.status === "published" ? now : null,
        updatedAt: now,
      })
      .returning();

    const chapters = parseManuscriptChapters(snapshot.content);
    try {
      await db.insert(postChapters).values(
        chapters.map((chapter, position) => ({
          postId: post.id,
          title: chapter.title,
          content: chapter.content,
          position,
          status: snapshot.status,
          scheduledAt: snapshot.status === "scheduled" ? snapshot.scheduledAt : null,
          updatedAt: now,
        })),
      );
    } catch (error) {
      await db.delete(posts).where(eq(posts.id, post.id));
      throw error;
    }

    if (snapshot.publishChallenge) {
      await startPublishingChallenge(post.id, snapshot.purchaseGoal);
      if (relations.topic.slug === "love") {
        const [challenge] = await db
          .select({ id: challenges.id })
          .from(challenges)
          .where(and(eq(challenges.topicSlug, "love"), eq(challenges.status, "open")))
          .limit(1);
        if (challenge)
          await db
            .insert(challengeEntries)
            .values({
              challengeId: challenge.id,
              postId: post.id,
              applicantEmail: auth.user.email,
            })
            .onConflictDoNothing();
      }
    }

    return Response.json(
      { post: { ...post, chapters, draftVersion: 0, hasPendingDraft: false } },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}

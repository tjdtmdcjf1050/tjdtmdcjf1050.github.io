import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  categories,
  challengeEntries,
  challenges,
  postDrafts,
  posts,
  publicationAttempts,
  publicationCandidates,
  topics,
  workSeries,
} from "../../../../db/schema";
import { startPublishingChallenge } from "../../../growth";
import { parsePostInput } from "../../../post-input";
import {
  postSnapshot,
  serializePostSnapshot,
  type PostSnapshot,
} from "../../../post-snapshot";
import { commitPostSnapshot } from "../../../post-write";
import { apiError, parsePositiveId, requireApiUser } from "../../utils";

type SaveIntent = "autosave" | "save" | "publish" | "schedule";

function getIntent(payload: Record<string, unknown>, status: string): SaveIntent {
  if (["autosave", "save", "publish", "schedule"].includes(String(payload.intent)))
    return payload.intent as SaveIntent;
  if (status === "published") return "publish";
  if (status === "scheduled") return "schedule";
  return "save";
}

async function validateRelations(
  ownerEmail: string,
  snapshot: PostSnapshot,
) {
  const db = await getDb();
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, snapshot.categoryId),
        eq(categories.ownerEmail, ownerEmail),
      ),
    )
    .limit(1);
  if (!category) return { error: "카테고리를 찾을 수 없습니다." } as const;
  const [topic] = await db
    .select({ id: topics.id, slug: topics.slug })
    .from(topics)
    .where(eq(topics.id, snapshot.topicId || 0))
    .limit(1);
  if (!topic) return { error: "주제 카테고리를 찾을 수 없습니다." } as const;
  if (snapshot.seriesId) {
    const [series] = await db
      .select({ id: workSeries.id })
      .from(workSeries)
      .where(
        and(
          eq(workSeries.id, snapshot.seriesId),
          eq(workSeries.ownerEmail, ownerEmail),
        ),
      )
      .limit(1);
    if (!series) return { error: "시리즈를 찾을 수 없습니다." } as const;
  }
  return { error: null, topic } as const;
}

async function savePublishedDraft(options: {
  postId: number;
  ownerEmail: string;
  snapshot: PostSnapshot;
  baseVersion: number;
  baseDraftVersion: number;
  state: "draft" | "scheduled";
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const [existingDraft] = await db
    .select()
    .from(postDrafts)
    .where(
      and(
        eq(postDrafts.postId, options.postId),
        eq(postDrafts.ownerEmail, options.ownerEmail),
      ),
    )
    .limit(1);

  if (existingDraft) {
    if (
      existingDraft.baseVersion !== options.baseVersion ||
      existingDraft.draftVersion !== options.baseDraftVersion
    )
      return null;
    const [updated] = await db
      .update(postDrafts)
      .set({
        snapshot: serializePostSnapshot(options.snapshot),
        draftVersion: existingDraft.draftVersion + 1,
        state: options.state,
        scheduledAt:
          options.state === "scheduled" ? options.snapshot.scheduledAt : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(postDrafts.postId, options.postId),
          eq(postDrafts.ownerEmail, options.ownerEmail),
          eq(postDrafts.baseVersion, options.baseVersion),
          eq(postDrafts.draftVersion, options.baseDraftVersion),
        ),
      )
      .returning();
    return updated || null;
  }

  if (options.baseDraftVersion !== 0) return null;
  const inserted = await db
    .insert(postDrafts)
    .values({
      postId: options.postId,
      ownerEmail: options.ownerEmail,
      snapshot: serializePostSnapshot(options.snapshot),
      baseVersion: options.baseVersion,
      draftVersion: 1,
      state: options.state,
      scheduledAt:
        options.state === "scheduled" ? options.snapshot.scheduledAt : null,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();
  return inserted[0] || null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const id = parsePositiveId((await context.params).id);
  if (!id)
    return Response.json({ error: "잘못된 글입니다." }, { status: 400 });

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const parsed = parsePostInput(payload);
    if (parsed.error)
      return Response.json({ error: parsed.error }, { status: 400 });
    const intent = getIntent(payload, parsed.snapshot.status);
    const snapshot = {
      ...parsed.snapshot,
      status:
        intent === "publish"
          ? ("published" as const)
          : intent === "schedule"
            ? ("scheduled" as const)
            : parsed.snapshot.status,
    };
    const db = await getDb();
    const [existing] = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.id, id),
          eq(posts.ownerEmail, auth.user.email),
          isNull(posts.deletedAt),
        ),
      )
      .limit(1);
    if (!existing)
      return Response.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

    const baseVersion = Number(payload.baseVersion ?? existing.version);
    const baseDraftVersion = Number(payload.baseDraftVersion ?? 0);
    if (!Number.isInteger(baseVersion) || baseVersion !== existing.version) {
      return Response.json(
        {
          error:
            "다른 화면에서 작품이 먼저 변경되었습니다. 새로고침 후 최신 내용을 확인해 주세요.",
          code: "VERSION_CONFLICT",
        },
        { status: 409 },
      );
    }
    const relations = await validateRelations(auth.user.email, snapshot);
    if (relations.error)
      return Response.json({ error: relations.error }, { status: 404 });

    if (
      existing.status === "published" &&
      (intent === "autosave" || intent === "save" || intent === "schedule")
    ) {
      const draft = await savePublishedDraft({
        postId: id,
        ownerEmail: auth.user.email,
        snapshot,
        baseVersion,
        baseDraftVersion,
        state: intent === "schedule" ? "scheduled" : "draft",
      });
      if (!draft)
        return Response.json(
          {
            error:
              "다른 창에 더 최근의 편집 초안이 있습니다. 새로고침해 최신 초안을 확인해 주세요.",
            code: "DRAFT_CONFLICT",
          },
          { status: 409 },
        );
      return Response.json({
        post: {
          ...existing,
          ...snapshot,
          status: existing.status,
          version: existing.version,
          draftVersion: draft.draftVersion,
          hasPendingDraft: true,
          draftState: draft.state,
        },
      });
    }

    const [draft] = await db
      .select({ draftVersion: postDrafts.draftVersion })
      .from(postDrafts)
      .where(
        and(eq(postDrafts.postId, id), eq(postDrafts.ownerEmail, auth.user.email)),
      )
      .limit(1);
    if (draft && draft.draftVersion !== baseDraftVersion) {
      return Response.json(
        {
          error:
            "다른 창에 더 최근의 편집 초안이 있습니다. 새로고침해 최신 초안을 확인해 주세요.",
          code: "DRAFT_CONFLICT",
        },
        { status: 409 },
      );
    }

    const result = await commitPostSnapshot({
      current: {
        ...postSnapshot(existing),
        id: existing.id,
        ownerEmail: existing.ownerEmail,
        version: existing.version,
        publishedAt: existing.publishedAt,
      },
      next: snapshot,
      baseVersion,
      reason:
        intent === "publish"
          ? "publish"
          : intent === "schedule"
            ? "schedule"
            : "manual",
      recordRevision: intent !== "autosave",
    });
    if (!result.committed)
      return Response.json(
        {
          error:
            "다른 화면에서 작품이 먼저 변경되었습니다. 새로고침 후 다시 저장해 주세요.",
          code: "VERSION_CONFLICT",
        },
        { status: 409 },
      );

    const now = new Date().toISOString();
    if (snapshot.publishChallenge) {
      await startPublishingChallenge(id, snapshot.purchaseGoal);
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
              postId: id,
              applicantEmail: auth.user.email,
            })
            .onConflictDoNothing();
      }
    } else {
      await db.delete(challengeEntries).where(eq(challengeEntries.postId, id));
      const [candidate] = await db
        .update(publicationCandidates)
        .set({
          status: "on_hold",
          decisionReason: "작가가 출판 도전을 종료했습니다.",
          updatedAt: now,
        })
        .where(eq(publicationCandidates.postId, id))
        .returning({
          id: publicationCandidates.id,
          attemptNumber: publicationCandidates.attemptNumber,
        });
      if (candidate)
        await db
          .update(publicationAttempts)
          .set({
            status: "on_hold",
            resultReason: "작가가 출판 도전을 종료했습니다.",
            closedAt: now,
          })
          .where(
            and(
              eq(publicationAttempts.candidateId, candidate.id),
              eq(publicationAttempts.attemptNumber, candidate.attemptNumber),
            ),
          );
    }

    return Response.json({
      post: {
        ...existing,
        ...snapshot,
        version: result.version,
        draftVersion: 0,
        hasPendingDraft: false,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const id = parsePositiveId((await context.params).id);
  if (!id)
    return Response.json({ error: "잘못된 글입니다." }, { status: 400 });

  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const deleted = await db
      .update(posts)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(posts.id, id), eq(posts.ownerEmail, auth.user.email)))
      .returning({ id: posts.id });
    if (deleted.length === 0)
      return Response.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}

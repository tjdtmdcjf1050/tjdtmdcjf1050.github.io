import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { postDrafts, postRevisions, posts } from "../../../../../db/schema";
import {
  parsePostSnapshot,
  postSnapshot,
  serializePostSnapshot,
} from "../../../../post-snapshot";
import { commitPostSnapshot } from "../../../../post-write";
import { apiError, parsePositiveId, requireApiUser } from "../../../utils";

export async function GET(
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
    const revisions = await db
      .select({
        id: postRevisions.id,
        title: postRevisions.title,
        reason: postRevisions.reason,
        status: postRevisions.status,
        createdAt: postRevisions.createdAt,
        content: postRevisions.content,
      })
      .from(postRevisions)
      .where(
        and(
          eq(postRevisions.postId, id),
          eq(postRevisions.ownerEmail, auth.user.email),
        ),
      )
      .orderBy(desc(postRevisions.id))
      .limit(50);
    return Response.json({
      revisions: revisions.map((revision) => ({
        ...revision,
        characters: revision.content.length,
        content: undefined,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const id = parsePositiveId((await context.params).id);
  if (!id)
    return Response.json({ error: "잘못된 글입니다." }, { status: 400 });

  try {
    const body = (await request.json()) as {
      revisionId?: number;
      baseVersion?: number;
      baseDraftVersion?: number;
    };
    const revisionId = parsePositiveId(String(body.revisionId || ""));
    if (!revisionId)
      return Response.json(
        { error: "복원할 버전을 선택해 주세요." },
        { status: 400 },
      );

    const db = await getDb();
    const [[current], [revision], [workingDraft]] = await Promise.all([
      db
        .select()
        .from(posts)
        .where(and(eq(posts.id, id), eq(posts.ownerEmail, auth.user.email)))
        .limit(1),
      db
        .select()
        .from(postRevisions)
        .where(
          and(
            eq(postRevisions.id, revisionId),
            eq(postRevisions.postId, id),
            eq(postRevisions.ownerEmail, auth.user.email),
          ),
        )
        .limit(1),
      db
        .select()
        .from(postDrafts)
        .where(
          and(eq(postDrafts.postId, id), eq(postDrafts.ownerEmail, auth.user.email)),
        )
        .limit(1),
    ]);
    if (!current || !revision)
      return Response.json({ error: "버전을 찾을 수 없습니다." }, { status: 404 });

    const baseVersion = Number(body.baseVersion ?? current.version);
    const baseDraftVersion = Number(body.baseDraftVersion ?? workingDraft?.draftVersion ?? 0);
    if (
      baseVersion !== current.version ||
      (workingDraft && baseDraftVersion !== workingDraft.draftVersion)
    ) {
      return Response.json(
        {
          error:
            "더 최근의 변경사항이 있어 복원을 중단했습니다. 새로고침 후 다시 선택해 주세요.",
          code: "VERSION_CONFLICT",
        },
        { status: 409 },
      );
    }

    const restored = parsePostSnapshot(revision.snapshot, {
      ...postSnapshot(current),
      title: revision.title,
      summary: revision.summary,
      content: revision.content,
      tags: revision.tags,
      coverImage: revision.coverImage,
      seriesTitle: revision.seriesTitle,
      fontFamily: revision.fontFamily,
      fontSize: revision.fontSize,
      lineHeight: revision.lineHeight,
      categoryId: revision.categoryId,
      status: revision.status as "draft" | "scheduled" | "published",
    });

    if (current.status === "published") {
      const now = new Date().toISOString();
      const beforeRestore = workingDraft
        ? parsePostSnapshot(workingDraft.snapshot, current)
        : postSnapshot(current);
      await db.insert(postRevisions).values({
        postId: current.id,
        ownerEmail: auth.user.email,
        title: beforeRestore.title,
        summary: beforeRestore.summary,
        content: beforeRestore.content,
        tags: beforeRestore.tags,
        coverImage: beforeRestore.coverImage,
        seriesTitle: beforeRestore.seriesTitle,
        fontFamily: beforeRestore.fontFamily,
        fontSize: beforeRestore.fontSize,
        lineHeight: beforeRestore.lineHeight,
        categoryId: beforeRestore.categoryId,
        status: current.status,
        reason: "before_restore",
        snapshot: serializePostSnapshot(beforeRestore),
        createdAt: now,
      });

      const nextDraftVersion = (workingDraft?.draftVersion || 0) + 1;
      await db
        .insert(postDrafts)
        .values({
          postId: current.id,
          ownerEmail: auth.user.email,
          snapshot: serializePostSnapshot({ ...restored, status: "published" }),
          baseVersion: current.version,
          draftVersion: nextDraftVersion,
          state: "draft",
          scheduledAt: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: postDrafts.postId,
          set: {
            snapshot: serializePostSnapshot({ ...restored, status: "published" }),
            baseVersion: current.version,
            draftVersion: nextDraftVersion,
            state: "draft",
            scheduledAt: null,
            updatedAt: now,
          },
        });
      return Response.json({
        post: {
          ...current,
          ...restored,
          status: current.status,
          version: current.version,
          draftVersion: nextDraftVersion,
          hasPendingDraft: true,
        },
      });
    }

    const next = { ...restored, status: "draft" as const, scheduledAt: null };
    const result = await commitPostSnapshot({
      current: {
        ...postSnapshot(current),
        id: current.id,
        ownerEmail: current.ownerEmail,
        version: current.version,
        publishedAt: current.publishedAt,
      },
      next,
      baseVersion,
      reason: "before_restore",
    });
    if (!result.committed)
      return Response.json(
        { error: "다른 변경사항과 충돌해 복원을 중단했습니다." },
        { status: 409 },
      );
    return Response.json({
      post: {
        ...current,
        ...next,
        version: result.version,
        draftVersion: 0,
        hasPendingDraft: false,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

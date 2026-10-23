import { getD1 } from "../db";
import { parseManuscriptChapters } from "./manuscript";
import {
  type PostSnapshot,
  serializePostSnapshot,
} from "./post-snapshot";

type CurrentPost = PostSnapshot & {
  id: number;
  ownerEmail: string;
  version: number;
  publishedAt: string | null;
};

type CommitOptions = {
  current: CurrentPost;
  next: PostSnapshot;
  baseVersion: number;
  reason: "manual" | "publish" | "schedule" | "before_restore";
  clearDraft?: boolean;
  recordRevision?: boolean;
};

export async function commitPostSnapshot({
  current,
  next,
  baseVersion,
  reason,
  clearDraft = true,
  recordRevision = true,
}: CommitOptions) {
  const d1 = await getD1();
  const now = new Date().toISOString();
  const token = crypto.randomUUID();
  const oldSnapshot = serializePostSnapshot(current);
  const chapters = parseManuscriptChapters(next.content);
  const publishedAt =
    next.status === "published" ? current.publishedAt ?? now : null;
  const scheduledAt = next.status === "scheduled" ? next.scheduledAt : null;

  const statements = [
    d1
      .prepare(
        `INSERT INTO post_revisions
          (post_id, owner_email, title, summary, content, tags, cover_image,
           series_title, font_family, font_size, line_height, category_id,
           status, reason, snapshot, created_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         FROM posts
         WHERE id = ? AND owner_email = ? AND version = ? AND ? = 1`,
      )
      .bind(
        current.id,
        current.ownerEmail,
        current.title,
        current.summary,
        current.content,
        current.tags,
        current.coverImage,
        current.seriesTitle,
        current.fontFamily,
        current.fontSize,
        current.lineHeight,
        current.categoryId,
        current.status,
        reason,
        oldSnapshot,
        now,
        current.id,
        current.ownerEmail,
        baseVersion,
        recordRevision ? 1 : 0,
      ),
    d1
      .prepare(
        `UPDATE posts SET
          category_id = ?, topic_id = ?, format = ?, work_status = ?,
          visibility = ?, publish_challenge = ?, sponsorship_enabled = ?,
          comments_enabled = ?, purchase_goal = ?, title = ?, summary = ?,
          content = ?, tags = ?, series_title = ?, series_id = ?,
          series_order = ?, scheduled_at = ?, cover_image = ?, font_family = ?,
          font_size = ?, line_height = ?, status = ?, published_at = ?,
          updated_at = ?, version = version + 1, write_token = ?
         WHERE id = ? AND owner_email = ? AND version = ? AND deleted_at IS NULL`,
      )
      .bind(
        next.categoryId,
        next.topicId,
        next.format,
        next.workStatus,
        next.visibility,
        next.publishChallenge ? 1 : 0,
        next.sponsorshipEnabled ? 1 : 0,
        next.commentsEnabled ? 1 : 0,
        next.purchaseGoal,
        next.title,
        next.summary,
        next.content,
        next.tags,
        next.seriesTitle,
        next.seriesId,
        next.seriesOrder,
        scheduledAt,
        next.coverImage,
        next.fontFamily,
        next.fontSize,
        next.lineHeight,
        next.status,
        publishedAt,
        now,
        token,
        current.id,
        current.ownerEmail,
        baseVersion,
      ),
    d1
      .prepare(
        `DELETE FROM post_chapters
         WHERE post_id = ?
           AND EXISTS (SELECT 1 FROM posts WHERE id = ? AND write_token = ?)`,
      )
      .bind(current.id, current.id, token),
  ];

  for (const [position, chapter] of chapters.entries()) {
    statements.push(
      d1
        .prepare(
          `INSERT INTO post_chapters
            (post_id, title, content, position, status, scheduled_at, created_at, updated_at)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM posts WHERE id = ? AND write_token = ?)`,
        )
        .bind(
          current.id,
          chapter.title,
          chapter.content,
          position,
          next.status,
          scheduledAt,
          now,
          now,
          current.id,
          token,
        ),
    );
  }

  if (clearDraft) {
    statements.push(
      d1
        .prepare(
          `DELETE FROM post_drafts
           WHERE post_id = ?
             AND EXISTS (SELECT 1 FROM posts WHERE id = ? AND write_token = ?)`,
        )
        .bind(current.id, current.id, token),
    );
  }

  const results = await d1.batch(statements);
  const updateResult = results[1];
  return {
    committed: Number(updateResult?.meta?.changes || 0) === 1,
    version: baseVersion + 1,
  };
}

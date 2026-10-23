import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { getD1, getDb } from "../db";
import {
  bookmarks,
  comments,
  postReactions,
  postDrafts,
  posts,
  publicationAttempts,
  publicationCandidates,
  publishingRules,
  readingHistory,
  readingProgress,
  reactionFlags,
} from "../db/schema";
import { parsePostSnapshot, postSnapshot } from "./post-snapshot";
import { commitPostSnapshot } from "./post-write";

export type PublishingRule = {
  purchaseWeight: number;
  completionWeight: number;
  recommendWeight: number;
  engagementWeight: number;
  challengeDays: number;
  defaultTarget: number;
  abnormalHourlyLimit: number;
};

export const DEFAULT_PUBLISHING_RULE: PublishingRule = {
  purchaseWeight: 45,
  completionWeight: 30,
  recommendWeight: 15,
  engagementWeight: 10,
  challengeDays: 30,
  defaultTarget: 300,
  abnormalHourlyLimit: 20,
};

export async function ensureScheduledPostsPublished() {
  const db = await getDb();
  const now = new Date().toISOString();
  const duePosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.status, "scheduled"), lte(posts.scheduledAt, now), isNull(posts.deletedAt)))
    .limit(100);
  if (duePosts.length) {
    const d1 = await getD1();
    await d1.batch(
      duePosts.flatMap((post) => [
        d1.prepare(
          "UPDATE posts SET status='published',published_at=?,updated_at=? WHERE id=? AND status='scheduled' AND scheduled_at<=? AND deleted_at IS NULL",
        ).bind(now, now, post.id, now),
        d1.prepare(
          "UPDATE post_chapters SET status='published',scheduled_at=NULL,updated_at=? WHERE post_id=? AND EXISTS (SELECT 1 FROM posts WHERE id=? AND status='published')",
        ).bind(now, post.id, post.id),
      ]),
    );
  }

  const dueDrafts = await db
    .select({ draft: postDrafts, post: posts })
    .from(postDrafts)
    .innerJoin(posts, eq(postDrafts.postId, posts.id))
    .where(
      and(
        eq(postDrafts.state, "scheduled"),
        lte(postDrafts.scheduledAt, now),
        eq(posts.status, "published"),
        isNull(posts.deletedAt),
      ),
    );
  for (const row of dueDrafts) {
    if (row.draft.baseVersion !== row.post.version) continue;
    const snapshot = {
      ...parsePostSnapshot(row.draft.snapshot, row.post),
      status: "published" as const,
      scheduledAt: null,
    };
    const result = await commitPostSnapshot({
      current: {
        ...postSnapshot(row.post),
        id: row.post.id,
        ownerEmail: row.post.ownerEmail,
        version: row.post.version,
        publishedAt: row.post.publishedAt,
      },
      next: snapshot,
      baseVersion: row.draft.baseVersion,
      reason: "schedule",
    });
    if (result.committed && snapshot.publishChallenge)
      await startPublishingChallenge(row.post.id, snapshot.purchaseGoal);
  }
}

export async function getPublishingRule(): Promise<PublishingRule> {
  const db = await getDb();
  const [rule] = await db.select().from(publishingRules).where(eq(publishingRules.id, 1)).limit(1);
  if (!rule) {
    await db.insert(publishingRules).values({ id: 1 }).onConflictDoNothing();
    return DEFAULT_PUBLISHING_RULE;
  }
  return {
    purchaseWeight: rule.purchaseWeight,
    completionWeight: rule.completionWeight,
    recommendWeight: rule.recommendWeight,
    engagementWeight: rule.engagementWeight,
    challengeDays: rule.challengeDays,
    defaultTarget: rule.defaultTarget,
    abnormalHourlyLimit: rule.abnormalHourlyLimit,
  };
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

export async function startPublishingChallenge(postId: number, requestedTarget?: number, forceNewAttempt = false) {
  const db = await getDb();
  const rules = await getPublishingRule();
  const now = new Date();
  const target = Math.min(100000, Math.max(10, Number(requestedTarget) || rules.defaultTarget));
  const [existing] = await db.select().from(publicationCandidates).where(eq(publicationCandidates.postId, postId)).limit(1);

  if (existing && !forceNewAttempt) return existing;

  if (!existing) {
    const [candidate] = await db.insert(publicationCandidates).values({
      postId,
      status: "challenging",
      challengeStartsAt: now.toISOString(),
      challengeEndsAt: addDays(now, rules.challengeDays),
      targetCount: target,
      attemptNumber: 1,
    }).returning();
    await db.insert(publicationAttempts).values({
      candidateId: candidate.id,
      postId,
      attemptNumber: 1,
      startsAt: candidate.challengeStartsAt || now.toISOString(),
      endsAt: candidate.challengeEndsAt || addDays(now, rules.challengeDays),
      targetCount: target,
    });
    return candidate;
  }

  const attemptNumber = existing.attemptNumber + 1;
  const startsAt = now.toISOString();
  const endsAt = addDays(now, rules.challengeDays);
  const [candidate] = await db.update(publicationCandidates).set({
    status: "challenging",
    score: 0,
    editorNote: "",
    decisionReason: "",
    selectionReason: "",
    challengeStartsAt: startsAt,
    challengeEndsAt: endsAt,
    targetCount: target,
    attemptNumber,
    eligibleAgainAt: null,
    scoreBreakdown: "{}",
    anomalousExcluded: 0,
    updatedAt: startsAt,
  }).where(eq(publicationCandidates.id, existing.id)).returning();
  await db.insert(publicationAttempts).values({
    candidateId: existing.id,
    postId,
    attemptNumber,
    startsAt,
    endsAt,
    targetCount: target,
  });
  return candidate;
}

export async function recalculateCandidate(postId: number) {
  const db = await getDb();
  const rules = await getPublishingRule();
  const [candidate] = await db.select().from(publicationCandidates).where(eq(publicationCandidates.postId, postId)).limit(1);
  if (!candidate) return null;

  const safeReaction = (type: string) => sql<number>`(
    select count(*) from ${postReactions} reaction
    where reaction.post_id = ${postId} and reaction.type = ${type}
      and not exists (
        select 1 from ${reactionFlags} flag
        where flag.user_email = reaction.user_email and flag.status = 'active'
          and (flag.post_id is null or flag.post_id = ${postId})
      )
  )`;
  const [metrics] = await db.select({
    purchase: safeReaction("purchase"),
    recommend: safeReaction("recommend"),
    readers: sql<number>`(select count(*) from ${readingHistory} where ${readingHistory.postId}=${postId})`,
    completions: sql<number>`(select count(*) from ${readingProgress} where ${readingProgress.postId}=${postId} and ${readingProgress.completed}=1)`,
    comments: sql<number>`(select count(*) from ${comments} where ${comments.postId}=${postId})`,
    bookmarks: sql<number>`(select count(*) from ${bookmarks} where ${bookmarks.postId}=${postId})`,
    excluded: sql<number>`(select count(*) from ${reactionFlags} where (${reactionFlags.postId}=${postId} or ${reactionFlags.postId} is null) and ${reactionFlags.status}='active')`,
  }).from(posts).where(eq(posts.id, postId)).limit(1);

  const purchase = Number(metrics?.purchase || 0);
  const recommend = Number(metrics?.recommend || 0);
  const readers = Number(metrics?.readers || 0);
  const completions = Number(metrics?.completions || 0);
  const commentsCount = Number(metrics?.comments || 0);
  const bookmarksCount = Number(metrics?.bookmarks || 0);
  const target = Math.max(1, candidate.targetCount || rules.defaultTarget);
  const purchaseRate = Math.min(100, purchase / target * 100);
  const completionRate = Math.min(100, completions / Math.max(1, readers) * 100);
  const recommendRate = Math.min(100, recommend / Math.max(1, readers) * 100);
  const engagementRate = Math.min(100, (commentsCount + bookmarksCount) / Math.max(1, readers) * 50);
  const score = Math.round(
    purchaseRate * rules.purchaseWeight / 100 +
    completionRate * rules.completionWeight / 100 +
    recommendRate * rules.recommendWeight / 100 +
    engagementRate * rules.engagementWeight / 100,
  );
  const breakdown = JSON.stringify({ purchase, recommend, readers, completions, comments: commentsCount, bookmarks: bookmarksCount, purchaseRate: Math.round(purchaseRate), completionRate: Math.round(completionRate), recommendRate: Math.round(recommendRate), engagementRate: Math.round(engagementRate) });
  const status = candidate.status === "challenging" && purchase >= target ? "qualified" : candidate.status;
  const now = new Date().toISOString();
  await db.update(publicationCandidates).set({ score, scoreBreakdown: breakdown, anomalousExcluded: Number(metrics?.excluded || 0), status, updatedAt: now }).where(eq(publicationCandidates.id, candidate.id));
  await db.update(publicationAttempts).set({ score, status }).where(and(eq(publicationAttempts.candidateId, candidate.id), eq(publicationAttempts.attemptNumber, candidate.attemptNumber)));
  return { score, status, breakdown: JSON.parse(breakdown), excluded: Number(metrics?.excluded || 0), rules };
}

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  follows,
  postReactions,
  posts,
  profiles,
  publicationCandidates,
  topics,
  users,
} from "../../../../db/schema";
import { apiError } from "../../utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> },
) {
  try {
    const username = decodeURIComponent((await context.params).username)
      .trim()
      .toLowerCase();
    const db = await getDb();
    let email = "guest@growbook.test",
      displayName = "테스트 작가";
    if (username !== "guest") {
      const [user] = await db
        .select({ email: users.email, displayName: users.displayName })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      if (!user)
        return Response.json(
          { error: "작가를 찾을 수 없습니다." },
          { status: 404 },
        );
      email = user.email;
      displayName = user.displayName;
    }
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);
    if (profile && !profile.portfolioPublic)
      return Response.json(
        { error: "비공개 포트폴리오입니다." },
        { status: 403 },
      );
    const likeCount = sql<number>`(select count(*) from ${postReactions} where ${postReactions.postId}=${posts.id} and ${postReactions.type}='like')`,
      purchaseCount = sql<number>`(select count(*) from ${postReactions} where ${postReactions.postId}=${posts.id} and ${postReactions.type}='purchase')`,
      recommendCount = sql<number>`(select count(*) from ${postReactions} where ${postReactions.postId}=${posts.id} and ${postReactions.type}='recommend')`;
    const works = await db
      .select({
        id: posts.id,
        title: posts.title,
        summary: posts.summary,
        topicName: topics.name,
        topicColor: topics.color,
        format: posts.format,
        workStatus: posts.workStatus,
        publishChallenge: posts.publishChallenge,
        candidateStatus: publicationCandidates.status,
        publishedAt: posts.publishedAt,
        likeCount,
        purchaseCount,
        recommendCount,
      })
      .from(posts)
      .innerJoin(topics, eq(posts.topicId, topics.id))
      .leftJoin(
        publicationCandidates,
        eq(publicationCandidates.postId, posts.id),
      )
      .where(and(eq(posts.ownerEmail, email), eq(posts.status, "published")))
      .orderBy(desc(posts.publishedAt));
    const [follower] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.authorEmail, email));
    const totals = works.reduce(
      (acc, item) => ({
        likes: acc.likes + Number(item.likeCount),
        purchases: acc.purchases + Number(item.purchaseCount),
        recommends: acc.recommends + Number(item.recommendCount),
      }),
      { likes: 0, purchases: 0, recommends: 0 },
    );
    const badges = [
      works.length ? "첫 작품" : "",
      works.some((item) => item.workStatus === "completed") ? "완결 작가" : "",
      works.some((item) => item.publishChallenge) ? "출판 도전자" : "",
      works.some((item) =>
        [
          "selected",
          "contracting",
          "producing",
          "preorder",
          "published",
        ].includes(item.candidateStatus || ""),
      )
        ? "출판 후보"
        : "",
    ].filter(Boolean);
    return Response.json({
      writer: {
        username,
        email,
        displayName: profile?.displayName || displayName,
        profileImage: profile?.profileImage || "",
        headline:
          profile?.headline || "문장을 키워 독자와 만나는 GROW BOOK 작가",
        bio: profile?.bio || "한 장씩 이야기를 쌓아가고 있습니다.",
        interests: profile?.interests || "",
        followers: Number(follower?.count || 0),
        totals,
        badges,
      },
      works,
    });
  } catch (error) {
    return apiError(error);
  }
}

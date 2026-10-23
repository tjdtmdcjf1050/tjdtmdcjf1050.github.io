import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { comments, notifications, posts } from "../../../../../db/schema";
import { apiError, parsePositiveId, requireApiUser } from "../../../utils";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id: rawId } = await context.params;
  const id = parsePositiveId(rawId);
  if (!id) return Response.json({ error: "잘못된 글입니다." }, { status: 400 });

  try {
    const payload = (await request.json()) as { content?: unknown };
    const content = typeof payload.content === "string" ? payload.content.trim() : "";
    if (content.length < 1 || content.length > 500) {
      return Response.json({ error: "댓글은 1~500자로 입력해 주세요." }, { status: 400 });
    }

    const db = await getDb();
    const [post] = await db
      .select({ id: posts.id, ownerEmail: posts.ownerEmail, title: posts.title, commentsEnabled: posts.commentsEnabled })
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.status, "published")))
      .limit(1);
    if (!post) return Response.json({ error: "발행된 글을 찾을 수 없습니다." }, { status: 404 });
    if (!post.commentsEnabled) return Response.json({ error: "작가가 댓글을 받지 않는 작품입니다." }, { status: 403 });

    const [comment] = await db
      .insert(comments)
      .values({
        postId: id,
        userEmail: auth.user.email,
        userDisplayName: auth.user.displayName,
        content,
      })
      .returning({
        id: comments.id,
        userDisplayName: comments.userDisplayName,
        content: comments.content,
        createdAt: comments.createdAt,
      });

    if (post.ownerEmail !== auth.user.email) await db.insert(notifications).values({ userEmail:post.ownerEmail,type:"comment",title:"작품에 새 댓글이 도착했습니다.",message:`${auth.user.displayName} · ${post.title}`,href:`/community/${id}` });

    return Response.json({ comment: { ...comment, isOwner: true } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

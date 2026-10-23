import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { comments } from "../../../../../../db/schema";
import { apiError, parsePositiveId, requireApiUser } from "../../../../utils";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; commentId: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const params = await context.params;
  const postId = parsePositiveId(params.id);
  const commentId = parsePositiveId(params.commentId);
  if (!postId || !commentId) {
    return Response.json({ error: "잘못된 댓글입니다." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const deleted = await db
      .delete(comments)
      .where(
        and(
          eq(comments.id, commentId),
          eq(comments.postId, postId),
          eq(comments.userEmail, auth.user.email),
        ),
      )
      .returning({ id: comments.id });
    if (deleted.length === 0) {
      return Response.json({ error: "삭제할 댓글을 찾을 수 없습니다." }, { status: 404 });
    }
    return Response.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}

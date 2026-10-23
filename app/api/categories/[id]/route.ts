import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { categories, posts } from "../../../../db/schema";
import { apiError, parsePositiveId, requireApiUser } from "../../utils";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id: rawId } = await context.params;
  const id = parsePositiveId(rawId);
  if (!id) return Response.json({ error: "잘못된 카테고리입니다." }, { status: 400 });

  try {
    const db = await getDb();
    const [usage] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.categoryId, id), eq(posts.ownerEmail, auth.user.email)));

    if (Number(usage?.count ?? 0) > 0) {
      return Response.json(
        { error: "작성된 글이 있는 카테고리는 삭제할 수 없습니다." },
        { status: 409 },
      );
    }

    const deleted = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.ownerEmail, auth.user.email)))
      .returning({ id: categories.id });

    if (deleted.length === 0) {
      return Response.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}

import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { categories } from "../../../db/schema";
import {
  apiError,
  categorySlug,
  normalizeCategoryName,
  requireApiUser,
  validCategoryColor,
} from "../utils";

const DEFAULT_CATEGORIES = [
  { name: "소설", slug: "novel", color: "#d9ff54" },
  { name: "에세이", slug: "essay", color: "#ff835c" },
  { name: "시", slug: "poetry", color: "#a9c9b3" },
  { name: "사랑", slug: "love", color: "#ffb3a0" },
];

async function listCategories(ownerEmail: string) {
  const db = await getDb();
  let rows = await db
    .select()
    .from(categories)
    .where(eq(categories.ownerEmail, ownerEmail))
    .orderBy(asc(categories.name));

  if (rows.length === 0) {
    await db
      .insert(categories)
      .values(DEFAULT_CATEGORIES.map((category) => ({ ...category, ownerEmail })))
      .onConflictDoNothing();

    rows = await db
      .select()
      .from(categories)
      .where(eq(categories.ownerEmail, ownerEmail))
      .orderBy(asc(categories.name));
  }

  return rows;
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    return Response.json({ categories: await listCategories(auth.user.email) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const payload = (await request.json()) as { name?: unknown; color?: unknown };
    const name = normalizeCategoryName(payload.name);

    if (name.length < 1 || name.length > 24) {
      return Response.json(
        { error: "카테고리 이름은 1~24자로 입력해 주세요." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const [category] = await db
      .insert(categories)
      .values({
        ownerEmail: auth.user.email,
        name,
        slug: categorySlug(name),
        color: validCategoryColor(payload.color),
      })
      .returning();

    return Response.json({ category }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) {
      return Response.json(
        { error: "같은 이름의 카테고리가 이미 있습니다." },
        { status: 409 },
      );
    }
    return apiError(error);
  }
}

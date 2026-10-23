import { getSessionUser } from "../chatgpt-auth";

export async function requireApiUser() {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: Response.json({ error: "로그인이 필요합니다." }, { status: 401 }),
      user: null,
    } as const;
  }

  return { error: null, user } as const;
}

export function normalizeCategoryName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function categorySlug(value: string) {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return normalized || `category-${Date.now()}`;
}

export function validCategoryColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : "#d9ff54";
}

export function parsePositiveId(value: string | null | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function apiError(error: unknown) {
  console.error("[GROW BOOK API]", error);
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table")) {
    return Response.json(
      { error: "데이터베이스 준비 중입니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }

  return Response.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

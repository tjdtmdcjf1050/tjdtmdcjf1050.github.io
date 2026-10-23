import { isValidManuscriptLength } from "./manuscript";
import {
  boolValue,
  clampPurchaseGoal,
  validVisibility,
  validWorkFormat,
  validWorkStatus,
} from "./publishing";
import { postSnapshot, type PostStatus } from "./post-snapshot";

const POST_STATUSES = new Set<PostStatus>(["draft", "scheduled", "published"]);

function positiveId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function scheduledDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

export function parsePostInput(payload: Record<string, unknown>) {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";
  const categoryId = positiveId(payload.categoryId);
  const topicId = positiveId(payload.topicId);
  const rawStatus = typeof payload.status === "string" ? payload.status : "draft";
  const status = POST_STATUSES.has(rawStatus as PostStatus)
    ? (rawStatus as PostStatus)
    : null;
  const scheduledAt = scheduledDate(payload.scheduledAt);

  if (title.length < 2 || title.length > 100) {
    return { error: "제목은 2~100자로 입력해 주세요." } as const;
  }
  if (!isValidManuscriptLength(content)) {
    return { error: "본문은 10~50,000자로 입력해 주세요." } as const;
  }
  if (summary.length > 240) {
    return { error: "소개글은 240자 이하로 입력해 주세요." } as const;
  }
  if (!categoryId || !topicId || !status) {
    return { error: "주제·글 형식과 저장 상태를 확인해 주세요." } as const;
  }
  if (
    status === "scheduled" &&
    (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())
  ) {
    return { error: "예약 발행 시각은 현재보다 이후로 설정해 주세요." } as const;
  }

  const snapshot = postSnapshot({
    title,
    summary,
    content,
    categoryId,
    topicId,
    format: validWorkFormat(payload.format),
    workStatus: validWorkStatus(payload.workStatus),
    visibility: validVisibility(payload.visibility),
    publishChallenge: boolValue(payload.publishChallenge),
    sponsorshipEnabled: boolValue(payload.sponsorshipEnabled, true),
    commentsEnabled: boolValue(payload.commentsEnabled, true),
    purchaseGoal: clampPurchaseGoal(payload.purchaseGoal),
    tags: typeof payload.tags === "string" ? payload.tags.trim().slice(0, 120) : "",
    seriesTitle:
      typeof payload.seriesTitle === "string"
        ? payload.seriesTitle.trim().slice(0, 80)
        : "",
    seriesId: positiveId(payload.seriesId),
    seriesOrder: Math.min(
      999,
      Math.max(0, Math.round(Number(payload.seriesOrder) || 0)),
    ),
    scheduledAt,
    coverImage:
      typeof payload.coverImage === "string"
        ? payload.coverImage.trim().slice(0, 500)
        : "",
    fontFamily: ["serif", "sans", "classic"].includes(String(payload.fontFamily))
      ? String(payload.fontFamily)
      : "serif",
    fontSize: Math.min(24, Math.max(14, Number(payload.fontSize) || 18)),
    lineHeight: Math.min(240, Math.max(150, Number(payload.lineHeight) || 190)),
    status,
  });
  return { error: null, snapshot } as const;
}

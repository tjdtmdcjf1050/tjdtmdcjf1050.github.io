export const WORK_FORMATS = ["novel", "essay", "poetry", "prose", "other"] as const;
export const WORK_STATUSES = ["preparing", "ongoing", "completed", "paused"] as const;
export const VISIBILITIES = ["public", "preview", "private"] as const;
export const CANDIDATE_STATUSES = [
  "challenging",
  "qualified",
  "reviewing",
  "selected",
  "contracting",
  "producing",
  "preorder",
  "published",
  "on_hold",
  "declined",
] as const;

export type WorkFormat = (typeof WORK_FORMATS)[number];
export type WorkStatus = (typeof WORK_STATUSES)[number];
export type Visibility = (typeof VISIBILITIES)[number];
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const FORMAT_LABELS: Record<WorkFormat, string> = {
  novel: "소설",
  essay: "에세이",
  poetry: "시",
  prose: "산문",
  other: "기타",
};

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  preparing: "준비 중",
  ongoing: "연재 중",
  completed: "완결",
  paused: "휴재",
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: "전체 공개",
  preview: "일부 공개",
  private: "비공개",
};

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  challenging: "도전 중",
  qualified: "기준 달성",
  reviewing: "운영진 검토",
  selected: "후보 선정",
  contracting: "계약 협의",
  producing: "제작 중",
  preorder: "예약 판매",
  published: "출간 완료",
  on_hold: "선정 보류",
  declined: "선정 종료",
};

export function validWorkFormat(value: unknown): WorkFormat {
  return WORK_FORMATS.includes(value as WorkFormat) ? value as WorkFormat : "essay";
}

export function validWorkStatus(value: unknown): WorkStatus {
  return WORK_STATUSES.includes(value as WorkStatus) ? value as WorkStatus : "ongoing";
}

export function validVisibility(value: unknown): Visibility {
  return VISIBILITIES.includes(value as Visibility) ? value as Visibility : "public";
}

export function clampPurchaseGoal(value: unknown) {
  return Math.min(10_000, Math.max(10, Math.round(Number(value) || 300)));
}

export function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}


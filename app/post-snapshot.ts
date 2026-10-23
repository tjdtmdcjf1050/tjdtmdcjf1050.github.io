export type PostStatus = "draft" | "scheduled" | "published";

export type PostSnapshot = {
  title: string;
  summary: string;
  content: string;
  categoryId: number;
  topicId: number | null;
  format: string;
  workStatus: string;
  visibility: string;
  publishChallenge: boolean;
  sponsorshipEnabled: boolean;
  commentsEnabled: boolean;
  purchaseGoal: number;
  tags: string;
  seriesTitle: string;
  seriesId: number | null;
  seriesOrder: number;
  scheduledAt: string | null;
  coverImage: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  status: PostStatus;
};

type SnapshotSource = Partial<PostSnapshot> & {
  title: string;
  content: string;
  categoryId: number;
};

export function postSnapshot(source: SnapshotSource): PostSnapshot {
  return {
    title: source.title,
    summary: source.summary ?? "",
    content: source.content,
    categoryId: source.categoryId,
    topicId: source.topicId ?? null,
    format: source.format ?? "essay",
    workStatus: source.workStatus ?? "ongoing",
    visibility: source.visibility ?? "public",
    publishChallenge: Boolean(source.publishChallenge),
    sponsorshipEnabled: source.sponsorshipEnabled !== false,
    commentsEnabled: source.commentsEnabled !== false,
    purchaseGoal: source.purchaseGoal ?? 300,
    tags: source.tags ?? "",
    seriesTitle: source.seriesTitle ?? "",
    seriesId: source.seriesId ?? null,
    seriesOrder: source.seriesOrder ?? 0,
    scheduledAt: source.scheduledAt ?? null,
    coverImage: source.coverImage ?? "",
    fontFamily: source.fontFamily ?? "serif",
    fontSize: source.fontSize ?? 18,
    lineHeight: source.lineHeight ?? 190,
    status: source.status ?? "draft",
  };
}

export function serializePostSnapshot(snapshot: PostSnapshot) {
  return JSON.stringify(snapshot);
}

export function parsePostSnapshot(value: string, fallback: SnapshotSource) {
  if (!value) return postSnapshot(fallback);
  try {
    const parsed = JSON.parse(value) as Partial<PostSnapshot>;
    if (!parsed || typeof parsed !== "object") return postSnapshot(fallback);
    return postSnapshot({ ...fallback, ...parsed });
  } catch {
    return postSnapshot(fallback);
  }
}

export function snapshotToPostValues(snapshot: PostSnapshot) {
  return {
    categoryId: snapshot.categoryId,
    topicId: snapshot.topicId,
    format: snapshot.format,
    workStatus: snapshot.workStatus,
    visibility: snapshot.visibility,
    publishChallenge: snapshot.publishChallenge,
    sponsorshipEnabled: snapshot.sponsorshipEnabled,
    commentsEnabled: snapshot.commentsEnabled,
    purchaseGoal: snapshot.purchaseGoal,
    title: snapshot.title,
    summary: snapshot.summary,
    content: snapshot.content,
    tags: snapshot.tags,
    seriesTitle: snapshot.seriesTitle,
    seriesId: snapshot.seriesId,
    seriesOrder: snapshot.seriesOrder,
    scheduledAt: snapshot.status === "scheduled" ? snapshot.scheduledAt : null,
    coverImage: snapshot.coverImage,
    fontFamily: snapshot.fontFamily,
    fontSize: snapshot.fontSize,
    lineHeight: snapshot.lineHeight,
    status: snapshot.status,
  };
}

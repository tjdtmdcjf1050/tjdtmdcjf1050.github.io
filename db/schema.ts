import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerEmail: text("owner_email").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color").notNull().default("#d9ff54"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("categories_owner_slug_unique").on(
      table.ownerEmail,
      table.slug,
    ),
    index("categories_owner_idx").on(table.ownerEmail),
  ],
);

export const topics = sqliteTable(
  "topics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color").notNull().default("#d9ff54"),
    description: text("description").notNull().default(""),
    position: integer("position").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("topics_name_unique").on(table.name),
    uniqueIndex("topics_slug_unique").on(table.slug),
    index("topics_position_idx").on(table.position),
  ],
);

export const workSeries = sqliteTable(
  "work_series",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerEmail: text("owner_email").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("ongoing"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("work_series_owner_title_unique").on(
      table.ownerEmail,
      table.title,
    ),
    index("work_series_owner_idx").on(table.ownerEmail),
  ],
);

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerEmail: text("owner_email").notNull(),
    authorName: text("author_name").notNull().default("GROW BOOK 작가"),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    topicId: integer("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    format: text("format").notNull().default("essay"),
    workStatus: text("work_status").notNull().default("ongoing"),
    visibility: text("visibility").notNull().default("public"),
    publishChallenge: integer("publish_challenge", { mode: "boolean" })
      .notNull()
      .default(false),
    sponsorshipEnabled: integer("sponsorship_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    commentsEnabled: integer("comments_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    purchaseGoal: integer("purchase_goal").notNull().default(300),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    tags: text("tags").notNull().default(""),
    coverImage: text("cover_image").notNull().default(""),
    seriesTitle: text("series_title").notNull().default(""),
    seriesId: integer("series_id").references(() => workSeries.id, {
      onDelete: "set null",
    }),
    seriesOrder: integer("series_order").notNull().default(0),
    fontFamily: text("font_family").notNull().default("serif"),
    fontSize: integer("font_size").notNull().default(18),
    lineHeight: integer("line_height").notNull().default(190),
    content: text("content").notNull(),
    status: text("status", { enum: ["draft", "scheduled", "published"] })
      .notNull()
      .default("draft"),
    scheduledAt: text("scheduled_at"),
    deletedAt: text("deleted_at"),
    publishedAt: text("published_at"),
    version: integer("version").notNull().default(1),
    writeToken: text("write_token").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("posts_owner_idx").on(table.ownerEmail),
    index("posts_owner_status_idx").on(table.ownerEmail, table.status),
    index("posts_category_idx").on(table.categoryId),
    index("posts_topic_idx").on(table.topicId),
    index("posts_challenge_idx").on(table.publishChallenge),
    index("posts_series_idx").on(table.seriesId, table.seriesOrder),
    index("posts_scheduled_idx").on(table.status, table.scheduledAt),
    index("posts_deleted_idx").on(table.ownerEmail, table.deletedAt),
    index("posts_discovery_idx").on(
      table.status,
      table.visibility,
      table.deletedAt,
      table.publishedAt,
    ),
    index("posts_discovery_topic_idx").on(
      table.status,
      table.visibility,
      table.topicId,
      table.publishedAt,
    ),
    index("posts_format_status_idx").on(table.format, table.workStatus),
  ],
);

export const postDrafts = sqliteTable(
  "post_drafts",
  {
    postId: integer("post_id")
      .primaryKey()
      .references(() => posts.id, { onDelete: "cascade" }),
    ownerEmail: text("owner_email").notNull(),
    snapshot: text("snapshot").notNull(),
    baseVersion: integer("base_version").notNull(),
    draftVersion: integer("draft_version").notNull().default(1),
    state: text("state", { enum: ["draft", "scheduled"] })
      .notNull()
      .default("draft"),
    scheduledAt: text("scheduled_at"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("post_drafts_owner_idx").on(table.ownerEmail),
    index("post_drafts_schedule_idx").on(table.state, table.scheduledAt),
  ],
);

export const postMetrics = sqliteTable("post_metrics", {
  postId: integer("post_id")
    .primaryKey()
    .references(() => posts.id, { onDelete: "cascade" }),
  likeCount: integer("like_count").notNull().default(0),
  purchaseCount: integer("purchase_count").notNull().default(0),
  recommendCount: integer("recommend_count").notNull().default(0),
  bookmarkCount: integer("bookmark_count").notNull().default(0),
  readerCount: integer("reader_count").notNull().default(0),
  completionCount: integer("completion_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  sponsorCount: integer("sponsor_count").notNull().default(0),
  sponsorAmount: integer("sponsor_amount").notNull().default(0),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const postChapters = sqliteTable(
  "post_chapters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    content: text("content").notNull(),
    position: integer("position").notNull().default(0),
    status: text("status").notNull().default("published"),
    scheduledAt: text("scheduled_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("post_chapters_post_position_unique").on(
      table.postId,
      table.position,
    ),
    index("post_chapters_post_idx").on(table.postId),
  ],
);

export const postRevisions = sqliteTable(
  "post_revisions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    ownerEmail: text("owner_email").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    content: text("content").notNull(),
    tags: text("tags").notNull().default(""),
    coverImage: text("cover_image").notNull().default(""),
    seriesTitle: text("series_title").notNull().default(""),
    fontFamily: text("font_family").notNull().default("serif"),
    fontSize: integer("font_size").notNull().default(18),
    lineHeight: integer("line_height").notNull().default(190),
    categoryId: integer("category_id").notNull(),
    status: text("status").notNull().default("draft"),
    reason: text("reason").notNull().default("manual"),
    snapshot: text("snapshot").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("post_revisions_post_idx").on(table.postId),
    index("post_revisions_owner_idx").on(table.ownerEmail),
  ],
);

export const profiles = sqliteTable("profiles", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  profileImage: text("profile_image").notNull().default(""),
  headline: text("headline").notNull().default(""),
  bio: text("bio").notNull().default(""),
  interests: text("interests").notNull().default(""),
  portfolioPublic: integer("portfolio_public", { mode: "boolean" })
    .notNull()
    .default(true),
  representativePostId: integer("representative_post_id"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const userSessions = sqliteTable("user_sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const authAttempts = sqliteTable(
  "auth_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scope: text("scope").notNull(),
    identifier: text("identifier").notNull(),
    attemptedAt: text("attempted_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("auth_attempts_lookup_idx").on(
      table.scope,
      table.identifier,
      table.attemptedAt,
    ),
  ],
);

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("bookmarks_post_user_unique").on(table.postId, table.userEmail),
  ],
);

export const follows = sqliteTable(
  "follows",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    followerEmail: text("follower_email").notNull(),
    authorEmail: text("author_email").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("follows_pair_unique").on(
      table.followerEmail,
      table.authorEmail,
    ),
  ],
);

export const reports = sqliteTable(
  "reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    reporterEmail: text("reporter_email").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("received"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("reports_post_user_unique").on(
      table.postId,
      table.reporterEmail,
    ),
  ],
);

export const postReactions = sqliteTable(
  "post_reactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    type: text("type", { enum: ["like", "purchase", "recommend"] }).notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("post_reactions_user_type_unique").on(
      table.postId,
      table.userEmail,
      table.type,
    ),
    index("post_reactions_post_idx").on(table.postId),
  ],
);

export const readingProgress = sqliteTable(
  "reading_progress",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    chapterIndex: integer("chapter_index").notNull().default(0),
    progressPercent: integer("progress_percent").notNull().default(0),
    completed: integer("completed", { mode: "boolean" })
      .notNull()
      .default(false),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("reading_progress_post_user_unique").on(
      table.postId,
      table.userEmail,
    ),
    index("reading_progress_user_idx").on(table.userEmail),
    index("reading_progress_completed_idx").on(table.postId, table.completed),
  ],
);

export const readingHistory = sqliteTable(
  "reading_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    viewCount: integer("view_count").notNull().default(1),
    lastViewedAt: text("last_viewed_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("reading_history_post_user_unique").on(
      table.postId,
      table.userEmail,
    ),
    index("reading_history_user_recent_idx").on(
      table.userEmail,
      table.lastViewedAt,
    ),
  ],
);

export const savedFilters = sqliteTable(
  "saved_filters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userEmail: text("user_email").notNull(),
    name: text("name").notNull(),
    query: text("query").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("saved_filters_user_name_unique").on(
      table.userEmail,
      table.name,
    ),
    index("saved_filters_user_idx").on(table.userEmail),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userEmail: text("user_email").notNull(),
    type: text("type").notNull().default("system"),
    title: text("title").notNull(),
    message: text("message").notNull().default(""),
    href: text("href").notNull().default(""),
    readAt: text("read_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("notifications_user_idx").on(table.userEmail, table.createdAt),
    index("notifications_unread_idx").on(table.userEmail, table.readAt),
  ],
);

export const challenges = sqliteTable(
  "challenges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull().default(""),
    topicSlug: text("topic_slug").notNull().default("love"),
    status: text("status").notNull().default("open"),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at").notNull(),
    purchaseGoal: integer("purchase_goal").notNull().default(300),
    donationCopy: text("donation_copy").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("challenges_slug_unique").on(table.slug),
    index("challenges_status_idx").on(table.status),
  ],
);

export const challengeEntries = sqliteTable(
  "challenge_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    challengeId: integer("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    applicantEmail: text("applicant_email").notNull(),
    status: text("status").notNull().default("submitted"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("challenge_entries_challenge_post_unique").on(
      table.challengeId,
      table.postId,
    ),
    index("challenge_entries_challenge_idx").on(table.challengeId),
  ],
);

export const publicationCandidates = sqliteTable(
  "publication_candidates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("challenging"),
    score: integer("score").notNull().default(0),
    editorNote: text("editor_note").notNull().default(""),
    selectionReason: text("selection_reason").notNull().default(""),
    decisionReason: text("decision_reason").notNull().default(""),
    challengeStartsAt: text("challenge_starts_at"),
    challengeEndsAt: text("challenge_ends_at"),
    targetCount: integer("target_count").notNull().default(300),
    attemptNumber: integer("attempt_number").notNull().default(1),
    eligibleAgainAt: text("eligible_again_at"),
    scoreBreakdown: text("score_breakdown").notNull().default("{}"),
    anomalousExcluded: integer("anomalous_excluded").notNull().default(0),
    updatedBy: text("updated_by").notNull().default("system"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("publication_candidates_post_unique").on(table.postId),
    index("publication_candidates_status_idx").on(table.status),
    index("publication_candidates_score_idx").on(table.score),
  ],
);

export const publishingRules = sqliteTable("publishing_rules", {
  id: integer("id").primaryKey(),
  purchaseWeight: integer("purchase_weight").notNull().default(45),
  completionWeight: integer("completion_weight").notNull().default(30),
  recommendWeight: integer("recommend_weight").notNull().default(15),
  engagementWeight: integer("engagement_weight").notNull().default(10),
  challengeDays: integer("challenge_days").notNull().default(30),
  defaultTarget: integer("default_target").notNull().default(300),
  abnormalHourlyLimit: integer("abnormal_hourly_limit").notNull().default(20),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const publicationAttempts = sqliteTable(
  "publication_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => publicationCandidates.id, { onDelete: "cascade" }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull().default(1),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at").notNull(),
    targetCount: integer("target_count").notNull().default(300),
    score: integer("score").notNull().default(0),
    status: text("status").notNull().default("challenging"),
    resultReason: text("result_reason").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    closedAt: text("closed_at"),
  },
  (table) => [
    uniqueIndex("publication_attempts_candidate_number_unique").on(
      table.candidateId,
      table.attemptNumber,
    ),
    index("publication_attempts_post_idx").on(
      table.postId,
      table.attemptNumber,
    ),
  ],
);

export const reactionEvents = sqliteTable(
  "reaction_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    type: text("type").notNull(),
    action: text("action").notNull(),
    riskReason: text("risk_reason").notNull().default(""),
    excluded: integer("excluded", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("reaction_events_user_time_idx").on(table.userEmail, table.createdAt),
    index("reaction_events_post_idx").on(table.postId),
  ],
);

export const reactionFlags = sqliteTable(
  "reaction_flags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userEmail: text("user_email").notNull(),
    postId: integer("post_id").references(() => posts.id, {
      onDelete: "cascade",
    }),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("reaction_flags_user_idx").on(table.userEmail, table.status),
    index("reaction_flags_post_idx").on(table.postId, table.status),
  ],
);

export const moderationLogs = sqliteTable(
  "moderation_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    adminName: text("admin_name").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("moderation_logs_created_idx").on(table.createdAt)],
);

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    userDisplayName: text("user_display_name").notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("comments_post_idx").on(table.postId),
    index("comments_user_idx").on(table.userEmail),
  ],
);

export const sponsorships = sqliteTable(
  "sponsorships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    amount: integer("amount").notNull(),
    message: text("message").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sponsorships_user_post_unique").on(
      table.postId,
      table.userEmail,
    ),
    index("sponsorships_post_idx").on(table.postId),
  ],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerEmail: text("owner_email").notNull(),
    ownerName: text("owner_name").notNull(),
    type: text("type").notNull().default("lecture"),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    venue: text("venue").notNull().default(""),
    startsAt: text("starts_at").notNull(),
    capacity: integer("capacity").notNull().default(20),
    fee: integer("fee").notNull().default(0),
    status: text("status").notNull().default("submitted"),
    adminNote: text("admin_note").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("events_status_date_idx").on(table.status, table.startsAt),
    index("events_owner_idx").on(table.ownerEmail, table.createdAt),
  ],
);

export const eventApplications = sqliteTable(
  "event_applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    userName: text("user_name").notNull(),
    message: text("message").notNull().default(""),
    status: text("status").notNull().default("confirmed"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("event_applications_event_user_unique").on(
      table.eventId,
      table.userEmail,
    ),
    index("event_applications_event_idx").on(table.eventId, table.status),
  ],
);

export const financialEntries = sqliteTable(
  "financial_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerEmail: text("owner_email").notNull(),
    postId: integer("post_id").references(() => posts.id, {
      onDelete: "set null",
    }),
    eventId: integer("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    amount: integer("amount").notNull().default(0),
    quantity: integer("quantity").notNull().default(1),
    status: text("status").notNull().default("recorded"),
    occurredAt: text("occurred_at").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("financial_entries_owner_idx").on(table.ownerEmail, table.occurredAt),
    index("financial_entries_type_idx").on(table.type, table.occurredAt),
  ],
);

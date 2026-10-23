CREATE TABLE `work_series` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_email` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'ongoing' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_series_owner_title_unique` ON `work_series` (`owner_email`,`title`);
--> statement-breakpoint
CREATE INDEX `work_series_owner_idx` ON `work_series` (`owner_email`);
--> statement-breakpoint
ALTER TABLE `posts` ADD `series_id` integer REFERENCES work_series(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `series_order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `scheduled_at` text;
--> statement-breakpoint
ALTER TABLE `posts` ADD `deleted_at` text;
--> statement-breakpoint
CREATE INDEX `posts_series_idx` ON `posts` (`series_id`,`series_order`);
--> statement-breakpoint
CREATE INDEX `posts_scheduled_idx` ON `posts` (`status`,`scheduled_at`);
--> statement-breakpoint
CREATE INDEX `posts_deleted_idx` ON `posts` (`owner_email`,`deleted_at`);
--> statement-breakpoint
CREATE TABLE `reading_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	`user_email` text NOT NULL,
	`view_count` integer DEFAULT 1 NOT NULL,
	`last_viewed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reading_history_post_user_unique` ON `reading_history` (`post_id`,`user_email`);
--> statement-breakpoint
CREATE INDEX `reading_history_user_recent_idx` ON `reading_history` (`user_email`,`last_viewed_at`);
--> statement-breakpoint
CREATE TABLE `saved_filters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`name` text NOT NULL,
	`query` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_filters_user_name_unique` ON `saved_filters` (`user_email`,`name`);
--> statement-breakpoint
CREATE INDEX `saved_filters_user_idx` ON `saved_filters` (`user_email`);
--> statement-breakpoint
ALTER TABLE `publication_candidates` ADD `decision_reason` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `publication_candidates` ADD `challenge_starts_at` text;
--> statement-breakpoint
ALTER TABLE `publication_candidates` ADD `challenge_ends_at` text;
--> statement-breakpoint
ALTER TABLE `publication_candidates` ADD `target_count` integer DEFAULT 300 NOT NULL;
--> statement-breakpoint
ALTER TABLE `publication_candidates` ADD `attempt_number` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `publication_candidates` ADD `eligible_again_at` text;
--> statement-breakpoint
ALTER TABLE `publication_candidates` ADD `score_breakdown` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `publication_candidates` ADD `anomalous_excluded` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `publishing_rules` (
	`id` integer PRIMARY KEY NOT NULL,
	`purchase_weight` integer DEFAULT 45 NOT NULL,
	`completion_weight` integer DEFAULT 30 NOT NULL,
	`recommend_weight` integer DEFAULT 15 NOT NULL,
	`engagement_weight` integer DEFAULT 10 NOT NULL,
	`challenge_days` integer DEFAULT 30 NOT NULL,
	`default_target` integer DEFAULT 300 NOT NULL,
	`abnormal_hourly_limit` integer DEFAULT 20 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `publishing_rules` (`id`) VALUES (1);
--> statement-breakpoint
CREATE TABLE `publication_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`candidate_id` integer NOT NULL REFERENCES publication_candidates(id) ON DELETE CASCADE,
	`post_id` integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	`attempt_number` integer DEFAULT 1 NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`target_count` integer DEFAULT 300 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'challenging' NOT NULL,
	`result_reason` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_attempts_candidate_number_unique` ON `publication_attempts` (`candidate_id`,`attempt_number`);
--> statement-breakpoint
CREATE INDEX `publication_attempts_post_idx` ON `publication_attempts` (`post_id`,`attempt_number`);
--> statement-breakpoint
UPDATE `publication_candidates`
SET `challenge_starts_at` = COALESCE(`challenge_starts_at`, `created_at`),
    `challenge_ends_at` = COALESCE(`challenge_ends_at`, datetime(`created_at`, '+30 days')),
    `target_count` = COALESCE((SELECT `purchase_goal` FROM `posts` WHERE `posts`.`id` = `publication_candidates`.`post_id`), 300);
--> statement-breakpoint
INSERT OR IGNORE INTO `publication_attempts` (`candidate_id`,`post_id`,`attempt_number`,`starts_at`,`ends_at`,`target_count`,`score`,`status`)
SELECT `id`,`post_id`,1,COALESCE(`challenge_starts_at`,`created_at`),COALESCE(`challenge_ends_at`,datetime(`created_at`, '+30 days')),
       `target_count`,`score`,`status`
FROM `publication_candidates`;
--> statement-breakpoint
CREATE TABLE `reaction_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	`user_email` text NOT NULL,
	`type` text NOT NULL,
	`action` text NOT NULL,
	`risk_reason` text DEFAULT '' NOT NULL,
	`excluded` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reaction_events_user_time_idx` ON `reaction_events` (`user_email`,`created_at`);
--> statement-breakpoint
CREATE INDEX `reaction_events_post_idx` ON `reaction_events` (`post_id`);
--> statement-breakpoint
CREATE TABLE `reaction_flags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`post_id` integer REFERENCES posts(id) ON DELETE CASCADE,
	`reason` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reaction_flags_user_idx` ON `reaction_flags` (`user_email`,`status`);
--> statement-breakpoint
CREATE INDEX `reaction_flags_post_idx` ON `reaction_flags` (`post_id`,`status`);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_email` text NOT NULL,
	`owner_name` text NOT NULL,
	`type` text DEFAULT 'lecture' NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`venue` text DEFAULT '' NOT NULL,
	`starts_at` text NOT NULL,
	`capacity` integer DEFAULT 20 NOT NULL,
	`fee` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_status_date_idx` ON `events` (`status`,`starts_at`);
--> statement-breakpoint
CREATE INDEX `events_owner_idx` ON `events` (`owner_email`,`created_at`);
--> statement-breakpoint
CREATE TABLE `event_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	`user_email` text NOT NULL,
	`user_name` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_applications_event_user_unique` ON `event_applications` (`event_id`,`user_email`);
--> statement-breakpoint
CREATE INDEX `event_applications_event_idx` ON `event_applications` (`event_id`,`status`);
--> statement-breakpoint
CREATE TABLE `financial_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_email` text NOT NULL,
	`post_id` integer REFERENCES posts(id) ON DELETE SET NULL,
	`event_id` integer REFERENCES events(id) ON DELETE SET NULL,
	`type` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'recorded' NOT NULL,
	`occurred_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `financial_entries_owner_idx` ON `financial_entries` (`owner_email`,`occurred_at`);
--> statement-breakpoint
CREATE INDEX `financial_entries_type_idx` ON `financial_entries` (`type`,`occurred_at`);
--> statement-breakpoint
INSERT OR IGNORE INTO `work_series` (`owner_email`,`title`,`description`,`status`)
VALUES ('guest@growbook.test','마음이 자라는 계절','사랑과 성장에 관한 세 편의 연작','ongoing');
--> statement-breakpoint
UPDATE `posts`
SET `series_id` = (SELECT `id` FROM `work_series` WHERE `owner_email`='guest@growbook.test' AND `title`='마음이 자라는 계절'),
    `series_order` = CASE WHEN `id`=1 THEN 1 WHEN `id`=2 THEN 2 ELSE 3 END
WHERE `id` IN (1,2,3);
--> statement-breakpoint
INSERT OR IGNORE INTO `saved_filters` (`user_email`,`name`,`query`)
VALUES ('guest@growbook.test','완결된 사랑 이야기','topic=love&workStatus=completed&sort=recommended');
--> statement-breakpoint
INSERT OR IGNORE INTO `reading_history` (`post_id`,`user_email`,`view_count`,`last_viewed_at`)
SELECT `id`,'guest@growbook.test',2,datetime('now','-' || `id` || ' hours') FROM `posts` WHERE `id` IN (1,2,4,7);
--> statement-breakpoint
INSERT INTO `events` (`owner_email`,`owner_name`,`type`,`title`,`summary`,`venue`,`starts_at`,`capacity`,`fee`,`status`,`admin_note`)
VALUES
('guest@growbook.test','테스트 작가','lecture','한 편의 에세이를 완성하는 문장 수업','초고를 다듬고 독자에게 닿는 문장을 만드는 작가 강의입니다.','서울 성수 GROW BOOK 라운지','2026-08-22T05:00:00.000Z',24,25000,'approved','공개 테스트 승인 행사'),
('guest@growbook.test','테스트 작가','popup','독자와 작가가 만나는 여름 책방','출판 후보 작품을 먼저 읽고 작가와 대화하는 오프라인 팝업입니다.','서울 연남 팝업 스튜디오','2026-09-05T04:00:00.000Z',80,0,'approved','공개 테스트 승인 행사'),
('guest@growbook.test','테스트 작가','portfolio','신인 작가 포트폴리오 모임','원고와 소개서를 함께 검토하는 소규모 참여형 모임입니다.','온라인 + GROW BOOK 라운지','2026-09-19T05:00:00.000Z',16,15000,'approved','공개 테스트 승인 행사');
--> statement-breakpoint
INSERT INTO `financial_entries` (`owner_email`,`post_id`,`type`,`amount`,`quantity`,`status`,`occurred_at`,`note`)
VALUES
('guest@growbook.test',1,'sale',18500,42,'recorded','2026-07-01T00:00:00.000Z','출판 후 테스트 판매 기록'),
('guest@growbook.test',1,'royalty',116550,1,'payable','2026-07-10T00:00:00.000Z','작가 인세 예정'),
('guest@growbook.test',1,'donation',38850,1,'completed','2026-07-12T00:00:00.000Z','판매 수익 사회공헌 적립'),
('guest@growbook.test',NULL,'lecture_income',240000,1,'payable','2026-07-13T00:00:00.000Z','작가 강의 수익 테스트');

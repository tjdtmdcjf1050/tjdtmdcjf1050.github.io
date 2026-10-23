CREATE TABLE `topics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`color` text DEFAULT '#d9ff54' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topics_name_unique` ON `topics` (`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `topics_slug_unique` ON `topics` (`slug`);
--> statement-breakpoint
CREATE INDEX `topics_position_idx` ON `topics` (`position`);
--> statement-breakpoint
INSERT OR IGNORE INTO `topics` (`name`,`slug`,`color`,`description`,`position`) VALUES
('사랑','love','#ffb3a0','연애, 이별, 감정, 관계, 고백과 그리움',1),
('성장','growth','#d9ff54','습관, 목표, 도전, 실패, 회복과 커리어',2),
('위로','comfort','#a9c9b3','상처, 외로움, 마음관리와 회복',3),
('청춘','youth','#ff835c','꿈, 취업, 친구, 방황과 새로운 시작',4),
('삶과 철학','life-philosophy','#b8b5ff','인생관, 가치관, 신념, 사색과 질문',5),
('지식과 경제','knowledge-economy','#ffd66b','돈, 일, 사업, 투자와 생산성',6);
--> statement-breakpoint
ALTER TABLE `posts` ADD `topic_id` integer REFERENCES `topics`(`id`) ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `posts` ADD `format` text DEFAULT 'essay' NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `work_status` text DEFAULT 'ongoing' NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `visibility` text DEFAULT 'public' NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `publish_challenge` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `sponsorship_enabled` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `comments_enabled` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `purchase_goal` integer DEFAULT 300 NOT NULL;
--> statement-breakpoint
UPDATE `posts` SET `topic_id`=(SELECT `id` FROM `topics` WHERE `slug`='love'), `format`='essay' WHERE `category_id` IN (SELECT `id` FROM `categories` WHERE `name`='사랑');
--> statement-breakpoint
UPDATE `posts` SET `topic_id`=(SELECT `id` FROM `topics` WHERE `slug`='growth'), `format`='essay' WHERE `category_id` IN (SELECT `id` FROM `categories` WHERE `name`='에세이');
--> statement-breakpoint
UPDATE `posts` SET `topic_id`=(SELECT `id` FROM `topics` WHERE `slug`='youth'), `format`='novel' WHERE `category_id` IN (SELECT `id` FROM `categories` WHERE `name`='소설');
--> statement-breakpoint
UPDATE `posts` SET `topic_id`=(SELECT `id` FROM `topics` WHERE `slug`='comfort'), `format`='poetry' WHERE `category_id` IN (SELECT `id` FROM `categories` WHERE `name`='시');
--> statement-breakpoint
UPDATE `posts` SET `topic_id`=(SELECT `id` FROM `topics` WHERE `slug`='growth') WHERE `topic_id` IS NULL;
--> statement-breakpoint
UPDATE `posts` SET `publish_challenge`=1, `purchase_goal`=300 WHERE `status`='published' AND `topic_id`=(SELECT `id` FROM `topics` WHERE `slug`='love');
--> statement-breakpoint
CREATE INDEX `posts_topic_idx` ON `posts` (`topic_id`);
--> statement-breakpoint
CREATE INDEX `posts_challenge_idx` ON `posts` (`publish_challenge`);
--> statement-breakpoint
CREATE TABLE `post_chapters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`scheduled_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_chapters_post_position_unique` ON `post_chapters` (`post_id`,`position`);
--> statement-breakpoint
CREATE INDEX `post_chapters_post_idx` ON `post_chapters` (`post_id`);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `headline` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `portfolio_public` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `representative_post_id` integer;
--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_email` text NOT NULL,
	`chapter_index` integer DEFAULT 0 NOT NULL,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reading_progress_post_user_unique` ON `reading_progress` (`post_id`,`user_email`);
--> statement-breakpoint
CREATE INDEX `reading_progress_user_idx` ON `reading_progress` (`user_email`);
--> statement-breakpoint
CREATE INDEX `reading_progress_completed_idx` ON `reading_progress` (`post_id`,`completed`);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`type` text DEFAULT 'system' NOT NULL,
	`title` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`href` text DEFAULT '' NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_email`,`created_at`);
--> statement-breakpoint
CREATE INDEX `notifications_unread_idx` ON `notifications` (`user_email`,`read_at`);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`topic_slug` text DEFAULT 'love' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`purchase_goal` integer DEFAULT 300 NOT NULL,
	`donation_copy` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `challenges_slug_unique` ON `challenges` (`slug`);
--> statement-breakpoint
CREATE INDEX `challenges_status_idx` ON `challenges` (`status`);
--> statement-breakpoint
INSERT OR IGNORE INTO `challenges` (`title`,`slug`,`summary`,`topic_slug`,`status`,`starts_at`,`ends_at`,`purchase_goal`,`donation_copy`) VALUES
('사랑, 한 권이 되는 문장들','love-anthology-2026','사랑·연애·이별·관계에 관한 문장을 독자와 함께 발견하고 공동 저자 앤솔로지로 연결하는 첫 번째 출판 도전입니다.','love','open','2026-07-01T00:00:00.000Z','2026-09-30T23:59:59.000Z',300,'선정 작품의 출판 수익 일부는 작가 동의 후 도움이 필요한 곳에 전달하며 결과를 투명하게 공개합니다.');
--> statement-breakpoint
CREATE TABLE `challenge_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`challenge_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	`applicant_email` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `challenge_entries_challenge_post_unique` ON `challenge_entries` (`challenge_id`,`post_id`);
--> statement-breakpoint
CREATE INDEX `challenge_entries_challenge_idx` ON `challenge_entries` (`challenge_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `challenge_entries` (`challenge_id`,`post_id`,`applicant_email`,`status`)
SELECT (SELECT `id` FROM `challenges` WHERE `slug`='love-anthology-2026'), `id`, `owner_email`, 'submitted'
FROM `posts` WHERE `publish_challenge`=1 AND `status`='published';
--> statement-breakpoint
CREATE TABLE `publication_candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`status` text DEFAULT 'challenging' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`editor_note` text DEFAULT '' NOT NULL,
	`selection_reason` text DEFAULT '' NOT NULL,
	`updated_by` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_candidates_post_unique` ON `publication_candidates` (`post_id`);
--> statement-breakpoint
CREATE INDEX `publication_candidates_status_idx` ON `publication_candidates` (`status`);
--> statement-breakpoint
CREATE INDEX `publication_candidates_score_idx` ON `publication_candidates` (`score`);
--> statement-breakpoint
INSERT OR IGNORE INTO `publication_candidates` (`post_id`,`status`) SELECT `id`,'challenging' FROM `posts` WHERE `publish_challenge`=1;
--> statement-breakpoint
CREATE TABLE `moderation_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_name` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `moderation_logs_created_idx` ON `moderation_logs` (`created_at`);

ALTER TABLE `posts` ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `write_token` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `post_revisions` ADD `snapshot` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `post_drafts` (
	`post_id` integer PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`snapshot` text NOT NULL,
	`base_version` integer NOT NULL,
	`draft_version` integer DEFAULT 1 NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	`scheduled_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_drafts_owner_idx` ON `post_drafts` (`owner_email`);
--> statement-breakpoint
CREATE INDEX `post_drafts_schedule_idx` ON `post_drafts` (`state`,`scheduled_at`);

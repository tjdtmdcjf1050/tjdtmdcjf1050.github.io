CREATE TABLE `post_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`owner_email` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`cover_image` text DEFAULT '' NOT NULL,
	`series_title` text DEFAULT '' NOT NULL,
	`font_family` text DEFAULT 'serif' NOT NULL,
	`font_size` integer DEFAULT 18 NOT NULL,
	`line_height` integer DEFAULT 190 NOT NULL,
	`category_id` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`reason` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `post_revisions_post_idx` ON `post_revisions` (`post_id`);--> statement-breakpoint
CREATE INDEX `post_revisions_owner_idx` ON `post_revisions` (`owner_email`);

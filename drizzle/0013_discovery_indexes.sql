CREATE INDEX `posts_discovery_idx` ON `posts` (`status`,`visibility`,`deleted_at`,`published_at`);
--> statement-breakpoint
CREATE INDEX `posts_discovery_topic_idx` ON `posts` (`status`,`visibility`,`topic_id`,`published_at`);
--> statement-breakpoint
CREATE INDEX `posts_format_status_idx` ON `posts` (`format`,`work_status`);

CREATE TABLE `post_metrics` (
	`post_id` integer PRIMARY KEY NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`purchase_count` integer DEFAULT 0 NOT NULL,
	`recommend_count` integer DEFAULT 0 NOT NULL,
	`bookmark_count` integer DEFAULT 0 NOT NULL,
	`reader_count` integer DEFAULT 0 NOT NULL,
	`completion_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`sponsor_count` integer DEFAULT 0 NOT NULL,
	`sponsor_amount` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `post_metrics` (`post_id`,`like_count`,`purchase_count`,`recommend_count`,`bookmark_count`,`reader_count`,`completion_count`,`comment_count`,`sponsor_count`,`sponsor_amount`)
SELECT p.id,
  (SELECT count(*) FROM post_reactions r WHERE r.post_id=p.id AND r.type='like'),
  (SELECT count(*) FROM post_reactions r WHERE r.post_id=p.id AND r.type='purchase'),
  (SELECT count(*) FROM post_reactions r WHERE r.post_id=p.id AND r.type='recommend'),
  (SELECT count(*) FROM bookmarks b WHERE b.post_id=p.id),
  (SELECT count(*) FROM reading_history h WHERE h.post_id=p.id),
  (SELECT count(*) FROM reading_progress rp WHERE rp.post_id=p.id AND rp.completed=1),
  (SELECT count(*) FROM comments c WHERE c.post_id=p.id),
  (SELECT count(*) FROM sponsorships s WHERE s.post_id=p.id),
  (SELECT coalesce(sum(s.amount),0) FROM sponsorships s WHERE s.post_id=p.id)
FROM posts p;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_post_insert` AFTER INSERT ON `posts` BEGIN
  INSERT OR IGNORE INTO post_metrics (post_id) VALUES (NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_reaction_insert` AFTER INSERT ON `post_reactions` BEGIN
  UPDATE post_metrics SET
    like_count=like_count + CASE WHEN NEW.type='like' THEN 1 ELSE 0 END,
    purchase_count=purchase_count + CASE WHEN NEW.type='purchase' THEN 1 ELSE 0 END,
    recommend_count=recommend_count + CASE WHEN NEW.type='recommend' THEN 1 ELSE 0 END,
    updated_at=CURRENT_TIMESTAMP WHERE post_id=NEW.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_reaction_delete` AFTER DELETE ON `post_reactions` BEGIN
  UPDATE post_metrics SET
    like_count=max(0,like_count - CASE WHEN OLD.type='like' THEN 1 ELSE 0 END),
    purchase_count=max(0,purchase_count - CASE WHEN OLD.type='purchase' THEN 1 ELSE 0 END),
    recommend_count=max(0,recommend_count - CASE WHEN OLD.type='recommend' THEN 1 ELSE 0 END),
    updated_at=CURRENT_TIMESTAMP WHERE post_id=OLD.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_bookmark_insert` AFTER INSERT ON `bookmarks` BEGIN
  UPDATE post_metrics SET bookmark_count=bookmark_count+1,updated_at=CURRENT_TIMESTAMP WHERE post_id=NEW.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_bookmark_delete` AFTER DELETE ON `bookmarks` BEGIN
  UPDATE post_metrics SET bookmark_count=max(0,bookmark_count-1),updated_at=CURRENT_TIMESTAMP WHERE post_id=OLD.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_history_insert` AFTER INSERT ON `reading_history` BEGIN
  UPDATE post_metrics SET reader_count=reader_count+1,updated_at=CURRENT_TIMESTAMP WHERE post_id=NEW.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_history_delete` AFTER DELETE ON `reading_history` BEGIN
  UPDATE post_metrics SET reader_count=max(0,reader_count-1),updated_at=CURRENT_TIMESTAMP WHERE post_id=OLD.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_progress_insert` AFTER INSERT ON `reading_progress` WHEN NEW.completed=1 BEGIN
  UPDATE post_metrics SET completion_count=completion_count+1,updated_at=CURRENT_TIMESTAMP WHERE post_id=NEW.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_progress_update` AFTER UPDATE OF `completed` ON `reading_progress` WHEN NEW.completed != OLD.completed BEGIN
  UPDATE post_metrics SET completion_count=max(0,completion_count + CASE WHEN NEW.completed=1 THEN 1 ELSE -1 END),updated_at=CURRENT_TIMESTAMP WHERE post_id=NEW.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_progress_delete` AFTER DELETE ON `reading_progress` WHEN OLD.completed=1 BEGIN
  UPDATE post_metrics SET completion_count=max(0,completion_count-1),updated_at=CURRENT_TIMESTAMP WHERE post_id=OLD.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_comment_insert` AFTER INSERT ON `comments` BEGIN
  UPDATE post_metrics SET comment_count=comment_count+1,updated_at=CURRENT_TIMESTAMP WHERE post_id=NEW.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_comment_delete` AFTER DELETE ON `comments` BEGIN
  UPDATE post_metrics SET comment_count=max(0,comment_count-1),updated_at=CURRENT_TIMESTAMP WHERE post_id=OLD.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_sponsorship_insert` AFTER INSERT ON `sponsorships` BEGIN
  UPDATE post_metrics SET sponsor_count=sponsor_count+1,sponsor_amount=sponsor_amount+NEW.amount,updated_at=CURRENT_TIMESTAMP WHERE post_id=NEW.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_sponsorship_update` AFTER UPDATE OF `amount` ON `sponsorships` BEGIN
  UPDATE post_metrics SET sponsor_amount=max(0,sponsor_amount-OLD.amount+NEW.amount),updated_at=CURRENT_TIMESTAMP WHERE post_id=NEW.post_id;
END;
--> statement-breakpoint
CREATE TRIGGER `post_metrics_sponsorship_delete` AFTER DELETE ON `sponsorships` BEGIN
  UPDATE post_metrics SET sponsor_count=max(0,sponsor_count-1),sponsor_amount=max(0,sponsor_amount-OLD.amount),updated_at=CURRENT_TIMESTAMP WHERE post_id=OLD.post_id;
END;

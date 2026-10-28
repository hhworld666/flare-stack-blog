CREATE TABLE `site_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`content_markdown` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_pages_slug_unique` ON `site_pages` (`slug`);
--> statement-breakpoint
CREATE INDEX `site_pages_updated_at_idx` ON `site_pages` (`updated_at`);

ALTER TABLE `moodboard_items` ADD `published` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `moodboard_items` ADD `category` text DEFAULT 'Inspiration' NOT NULL;--> statement-breakpoint
ALTER TABLE `moodboard_items` ADD `color` text DEFAULT 'grey' NOT NULL;--> statement-breakpoint
ALTER TABLE `moodboard_items` ADD `photo_mode` text DEFAULT 'color' NOT NULL;--> statement-breakpoint
ALTER TABLE `moodboard_items` ADD `thumbnail_key` text;--> statement-breakpoint
ALTER TABLE `moodboard_items` ADD `thumbnail_mime_type` text;--> statement-breakpoint
ALTER TABLE `moodboard_items` ADD `thumbnail_url` text;
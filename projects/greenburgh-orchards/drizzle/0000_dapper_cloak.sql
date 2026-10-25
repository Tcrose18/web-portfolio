CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`region` text NOT NULL,
	`postal_code` text NOT NULL,
	`country` text NOT NULL,
	`items_json` text NOT NULL,
	`subtotal_cents` integer NOT NULL,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_email_unique` ON `subscribers` (`email`);
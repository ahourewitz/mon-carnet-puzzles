CREATE TABLE `collections` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`initialized_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `puzzles` (
	`id` text NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`brand` text NOT NULL,
	`author` text,
	`pieces_label` text NOT NULL,
	`pieces_total` integer NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`completion_date` text,
	`date_precision` text DEFAULT 'month' NOT NULL,
	`purchased_at` text,
	`image_url` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `puzzles_owner_idx` ON `puzzles` (`owner_id`);
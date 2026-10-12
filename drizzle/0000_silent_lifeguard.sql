CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tutor_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`starts` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `booking_owner` ON `bookings` (`user_id`,`starts`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`source` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `message_session` ON `messages` (`session_id`,`created`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`level` text DEFAULT 'A1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rentals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tutor_id` text NOT NULL,
	`plan` text NOT NULL,
	`starts` integer NOT NULL,
	`expires` integer NOT NULL,
	`cancelled` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rental_owner_tutor` ON `rentals` (`user_id`,`tutor_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tutor_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`started` integer NOT NULL,
	`completed` integer,
	`score` integer,
	`answers` text,
	`pending` text,
	`pending_at` integer
);
--> statement-breakpoint
CREATE INDEX `session_owner` ON `sessions` (`user_id`,`started`);
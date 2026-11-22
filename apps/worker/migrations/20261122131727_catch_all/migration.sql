CREATE TABLE `catch_all_days` (
	`domain_id` text NOT NULL,
	`day` text NOT NULL,
	`created` integer DEFAULT 0 NOT NULL,
	`rejected` integer DEFAULT 0 NOT NULL,
	`reported_at` integer,
	CONSTRAINT `catch_all_days_pk` PRIMARY KEY(`domain_id`, `day`),
	CONSTRAINT `fk_catch_all_days_domain_id_domains_id_fk` FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `domains` ADD `catch_all_destination_id` text REFERENCES destinations(id) ON DELETE SET NULL;
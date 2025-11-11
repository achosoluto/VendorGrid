PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_access_logs` (
	`id` text PRIMARY KEY DEFAULT randomUUID()() NOT NULL,
	`vendor_profile_id` text NOT NULL,
	`accessor_id` text NOT NULL,
	`accessor_name` text NOT NULL,
	`accessor_company` text NOT NULL,
	`action` text NOT NULL,
	`timestamp` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`vendor_profile_id`) REFERENCES `vendor_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_access_logs`("id", "vendor_profile_id", "accessor_id", "accessor_name", "accessor_company", "action", "timestamp") SELECT "id", "vendor_profile_id", "accessor_id", "accessor_name", "accessor_company", "action", "timestamp" FROM `access_logs`;--> statement-breakpoint
DROP TABLE `access_logs`;--> statement-breakpoint
ALTER TABLE `__new_access_logs` RENAME TO `access_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_audit_logs` (
	`id` text PRIMARY KEY DEFAULT randomUUID()() NOT NULL,
	`vendor_profile_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`field_changed` text,
	`old_value` text,
	`new_value` text,
	`timestamp` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`immutable` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`vendor_profile_id`) REFERENCES `vendor_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_audit_logs`("id", "vendor_profile_id", "action", "actor_id", "actor_name", "field_changed", "old_value", "new_value", "timestamp", "immutable") SELECT "id", "vendor_profile_id", "action", "actor_id", "actor_name", "field_changed", "old_value", "new_value", "timestamp", "immutable" FROM `audit_logs`;--> statement-breakpoint
DROP TABLE `audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
CREATE TABLE `__new_claim_tokens` (
	`id` text PRIMARY KEY DEFAULT randomUUID()() NOT NULL,
	`vendor_profile_id` text NOT NULL,
	`token` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`claimed_at` integer,
	`claimed_by_user_id` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`vendor_profile_id`) REFERENCES `vendor_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claimed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_claim_tokens`("id", "vendor_profile_id", "token", "email", "expires_at", "claimed_at", "claimed_by_user_id", "attempts", "max_attempts", "created_at") SELECT "id", "vendor_profile_id", "token", "email", "expires_at", "claimed_at", "claimed_by_user_id", "attempts", "max_attempts", "created_at" FROM `claim_tokens`;--> statement-breakpoint
DROP TABLE `claim_tokens`;--> statement-breakpoint
ALTER TABLE `__new_claim_tokens` RENAME TO `claim_tokens`;--> statement-breakpoint
CREATE UNIQUE INDEX `claim_tokens_token_unique` ON `claim_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `__new_data_provenance` (
	`id` text PRIMARY KEY DEFAULT randomUUID()() NOT NULL,
	`vendor_profile_id` text NOT NULL,
	`field_name` text NOT NULL,
	`source` text NOT NULL,
	`method` text NOT NULL,
	`timestamp` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`vendor_profile_id`) REFERENCES `vendor_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_data_provenance`("id", "vendor_profile_id", "field_name", "source", "method", "timestamp") SELECT "id", "vendor_profile_id", "field_name", "source", "method", "timestamp" FROM `data_provenance`;--> statement-breakpoint
DROP TABLE `data_provenance`;--> statement-breakpoint
ALTER TABLE `__new_data_provenance` RENAME TO `data_provenance`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY DEFAULT randomUUID()() NOT NULL,
	`email` text,
	`first_name` text,
	`last_name` text,
	`profile_image_url` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "first_name", "last_name", "profile_image_url", "created_at", "updated_at") SELECT "id", "email", "first_name", "last_name", "profile_image_url", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `__new_vendor_profiles` (
	`id` text PRIMARY KEY DEFAULT randomUUID()() NOT NULL,
	`user_id` text,
	`company_name` text NOT NULL,
	`tax_id` text NOT NULL,
	`business_number` text,
	`gst_hst_number` text,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`zip_code` text NOT NULL,
	`country` text DEFAULT 'CA' NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`website` text,
	`legal_structure` text,
	`industry_code` text,
	`industry_description` text,
	`bank_name` text,
	`account_number_encrypted` text,
	`routing_number_encrypted` text,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`data_source` text DEFAULT 'manual',
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_vendor_profiles`("id", "user_id", "company_name", "tax_id", "business_number", "gst_hst_number", "address", "city", "state", "zip_code", "country", "phone", "email", "website", "legal_structure", "industry_code", "industry_description", "bank_name", "account_number_encrypted", "routing_number_encrypted", "verification_status", "data_source", "is_active", "created_at", "updated_at") SELECT "id", "user_id", "company_name", "tax_id", "business_number", "gst_hst_number", "address", "city", "state", "zip_code", "country", "phone", "email", "website", "legal_structure", "industry_code", "industry_description", "bank_name", "account_number_encrypted", "routing_number_encrypted", "verification_status", "data_source", "is_active", "created_at", "updated_at" FROM `vendor_profiles`;--> statement-breakpoint
DROP TABLE `vendor_profiles`;--> statement-breakpoint
ALTER TABLE `__new_vendor_profiles` RENAME TO `vendor_profiles`;--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_profiles_tax_id_unique` ON `vendor_profiles` (`tax_id`);--> statement-breakpoint
CREATE TABLE `__new_verification_requests` (
	`id` text PRIMARY KEY DEFAULT randomUUID()() NOT NULL,
	`vendor_profile_id` text NOT NULL,
	`request_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`verification_method` text,
	`verification_data` text,
	`verified_at` integer,
	`failure_reason` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`max_retries` integer DEFAULT 3 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`vendor_profile_id`) REFERENCES `vendor_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_verification_requests`("id", "vendor_profile_id", "request_type", "status", "verification_method", "verification_data", "verified_at", "failure_reason", "retry_count", "max_retries", "created_at", "updated_at") SELECT "id", "vendor_profile_id", "request_type", "status", "verification_method", "verification_data", "verified_at", "failure_reason", "retry_count", "max_retries", "created_at", "updated_at" FROM `verification_requests`;--> statement-breakpoint
DROP TABLE `verification_requests`;--> statement-breakpoint
ALTER TABLE `__new_verification_requests` RENAME TO `verification_requests`;
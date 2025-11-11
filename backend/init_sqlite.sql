-- SQLite schema for VendorGrid application
-- This file creates all the required tables for the application

PRAGMA foreign_keys = ON;

-- Session storage table (required for Replit Auth)
CREATE TABLE IF NOT EXISTS `sessions` (
  `sid` text PRIMARY KEY,
  `sess` text NOT NULL,
  `expire` integer NOT NULL
);

-- Index for session expiration
CREATE INDEX IF NOT EXISTS `IDX_session_expire` ON `sessions` (`expire`);

-- User storage table (required for Replit Auth)
CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  `email` text,
  `first_name` text,
  `last_name` text,
  `profile_image_url` text,
  `created_at` integer DEFAULT (strftime('%s', 'now')),
  `updated_at` integer DEFAULT (strftime('%s', 'now'))
);

-- Unique index for user email
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);

-- Vendor profiles table
CREATE TABLE IF NOT EXISTS `vendor_profiles` (
  `id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
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
  `created_at` integer DEFAULT (strftime('%s', 'now')),
  `updated_at` integer DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Unique index for vendor tax ID
CREATE UNIQUE INDEX IF NOT EXISTS `vendor_profiles_tax_id_unique` ON `vendor_profiles` (`tax_id`);

-- Audit log table (immutable)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  `vendor_profile_id` text NOT NULL,
  `action` text NOT NULL,
  `actor_id` text NOT NULL,
  `actor_name` text NOT NULL,
  `field_changed` text,
  `old_value` text,
  `new_value` text,
  `timestamp` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  `immutable` integer DEFAULT true NOT NULL,
  FOREIGN KEY (`vendor_profile_id`) REFERENCES `vendor_profiles`(`id`) ON DELETE CASCADE
);

-- Access log table
CREATE TABLE IF NOT EXISTS `access_logs` (
  `id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  `vendor_profile_id` text NOT NULL,
  `accessor_id` text NOT NULL,
  `accessor_name` text NOT NULL,
  `accessor_company` text NOT NULL,
  `action` text NOT NULL,
  `timestamp` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  FOREIGN KEY (`vendor_profile_id`) REFERENCES `vendor_profiles`(`id`) ON DELETE CASCADE
);

-- Data provenance table
CREATE TABLE IF NOT EXISTS `data_provenance` (
  `id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  `vendor_profile_id` text NOT NULL,
  `field_name` text NOT NULL,
  `source` text NOT NULL,
  `method` text NOT NULL,
  `timestamp` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  FOREIGN KEY (`vendor_profile_id`) REFERENCES `vendor_profiles`(`id`) ON DELETE CASCADE
);

-- Vendor claim tokens for secure profile claiming
CREATE TABLE IF NOT EXISTS `claim_tokens` (
  `id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  `vendor_profile_id` text NOT NULL,
  `token` text NOT NULL,
  `email` text NOT NULL,
  `expires_at` integer NOT NULL,
  `claimed_at` integer,
  `claimed_by_user_id` text,
  `attempts` integer DEFAULT 0 NOT NULL,
  `max_attempts` integer DEFAULT 3 NOT NULL,
  `created_at` integer DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (`vendor_profile_id`) REFERENCES `vendor_profiles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`claimed_by_user_id`) REFERENCES `users`(`id`)
);

-- Unique index for claim tokens
CREATE UNIQUE INDEX IF NOT EXISTS `claim_tokens_token_unique` ON `claim_tokens` (`token`);

-- Vendor verification requests and status tracking
CREATE TABLE IF NOT EXISTS `verification_requests` (
  `id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  `vendor_profile_id` text NOT NULL,
  `request_type` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `verification_method` text,
  `verification_data` text,
  `verified_at` integer,
  `failure_reason` text,
  `retry_count` integer DEFAULT 0 NOT NULL,
  `max_retries` integer DEFAULT 3 NOT NULL,
  `created_at` integer DEFAULT (strftime('%s', 'now')),
  `updated_at` integer DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (`vendor_profile_id`) REFERENCES `vendor_profiles`(`id`) ON DELETE CASCADE
);

-- Initialize Drizzle migrations table
CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

PRAGMA foreign_keys = ON;
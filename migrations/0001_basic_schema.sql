-- Simplified migration for basic SQLite compatibility

-- Enable foreign keys
PRAGMA foreign_keys=ON;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- Create vendor_profiles table
CREATE TABLE IF NOT EXISTS vendor_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  company_name TEXT NOT NULL,
  tax_id TEXT NOT NULL UNIQUE,
  business_number TEXT,
  gst_hst_number TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'CA',
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  legal_structure TEXT,
  industry_code TEXT,
  industry_description TEXT,
  bank_name TEXT,
  account_number_encrypted TEXT,
  routing_number_encrypted TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  data_source TEXT DEFAULT 'manual',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expire INTEGER NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
CREATE INDEX IF NOT EXISTS vendor_profiles_user_id_idx ON vendor_profiles (user_id);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  vendor_profile_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  timestamp INTEGER NOT NULL,
  immutable INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (vendor_profile_id) REFERENCES vendor_profiles(id) ON DELETE CASCADE
);

-- Create access_logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id TEXT PRIMARY KEY,
  vendor_profile_id TEXT NOT NULL,
  accessor_id TEXT NOT NULL,
  accessor_name TEXT NOT NULL,
  accessor_company TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (vendor_profile_id) REFERENCES vendor_profiles(id) ON DELETE CASCADE
);

-- Create data_provenance table
CREATE TABLE IF NOT EXISTS data_provenance (
  id TEXT PRIMARY KEY,
  vendor_profile_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  source TEXT NOT NULL,
  method TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (vendor_profile_id) REFERENCES vendor_profiles(id) ON DELETE CASCADE
);

-- Create claim_tokens table
CREATE TABLE IF NOT EXISTS claim_tokens (
  id TEXT PRIMARY KEY,
  vendor_profile_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_at INTEGER,
  claimed_by_user_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER,
  FOREIGN KEY (vendor_profile_id) REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (claimed_by_user_id) REFERENCES users(id)
);

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id TEXT PRIMARY KEY,
  vendor_profile_id TEXT NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_method TEXT,
  verification_data TEXT,
  verified_at INTEGER,
  failure_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (vendor_profile_id) REFERENCES vendor_profiles(id) ON DELETE CASCADE
);
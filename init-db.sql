-- VendorGrid Database Initialization
-- This file sets up the initial database configuration

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for performance (these will be created by Drizzle, but good to have)
-- The actual tables will be created by the Drizzle schema push

-- Log the database initialization
DO $$
BEGIN
    RAISE NOTICE 'VendorGrid database initialized successfully';
END
$$;
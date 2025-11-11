import { defineConfig } from "drizzle-kit";

// Hybrid database configuration - auto-detect based on environment
let dialect: 'sqlite' | 'postgresql' = 'sqlite';
let dbCredentials: any = {};

if (!process.env.DATABASE_URL) {
  // No DATABASE_URL - use SQLite for zero-friction setup
  dialect = 'sqlite';
  dbCredentials = {
    url: "./backend/vendors.db",
  };
  console.log('📁 Drizzle Config: Using SQLite database');
} else {
  // DATABASE_URL is set - use PostgreSQL
  dialect = 'postgresql';
  dbCredentials = {
    url: process.env.DATABASE_URL,
  };
  console.log('🐘 Drizzle Config: Using PostgreSQL database');
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: dialect,
  dbCredentials: dbCredentials,
  // Enable verbose logging for debugging
  verbose: true,
  // Strict mode for better type safety
  strict: true,
});

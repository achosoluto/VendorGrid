import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@shared/schema';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Ensure backend directory exists
const dbPath = './backend/vendors.db';
const backendDir = dirname(dbPath);
if (!existsSync(backendDir)) {
  mkdirSync(backendDir, { recursive: true });
}

// Create a new SQLite database instance
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

// Run migrations to create tables
console.log('Running database migrations...');

try {
  // Run pending migrations
  migrate(db, { migrationsFolder: './migrations' });
  console.log('✅ Database migrations completed successfully!');
  console.log('Database file created at:', dbPath);
} catch (error) {
  console.error('❌ Error running migrations:', error);
  
  // Close the database connection before exiting
  sqlite.close();
  process.exit(1);
}

sqlite.close();
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { Client } from 'pg';
import Database from 'better-sqlite3';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Determine database type: Neon, PostgreSQL, or SQLite
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('amazonaws.com');
const isSqliteDatabase = process.env.DATABASE_URL.includes('sqlite');

let db: any;

if (isNeonDatabase) {
  // Use Neon serverless driver for cloud databases
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else if (isSqliteDatabase) {
  // Use SQLite for local development
  const sqlite = new Database(process.env.DATABASE_URL.replace('sqlite+aiosqlite:///', ''));
  db = drizzleSqlite(sqlite, { schema });
} else {
  // Use regular PostgreSQL driver for local databases
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  db = drizzlePg(client, { schema });
}

export { db };

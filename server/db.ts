import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { Client } from 'pg';
import Database from 'better-sqlite3';
import ws from "ws";
import * as schema from "@shared/schema";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

// Auto-detection logic: Use SQLite when no DATABASE_URL is set, PostgreSQL when it is set
let db: any;
let dbType: 'sqlite' | 'postgresql' = 'sqlite';
let connectionInfo = '';

try {
  if (!process.env.DATABASE_URL) {
    // No DATABASE_URL - use SQLite for zero-friction startup
    dbType = 'sqlite';
    const dbPath = './backend/vendors.db';
    
    // Ensure backend directory exists
    const backendDir = dirname(dbPath);
    if (!existsSync(backendDir)) {
      mkdirSync(backendDir, { recursive: true });
    }
    
    const sqlite = new Database(dbPath);
    db = drizzleSqlite(sqlite, { schema });
    connectionInfo = `SQLite database at ${dbPath}`;
    console.log(`📁 Using SQLite database: ${dbPath}`);
  } else {
    // DATABASE_URL is set - use PostgreSQL
    dbType = 'postgresql';
    
    // Determine database type: Neon, PostgreSQL, or SQLite URL
    const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('amazonaws.com');
    const isSqliteDatabase = process.env.DATABASE_URL.includes('sqlite');
    
    if (isNeonDatabase) {
      // Use Neon serverless driver for cloud databases
      neonConfig.webSocketConstructor = ws;
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      db = drizzle({ client: pool, schema });
      connectionInfo = `Neon/Cloud database connection`;
      console.log(`☁️ Using Neon/Cloud PostgreSQL database`);
    } else if (isSqliteDatabase) {
      // Use SQLite with DATABASE_URL (e.g., sqlite+aiosqlite:///path/to/db.db)
      const sqlitePath = process.env.DATABASE_URL.replace('sqlite+aiosqlite:///', '');
      const sqlite = new Database(sqlitePath);
      db = drizzleSqlite(sqlite, { schema });
      connectionInfo = `SQLite database at ${sqlitePath}`;
      console.log(`📁 Using SQLite database: ${sqlitePath}`);
    } else {
      // Use regular PostgreSQL driver for local databases
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      db = drizzlePg(client, { schema });
      connectionInfo = `PostgreSQL database connection`;
      console.log(`🐘 Using PostgreSQL database`);
    }
  }
  
  // Log successful connection
  console.log(`✅ Database connection established: ${connectionInfo}`);
  console.log(`🔧 Database type: ${dbType}`);
  
} catch (error) {
  console.error('❌ Database connection failed:', error);
  console.error('Please check your DATABASE_URL environment variable or ensure SQLite is available');
  throw error;
}

export { db, dbType };
export default db;

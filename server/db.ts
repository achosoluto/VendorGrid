// Load environment variables first
import "./env";

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const isLocalDevMode = process.env.LOCAL_DEV_MODE === 'true';

if (!process.env.DATABASE_URL && !isLocalDevMode) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// In local dev mode without DATABASE_URL, use a placeholder
// The storage layer will handle mock data
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/mock';

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });

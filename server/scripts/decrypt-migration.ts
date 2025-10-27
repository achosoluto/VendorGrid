/**
 * Decrypt Migration Script
 * 
 * This script decrypts all encrypted banking information from vendor profiles
 * using the current SESSION_SECRET. Output is written to stdout as JSON.
 * 
 * WARNING: Output contains sensitive plaintext banking data!
 * 
 * Usage:
 *   tsx server/scripts/decrypt-migration.ts > decrypted-data.json
 * 
 * Prerequisites:
 *   - SESSION_SECRET must be set in environment (current/old key)
 *   - DATABASE_URL must be set in environment
 */

import { Pool } from '@neondatabase/serverless';
import { decrypt } from '../encryption';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface DecryptedRecord {
  id: string;
  accountNumber: string | null;
  routingNumber: string | null;
}

async function decryptAll(): Promise<void> {
  try {
    // Verify SESSION_SECRET is set
    if (!process.env.SESSION_SECRET) {
      console.error('ERROR: SESSION_SECRET environment variable not set');
      process.exit(1);
    }

    // Query all vendor profiles with encrypted banking data
    const result = await pool.query(`
      SELECT 
        id,
        account_number_encrypted,
        routing_number_encrypted
      FROM vendor_profiles
      WHERE account_number_encrypted IS NOT NULL
         OR routing_number_encrypted IS NOT NULL
    `);

    if (result.rows.length === 0) {
      console.error('No encrypted records found to decrypt');
      process.exit(0);
    }

    const decrypted: DecryptedRecord[] = [];

    // Decrypt each record
    for (const row of result.rows) {
      try {
        const record: DecryptedRecord = {
          id: row.id,
          accountNumber: row.account_number_encrypted ? decrypt(row.account_number_encrypted) : null,
          routingNumber: row.routing_number_encrypted ? decrypt(row.routing_number_encrypted) : null,
        };
        decrypted.push(record);
      } catch (error: any) {
        console.error(`ERROR decrypting record ${row.id}: ${error.message}`);
        process.exit(1);
      }
    }

    // Output as JSON to stdout
    console.log(JSON.stringify(decrypted, null, 2));

    await pool.end();
  } catch (error: any) {
    console.error(`FATAL ERROR: ${error.message}`);
    process.exit(1);
  }
}

decryptAll();

/**
 * Re-encryption Migration Script
 * 
 * This script re-encrypts banking information using the new SESSION_SECRET.
 * Reads decrypted data from JSON file and updates the database.
 * 
 * WARNING: This modifies production data!
 * 
 * Usage:
 *   tsx server/scripts/reencrypt-migration.ts decrypted-data.json
 * 
 * Prerequisites:
 *   - SESSION_SECRET must be set to NEW key value
 *   - DATABASE_URL must be set in environment
 *   - decrypted-data.json must exist (from decrypt-migration.ts)
 */

import { Pool } from '@neondatabase/serverless';
import { encrypt } from '../encryption';
import * as fs from 'fs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface DecryptedRecord {
  id: string;
  accountNumber: string | null;
  routingNumber: string | null;
}

async function reencryptAll(inputFile: string): Promise<void> {
  try {
    // Verify SESSION_SECRET is set
    if (!process.env.SESSION_SECRET) {
      console.error('ERROR: SESSION_SECRET environment variable not set');
      process.exit(1);
    }

    // Verify input file exists
    if (!fs.existsSync(inputFile)) {
      console.error(`ERROR: Input file not found: ${inputFile}`);
      process.exit(1);
    }

    // Load decrypted data
    const fileContent = fs.readFileSync(inputFile, 'utf8');
    const decryptedData: DecryptedRecord[] = JSON.parse(fileContent);

    if (!Array.isArray(decryptedData) || decryptedData.length === 0) {
      console.error('ERROR: Input file contains no records or invalid format');
      process.exit(1);
    }

    console.log(`Starting re-encryption of ${decryptedData.length} records...`);

    let successCount = 0;
    let errorCount = 0;

    // Re-encrypt and update each record
    for (const record of decryptedData) {
      try {
        // Encrypt with new key
        const accountEncrypted = record.accountNumber ? encrypt(record.accountNumber) : null;
        const routingEncrypted = record.routingNumber ? encrypt(record.routingNumber) : null;

        // Update database
        await pool.query(`
          UPDATE vendor_profiles
          SET 
            account_number_encrypted = $1,
            routing_number_encrypted = $2,
            updated_at = NOW()
          WHERE id = $3
        `, [accountEncrypted, routingEncrypted, record.id]);

        successCount++;
        console.log(`✓ Re-encrypted record ${record.id} (${successCount}/${decryptedData.length})`);
      } catch (error: any) {
        errorCount++;
        console.error(`✗ ERROR re-encrypting record ${record.id}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Re-encryption Summary:');
    console.log('='.repeat(50));
    console.log(`Total records: ${decryptedData.length}`);
    console.log(`✓ Success: ${successCount}`);
    console.log(`✗ Errors: ${errorCount}`);

    if (errorCount > 0) {
      console.error('\nWARNING: Some records failed to re-encrypt!');
      console.error('Review errors above and manual intervention may be required.');
      process.exit(1);
    } else {
      console.log('\n✓ All records successfully re-encrypted!');
    }

    await pool.end();
  } catch (error: any) {
    console.error(`FATAL ERROR: ${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: tsx server/scripts/reencrypt-migration.ts <decrypted-data.json>');
  process.exit(1);
}

reencryptAll(args[0]);

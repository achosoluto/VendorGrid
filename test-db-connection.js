import Database from 'better-sqlite3';
const db = new Database('./backend/vendors.db');

try {
  // Try a simple query with a prepared statement to avoid SQL injection issues
  console.log('Testing direct database query...');
  const stmt = db.prepare('SELECT * FROM vendor_profiles WHERE tax_id = ? LIMIT 1');
  const result = stmt.get('123456789');
  console.log('Query result:', result);
  console.log('Direct database connection works fine');
} catch (error) {
  console.error('Direct database error:', error.message);
}
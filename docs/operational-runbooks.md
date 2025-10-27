# Operational Runbooks

This document provides step-by-step procedures for critical operational tasks in the Vendor Network Platform.

## Table of Contents

1. [SESSION_SECRET Rotation](#session_secret-rotation)
2. [Audit Trail Review](#audit-trail-review)
3. [Encryption Key Management](#encryption-key-management)
4. [Database Backup and Recovery](#database-backup-and-recovery)
5. [Security Incident Response](#security-incident-response)

---

## SESSION_SECRET Rotation

### Purpose
The `SESSION_SECRET` is used for both session encryption and data encryption (banking information). 

### Important: Current Architecture Limitations
⚠️ **The current system does NOT support seamless SESSION_SECRET rotation** because:
1. All encrypted data uses the same key
2. Changing the key breaks decryption of existing data
3. Rotation requires a database-wide re-encryption migration

### Session Encryption vs Data Encryption
- **Session encryption**: Sessions naturally expire (handled by express-session)
- **Data encryption**: Banking information persists indefinitely and requires the same key

### When Rotation is Required
- **Suspected key compromise**: Immediate emergency procedure required
- **Regulatory requirement**: Only if specifically mandated by auditor

### Emergency Rotation Procedure (Key Compromise)

⚠️ **WARNING**: This procedure requires full application downtime and database migration.

#### Prerequisites
- Database backup completed and verified
- Maintenance window scheduled (1-2 hours minimum)
- All users notified of downtime
- New SESSION_SECRET generated: `openssl rand -base64 32`

#### Step 1: Create Maintenance Window
```bash
# Stop application
# Display maintenance page to users
```

#### Step 2: Export Encrypted Data (Optional Backup)
```bash
# Optional: Create CSV backup of encrypted data before decryption
# This allows you to verify the data hasn't changed during migration
psql $DATABASE_URL -c "\COPY (
  SELECT id, account_number_encrypted, routing_number_encrypted
  FROM vendor_profiles
  WHERE account_number_encrypted IS NOT NULL
) TO './encrypted-data-backup.csv' WITH CSV HEADER"
```

**Note**: This is optional - the decrypt script (next step) will read directly from database.

#### Step 3: Decrypt Data Using Current Key
```typescript
// server/scripts/decrypt-migration.ts
import { Pool } from '@neondatabase/serverless';
import { decrypt } from '../encryption';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function decryptAll() {
  const result = await pool.query(`
    SELECT id, account_number_encrypted, routing_number_encrypted
    FROM vendor_profiles
    WHERE account_number_encrypted IS NOT NULL
  `);

  const decrypted = result.rows.map(row => ({
    id: row.id,
    accountNumber: decrypt(row.account_number_encrypted),
    routingNumber: decrypt(row.routing_number_encrypted),
  }));

  console.log(JSON.stringify(decrypted, null, 2));
}

decryptAll();
```

Run:
```bash
tsx server/scripts/decrypt-migration.ts > decrypted-data.json
# Verify output contains plaintext banking data
# Store this file SECURELY - it contains sensitive data
```

#### Step 4: Update SESSION_SECRET
```bash
# In Replit Secrets:
# 1. Update SESSION_SECRET with new value
# 2. Restart application (do NOT make public yet)
```

#### Step 5: Re-encrypt Data with New Key
```typescript
// server/scripts/reencrypt-migration.ts
import { Pool } from '@neondatabase/serverless';
import { encrypt } from '../encryption';
import * as fs from 'fs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const decryptedData = JSON.parse(fs.readFileSync('decrypted-data.json', 'utf8'));

async function reencryptAll() {
  for (const record of decryptedData) {
    const accountEncrypted = encrypt(record.accountNumber);
    const routingEncrypted = encrypt(record.routingNumber);
    
    await pool.query(`
      UPDATE vendor_profiles
      SET account_number_encrypted = $1,
          routing_number_encrypted = $2
      WHERE id = $3
    `, [accountEncrypted, routingEncrypted, record.id]);
  }
  console.log(`Re-encrypted ${decryptedData.length} records`);
}

reencryptAll();
```

Run:
```bash
tsx server/scripts/reencrypt-migration.ts
```

#### Step 6: Verification
```bash
# Test sample vendor profile decryption
psql $DATABASE_URL -c "SELECT id FROM vendor_profiles LIMIT 1;"
# Use profile ID in API test

curl -H "Authorization: Bearer $TOKEN" \
  https://your-app.replit.app/api/vendor-profile/$PROFILE_ID

# Verify banking information displays correctly
```

#### Step 7: Clean Up
```bash
# Securely delete temporary files
shred -u decrypted-data.json
shred -u encrypted-data.csv

# Clear old SESSION_SECRET from secure vault after 7 days
# (Keep for emergency rollback)
```

#### Step 8: Resume Operations
```bash
# Make application public
# Monitor error logs for decryption failures
# Send all-clear notification to users
```

### Rollback Procedure
If decryption failures occur:

1. **Stop application immediately**
2. **Restore SESSION_SECRET to old value**
3. **Restart application**
4. **Restore database from pre-rotation backup if data was corrupted**
5. **Schedule post-mortem to determine failure cause**

### Prevention: Key Versioning (Future Enhancement)
To enable seamless rotation, implement:
1. Key versioning system (store key version with each encrypted field)
2. Multi-key decryption support (support old keys for decryption)
3. Lazy re-encryption (re-encrypt on next write with new key)

This requires architectural changes and is recommended for future releases.

### Session-Only Rotation (Safe)
For session encryption rotation without data re-encryption:

1. **Rotate key**: Update SESSION_SECRET
2. **Impact**: All users logged out (sessions invalidated)
3. **No data migration needed**: Banking data unaffected
4. **Downtime**: Minimal (application restart only)

---

## Audit Trail Review

### Purpose
Regular audit trail reviews ensure data integrity, detect unauthorized access, and support compliance requirements (SOC 2, GDPR, PCI DSS).

### Review Schedule
- **Daily**: Automated alerts for suspicious activity
- **Weekly**: Manual review of high-risk actions
- **Monthly**: Comprehensive compliance review
- **Quarterly**: External audit preparation

### Access Audit Log Data

#### Via API (Vendor Users)
```bash
# Export all audit logs for a vendor profile
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-app.replit.app/api/vendor-profile/$PROFILE_ID/audit-logs/export?format=json" \
  -o audit-logs-$(date +%Y-%m-%d).json
```

#### Via Database (Administrators)
```sql
-- View all audit logs for last 7 days
SELECT 
  al.timestamp,
  al.action,
  al.actor_name,
  vp.company_name,
  al.field_changed,
  al.old_value,
  al.new_value
FROM audit_logs al
JOIN vendor_profiles vp ON al.vendor_profile_id = vp.id
WHERE al.timestamp > NOW() - INTERVAL '7 days'
ORDER BY al.timestamp DESC;
```

### Key Actions to Monitor

#### 1. Profile Creation
**Red Flags**:
- Multiple profiles created from same IP in short time
- Profile with suspicious company name or Tax ID format
- Creation outside business hours

**Query**:
```sql
SELECT * FROM audit_logs
WHERE action = 'claimed vendor profile'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

#### 2. Banking Information Updates
**Red Flags**:
- Frequent changes to banking details
- Changes from new/untrusted devices
- Multiple failed decryption attempts

**Query**:
```sql
SELECT * FROM audit_logs
WHERE field_changed IN ('accountNumberEncrypted', 'routingNumberEncrypted', 'bankName')
  AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

#### 3. Tax ID Changes (Should Never Happen)
**Red Flags**:
- ANY Tax ID modification after profile creation
- This should be flagged as critical security event

**Query**:
```sql
SELECT * FROM audit_logs
WHERE field_changed = 'taxId'
ORDER BY timestamp DESC;
```

**Action**: If any results found, immediately:
1. Lock affected vendor account
2. Contact vendor to verify legitimacy
3. Escalate to security team

#### 4. Bulk Profile Access
**Red Flags**:
- Single user accessing many profiles rapidly
- Access from unusual geographic locations
- Access outside normal business patterns

**Query**:
```sql
SELECT accessor_id, accessor_name, COUNT(*) as access_count
FROM access_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY accessor_id, accessor_name
HAVING COUNT(*) > 10
ORDER BY access_count DESC;
```

### Compliance Review Checklist

#### Weekly Review
- [ ] Review all banking information changes
- [ ] Check for failed login attempts
- [ ] Verify no Tax ID modifications occurred
- [ ] Review high-volume profile access patterns

#### Monthly Review
- [ ] Export complete audit logs for month
- [ ] Generate summary report of all profile changes
- [ ] Review access logs for unusual patterns
- [ ] Document any security incidents
- [ ] Update security metrics dashboard

#### Quarterly Review (External Audit Preparation)
- [ ] Export all audit logs for quarter in JSON format
- [ ] Generate CSV summary for auditors
- [ ] Document all security incidents and resolutions
- [ ] Verify audit log immutability (no deletions/modifications)
- [ ] Prepare data provenance report
- [ ] Review and update this runbook

### Automated Alerting

Set up alerts for critical events:

```sql
-- Create a view for suspicious activity
CREATE OR REPLACE VIEW suspicious_audit_activity AS
SELECT 
  al.*,
  vp.company_name,
  CASE
    WHEN al.field_changed = 'taxId' THEN 'CRITICAL: Tax ID change'
    WHEN al.field_changed LIKE '%Encrypted%' THEN 'HIGH: Banking info change'
    WHEN al.action LIKE '%delete%' THEN 'HIGH: Deletion attempt'
    ELSE 'NORMAL'
  END as severity
FROM audit_logs al
JOIN vendor_profiles vp ON al.vendor_profile_id = vp.id
WHERE al.timestamp > NOW() - INTERVAL '1 hour';

-- Schedule this query to run hourly and send alerts
```

---

## Encryption Key Management

### Key Hierarchy
```
SESSION_SECRET (environment variable)
  └─> Derived per-encryption keys using scrypt
      └─> Unique salt per encryption operation
          └─> Unique IV per encryption operation
```

### Key Generation
```bash
# Generate new SESSION_SECRET
openssl rand -base64 32

# Example output: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

### Storage Requirements
- **Production**: Store in Replit Secrets or secure key management service
- **Development**: Store in `.env` file (never commit to git)
- **Backup**: Store in enterprise password manager or HSM

### Access Control
- **Who can access**: Only platform administrators
- **Audit**: Log all access to SESSION_SECRET
- **Rotation**: Follow SESSION_SECRET Rotation procedure

---

## Database Backup and Recovery

### Backup Strategy

#### Automatic Backups (Neon)
Neon PostgreSQL provides:
- **Continuous backups**: Automatic WAL archiving
- **Point-in-time recovery (PITR)**: Restore to any second within retention period
- **Retention**: Depends on Neon plan (7-30 days typically)
- **Access**: Via Neon Console or API

#### Manual Export Backups
For compliance and long-term retention:

**Export All Tables** (recommended before major changes):
```bash
# Set variables
BACKUP_DATE=$(date +%Y-%m-%d-%H%M%S)
BACKUP_DIR="./backups/$BACKUP_DATE"
mkdir -p "$BACKUP_DIR"

# Export each table
psql $DATABASE_URL -c "\COPY vendor_profiles TO '$BACKUP_DIR/vendor_profiles.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY audit_logs TO '$BACKUP_DIR/audit_logs.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY access_logs TO '$BACKUP_DIR/access_logs.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY data_provenance TO '$BACKUP_DIR/data_provenance.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY users TO '$BACKUP_DIR/users.csv' CSV HEADER"

# Create backup metadata
echo "Backup Date: $BACKUP_DATE" > "$BACKUP_DIR/metadata.txt"
echo "Database: $(psql $DATABASE_URL -t -c 'SELECT current_database()')" >> "$BACKUP_DIR/metadata.txt"
echo "Total Records:" >> "$BACKUP_DIR/metadata.txt"
psql $DATABASE_URL -c "SELECT 'vendor_profiles' as table_name, COUNT(*) FROM vendor_profiles
                       UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
                       UNION ALL SELECT 'users', COUNT(*) FROM users;"

# Compress (do NOT encrypt - data already encrypted in database)
tar czf "backup-$BACKUP_DATE.tar.gz" -C ./backups "$BACKUP_DATE"
```

**Compliance Audit Exports** (quarterly):
```bash
# Export audit logs as JSON for compliance team
QUARTER="2025-Q4"
START_DATE="2025-10-01"
END_DATE="2025-12-31"

psql $DATABASE_URL -c "
  COPY (
    SELECT 
      al.*,
      vp.company_name,
      vp.tax_id
    FROM audit_logs al
    JOIN vendor_profiles vp ON al.vendor_profile_id = vp.id
    WHERE al.timestamp BETWEEN '$START_DATE' AND '$END_DATE'
    ORDER BY al.timestamp
  ) TO STDOUT WITH (FORMAT csv, HEADER true)
" > "audit-logs-$QUARTER.csv"
```

### Recovery Procedures

#### Point-in-Time Recovery (Neon PITR)

**When to use**: Accidental data deletion, corruption, or to recover from security incident

**Procedure**:
1. **Identify recovery timestamp**:
   ```sql
   -- Find last known good state
   SELECT MAX(timestamp) FROM audit_logs WHERE action = 'claimed vendor profile';
   ```

2. **Create recovery branch** (via Neon Console):
   - Navigate to Neon Console
   - Select database
   - Click "Restore" or "Create Branch"
   - Choose timestamp (e.g., "2025-09-30 14:30:00")
   - Name: "recovery-[date]-[incident]"

3. **Update connection string** (temporarily):
   ```bash
   # In Replit Secrets, temporarily update DATABASE_URL
   # Point to recovery branch connection string
   # Restart application
   ```

4. **Verify data**:
   ```sql
   -- Check vendor profiles count
   SELECT COUNT(*) FROM vendor_profiles;
   
   -- Verify specific records
   SELECT * FROM vendor_profiles WHERE company_name = 'Expected Company';
   
   -- Check audit logs
   SELECT COUNT(*) FROM audit_logs;
   ```

5. **Merge or promote**:
   - If verified: Promote recovery branch to primary
   - If still issues: Create new recovery point
   - Document incident and resolution

#### Manual Restore from CSV Backup

**When to use**: Recovery beyond PITR retention, compliance requirements

**Procedure**:
```bash
# Extract backup
tar xzf backup-2025-09-30-120000.tar.gz

# Restore vendor profiles (example)
psql $DATABASE_URL -c "
  CREATE TEMP TABLE vendor_profiles_backup (LIKE vendor_profiles INCLUDING ALL);
  
  \COPY vendor_profiles_backup FROM './2025-09-30-120000/vendor_profiles.csv' CSV HEADER;
  
  -- Verify count
  SELECT COUNT(*) FROM vendor_profiles_backup;
  
  -- If verified, replace or merge data
  -- CAREFUL: This can overwrite current data
  -- INSERT INTO vendor_profiles SELECT * FROM vendor_profiles_backup WHERE ...
"
```

#### Emergency: Complete Database Recovery

**When to use**: Catastrophic failure, complete data loss

1. **Contact Neon Support** immediately
2. **Stop all write operations** to prevent further data loss
3. **Restore from most recent backup**:
   - PITR if within retention
   - Manual backup otherwise
4. **Verify data integrity**:
   ```sql
   -- Run integrity checks
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM vendor_profiles;
   SELECT COUNT(*) FROM audit_logs;
   
   -- Verify relationships
   SELECT COUNT(*) FROM vendor_profiles vp
   LEFT JOIN users u ON vp.user_id = u.id
   WHERE u.id IS NULL; -- Should be 0
   ```
5. **Resume operations** only after full verification

### Backup Best Practices

1. **Schedule**: Daily automated backups during low-traffic periods
2. **Storage**: Store backups in separate location from database (e.g., S3)
3. **Retention**: Keep daily for 7 days, weekly for 4 weeks, monthly for 1 year
4. **Testing**: Quarterly restore tests to verify backup validity
5. **Documentation**: Log all backup and restore operations in runbook changelog

---

## Security Incident Response

### Incident Types

#### 1. Suspected Data Breach
**Immediate Actions**:
1. Isolate affected systems
2. Preserve audit logs
3. Notify security team
4. Begin forensic analysis

**24-Hour Actions**:
1. Assess scope of breach
2. Notify affected vendors
3. Prepare regulatory notifications (GDPR: 72 hours)
4. Engage external security consultants if needed

#### 2. Unauthorized Access Attempts
**Immediate Actions**:
1. Review audit logs for affected accounts
2. Lock compromised accounts
3. Force password reset for affected users
4. Review rate limiting logs

**Follow-up**:
1. Analyze attack patterns
2. Update rate limiting rules if needed
3. Enhance monitoring for similar patterns

#### 3. Encryption Key Compromise
**Immediate Actions**:
1. Begin emergency SESSION_SECRET rotation
2. Audit all recent data access
3. Lock all accounts until rotation complete
4. Notify users of security maintenance

**Follow-up**:
1. Conduct forensic analysis of compromise
2. Update key management procedures
3. Review access controls
4. Schedule external security audit

### Contact Information

**Security Team**: security@vendornetwork.com  
**On-Call Engineer**: Use PagerDuty rotation  
**Legal/Compliance**: compliance@vendornetwork.com  
**External Auditor**: [Auditor contact information]

---

## Appendix: Useful SQL Queries

### Find Most Active Users
```sql
SELECT actor_id, actor_name, COUNT(*) as action_count
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY actor_id, actor_name
ORDER BY action_count DESC
LIMIT 10;
```

### Profile Change Summary
```sql
SELECT 
  vp.company_name,
  COUNT(*) as total_changes,
  COUNT(DISTINCT al.field_changed) as fields_modified,
  MAX(al.timestamp) as last_modified
FROM vendor_profiles vp
JOIN audit_logs al ON vp.id = al.vendor_profile_id
WHERE al.timestamp > NOW() - INTERVAL '30 days'
GROUP BY vp.id, vp.company_name
ORDER BY total_changes DESC;
```

### Detect Suspicious Access Patterns
```sql
SELECT 
  accessor_id,
  accessor_company,
  COUNT(DISTINCT vendor_profile_id) as profiles_accessed,
  COUNT(*) as total_accesses,
  MIN(timestamp) as first_access,
  MAX(timestamp) as last_access
FROM access_logs
WHERE timestamp > NOW() - INTERVAL '1 day'
GROUP BY accessor_id, accessor_company
HAVING COUNT(DISTINCT vendor_profile_id) > 20
ORDER BY profiles_accessed DESC;
```

---

## Document Maintenance

**Last Updated**: September 30, 2025  
**Next Review**: December 30, 2025  
**Owner**: Platform Security Team  
**Reviewers**: Operations Team, Compliance Team  

### Change Log
- 2025-09-30: Initial runbook creation
- [Future updates will be logged here]

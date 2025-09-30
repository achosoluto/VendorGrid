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
The `SESSION_SECRET` is used for both session encryption and data encryption (banking information, Tax IDs). Regular rotation reduces the risk of key compromise and is a security best practice.

### Rotation Schedule
- **Recommended**: Every 90 days
- **Mandatory**: Immediately after any suspected security incident
- **Compliance**: Required by SOC 2 and PCI DSS standards

### Pre-Rotation Checklist
- [ ] Schedule maintenance window (recommended: off-peak hours)
- [ ] Notify users of planned downtime (15-30 minutes)
- [ ] Create database backup
- [ ] Document current `SESSION_SECRET` value in secure vault
- [ ] Generate new strong secret (32+ random characters)

### Rotation Procedure

#### Step 1: Export Encrypted Data
```bash
# Run the data migration script to decrypt all encrypted fields
tsx scripts/decrypt-all-data.ts > encrypted-data-backup.json
```

#### Step 2: Update Environment Variable
```bash
# In Replit Secrets or your environment management system:
# 1. Save old SESSION_SECRET as SESSION_SECRET_OLD
# 2. Update SESSION_SECRET with new value
# 3. Restart application
```

#### Step 3: Re-encrypt Data with New Key
```bash
# Run the re-encryption script
tsx scripts/reencrypt-data.ts encrypted-data-backup.json
```

#### Step 4: Verification
```bash
# Test decryption of sample vendor profile
curl -H "Authorization: Bearer $TOKEN" \
  https://your-app.replit.app/api/vendor-profile/$PROFILE_ID
```

#### Step 5: Clean Up
```bash
# Securely delete temporary backup
shred -u encrypted-data-backup.json

# Remove SESSION_SECRET_OLD from environment after 24 hours
# (Keep for rollback window)
```

### Rollback Procedure
If issues occur during rotation:

1. **Restore old key**:
   ```bash
   # Set SESSION_SECRET back to SESSION_SECRET_OLD
   # Restart application
   ```

2. **Verify application functionality**:
   ```bash
   # Test login and profile access
   ```

3. **Schedule retry**: Plan new rotation attempt after investigating failure

### Monitoring After Rotation
- Check error logs for decryption failures: `grep "decrypt" /var/log/app.log`
- Monitor user login success rate
- Verify audit logs are being created properly
- Test full vendor profile workflow

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

### Backup Schedule
- **Continuous**: Neon PostgreSQL automatic backups (point-in-time recovery)
- **Manual**: Before major deployments or migrations
- **Export**: Weekly audit log exports for compliance

### Manual Backup Procedure
```bash
# Export encrypted vendor data
pg_dump $DATABASE_URL -t vendor_profiles > backup-vendor-profiles-$(date +%Y-%m-%d).sql

# Export audit logs
pg_dump $DATABASE_URL -t audit_logs > backup-audit-logs-$(date +%Y-%m-%d).sql

# Compress and encrypt backup
tar czf - backup-*.sql | \
  openssl enc -aes-256-cbc -salt -pbkdf2 > \
  backup-$(date +%Y-%m-%d).tar.gz.enc
```

### Recovery Procedure

#### Full Database Recovery
```bash
# 1. Stop application
# 2. Point Neon connection to backup timestamp
# 3. Verify data integrity
# 4. Resume application
```

#### Partial Data Recovery
```bash
# Restore specific table from backup
psql $DATABASE_URL < backup-vendor-profiles-2025-09-30.sql

# Verify restored data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM vendor_profiles;"
```

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

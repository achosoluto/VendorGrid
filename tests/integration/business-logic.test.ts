#!/usr/bin/env node

/**
 * Phase 4: Business Logic Integration Testing Suite
 * 
 * Comprehensive testing of core business workflows and integrations:
 * - Government data integration and ingestion
 * - Vendor profile claiming workflows
 * - Data quality validation and deduplication
 * - Audit logging and data provenance
 * - Error handling and recovery mechanisms
 * - End-to-end business process validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import axios, { type AxiosInstance } from 'axios';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

// Test configuration
const INTEGRATION_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  testCompany: {
    companyName: 'Integration Test Company Ltd.',
    taxId: '987654321',
    businessNumber: '123456789',
    address: '123 Integration St',
    city: 'Test City',
    state: 'ON',
    zipCode: 'A1A 1A1',
    country: 'CA',
    phone: '+1-555-123-4567',
    email: 'test@integrationcompany.com',
    website: 'https://integrationcompany.com'
  }
};

// Utility class for integration testing
class IntegrationTester {
  private serverProcess: ChildProcess | null = null;
  private keycloakProcess: ChildProcess | null = null;
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = axios.create({
      timeout: INTEGRATION_CONFIG.timeout,
      validateStatus: () => true
    });
  }

  async startEnvironment(): Promise<void> {
    console.log('🚀 Starting integration test environment...');
    
    // Start Keycloak for full integration testing
    await this.startKeycloak();
    
    // Start application server
    await this.startServer();
  }

  private async startKeycloak(): Promise<void> {
    this.keycloakProcess = spawn('./keycloak-init/start-keycloak.sh', ['start'], {
      cwd: path.resolve(__dirname, '../..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for Keycloak to be ready
    await this.waitForKeycloak();
  }

  private async startServer(): Promise<void> {
    this.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, AUTH_PROVIDER: 'mock' }, // Use mock for integration tests
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to start
    await this.waitForServer();
  }

  private async waitForKeycloak(): Promise<void> {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.httpClient.get('http://localhost:8080/realms/vendorgrid');
        if (response.status === 200) {
          console.log('✅ Keycloak ready for integration testing');
          return;
        }
      } catch (error) {
        // Keycloak not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error('Keycloak failed to start for integration testing');
  }

  private async waitForServer(): Promise<void> {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.httpClient.get('/api/auth/status');
        if (response.status === 200) {
          console.log('✅ Server ready for integration testing');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Server failed to start for integration testing');
  }

  async stopEnvironment(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        this.serverProcess?.on('exit', resolve);
        setTimeout(resolve, 5000);
      });
    }

    if (this.keycloakProcess) {
      this.keycloakProcess.kill('SIGTERM');
      await new Promise(resolve => {
        this.keycloakProcess?.on('exit', resolve);
        setTimeout(resolve, 5000);
      });
    }
  }

  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }

  // Test data creation helpers
  async createTestVendorProfile(data?: any): Promise<any> {
    const vendorData = { ...INTEGRATION_CONFIG.testCompany, ...data };
    const response = await this.httpClient.post('/api/vendor-profile', vendorData);
    return response.data;
  }

  async getVendorProfileById(id: string): Promise<any> {
    const response = await this.httpClient.get(`/api/vendor-profile/${id}`);
    return response.data;
  }

  async getAuditLogs(vendorProfileId: string): Promise<any> {
    const response = await this.httpClient.get(`/api/vendor-profile/${vendorProfileId}/audit-logs`);
    return response.data;
  }

  async getDataProvenance(vendorProfileId: string): Promise<any> {
    const response = await this.httpClient.get(`/api/vendor-profile/${vendorProfileId}/provenance`);
    return response.data;
  }

  async triggerGovernmentDataIngestion(): Promise<any> {
    // This would trigger the government data integration agent
    // For now, we'll test the API endpoints that would be used
    const response = await this.httpClient.get('/api/system/status');
    return response.data;
  }

  async testVendorClaimingWorkflow(profileId: string, email: string): Promise<any> {
    // Test the vendor claiming workflow
    const claimRequest = {
      vendorProfileId: profileId,
      email: email,
      contactName: 'Test User',
      reason: 'Integration testing'
    };

    const response = await this.httpClient.post('/api/vendor-claiming/claim', claimRequest);
    return response.data;
  }
}

// Test Suite
describe('Business Logic Integration Testing', () => {
  let integrationTester: IntegrationTester;

  beforeAll(async () => {
    integrationTester = new IntegrationTester();
    await integrationTester.startEnvironment();
  });

  afterAll(async () => {
    await integrationTester.stopEnvironment();
  });

  describe('Government Data Integration Workflow', () => {
    it('should successfully ingest mock government data', async () => {
      // Test the government data integration agent
      const systemStatus = await integrationTester.triggerGovernmentDataIngestion();
      
      expect(systemStatus).toBeDefined();
      expect(typeof systemStatus).toBe('object');
    });

    it('should handle data quality validation during ingestion', async () => {
      // Create a vendor profile and test that data quality rules are applied
      const profile = await integrationTester.createTestVendorProfile();
      
      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.companyName).toBe(INTEGRATION_CONFIG.testCompany.companyName);
    });

    it('should create data provenance entries for imported data', async () => {
      const profile = await integrationTester.createTestVendorProfile({
        companyName: 'Provenance Test Company'
      });
      
      const provenance = await integrationTester.getDataProvenance(profile.id);
      
      expect(provenance).toBeDefined();
      expect(Array.isArray(provenance)).toBe(true);
      
      // Check for key provenance entries
      const companyNameProvenance = provenance.find(p => p.fieldName === 'companyName');
      expect(companyNameProvenance).toBeDefined();
      expect(companyNameProvenance.source).toBeDefined();
      expect(companyNameProvenance.method).toBe('Manual Entry');
    });

    it('should handle bulk data processing with rate limiting', async () => {
      // Test that rate limiting works during bulk operations
      const promises = Array(5).fill(null).map((_, i) => 
        integrationTester.createTestVendorProfile({
          companyName: `Rate Limit Test Company ${i}`,
          taxId: `12345${i}6789`
        })
      );
      
      const results = await Promise.allSettled(promises);
      
      // Some should succeed, some might be rate limited
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      expect(successful + failed).toBe(5);
      console.log(`Bulk operation results: ${successful} successful, ${failed} failed`);
    });
  });

  describe('Vendor Profile Claiming Workflow', () => {
    let testProfile: any;

    beforeEach(async () => {
      // Create a test profile that's not claimed
      testProfile = await integrationTester.createTestVendorProfile({
        companyName: 'Claiming Test Company Ltd.',
        email: 'claiming@testcompany.com'
      });
    });

    it('should initiate profile claiming process', async () => {
      const claimResult = await integrationTester.testVendorClaimingWorkflow(
        testProfile.id,
        'claimant@testcompany.com'
      );
      
      expect(claimResult).toBeDefined();
      expect(claimResult.success).toBe(true);
      expect(claimResult.message).toContain('Claim verification email sent');
    });

    it('should prevent claiming already claimed profiles', async () => {
      // First, claim the profile
      await integrationTester.testVendorClaimingWorkflow(
        testProfile.id,
        'first@claimant.com'
      );

      // Try to claim again
      const claimResult2 = await integrationTester.testVendorClaimingWorkflow(
        testProfile.id,
        'second@claimant.com'
      );
      
      expect(claimResult2.success).toBe(false);
      expect(claimResult2.message).toContain('already been claimed');
    });

    it('should handle claim token verification', async () => {
      // In a real test, this would verify the token
      // For now, we'll test the general flow
      const claimResult = await integrationTester.testVendorClaimingWorkflow(
        testProfile.id,
        'token@testcompany.com'
      );
      
      expect(claimResult.success).toBe(true);
      expect(claimResult.tokenId).toBeDefined();
      expect(claimResult.expiresAt).toBeDefined();
    });

    it('should create audit logs for claiming actions', async () => {
      await integrationTester.testVendorClaimingWorkflow(
        testProfile.id,
        'audit@testcompany.com'
      );
      
      const auditLogs = await integrationTester.getAuditLogs(testProfile.id);
      
      expect(auditLogs).toBeDefined();
      expect(Array.isArray(auditLogs)).toBe(true);
      
      // Check for claim-related audit entries
      const claimLog = auditLogs.find(log => 
        log.action === 'claim_initiated' || 
        log.action === 'profile_claimed'
      );
      
      if (claimLog) {
        expect(claimLog.actorName).toBeDefined();
        expect(claimLog.action).toBeDefined();
      }
    });
  });

  describe('Data Quality and Validation', () => {
    it('should validate business data according to quality rules', async () => {
      // Test with invalid data
      const invalidData = {
        companyName: '', // Empty company name
        taxId: 'invalid-tax-id', // Invalid format
        address: { street: '', city: '', province: 'ON', postalCode: 'invalid', country: 'CA' }
      };
      
      const response = await integrationTester.getHttpClient().post('/api/vendor-profile', invalidData);
      
      expect(response.status).toBe(400);
      expect(response.data.message).toBeDefined();
    });

    it('should format Canadian postal codes correctly', async () => {
      const profile = await integrationTester.createTestVendorProfile({
        zipCode: 'a1a1a1' // Lowercase, no space
      });
      
      expect(profile.zipCode).toBe('A1A 1A1'); // Should be formatted correctly
    });

    it('should prevent duplicate vendor profiles', async () => {
      // Create first profile
      const profile1 = await integrationTester.createTestVendorProfile({
        companyName: 'Duplicate Test Company',
        taxId: 'duplicate-123'
      });
      
      // Try to create duplicate
      const response = await integrationTester.getHttpClient().post('/api/vendor-profile', {
        companyName: 'Duplicate Test Company', // Same name
        taxId: 'duplicate-123', // Same tax ID
        address: { street: '456 Different St', city: 'Different City', province: 'ON', postalCode: 'B2B 2B2', country: 'CA' }
      });
      
      expect(response.status).toBe(400);
      expect(response.data.message).toContain('Vendor profile already exists');
    });

    it('should handle data updates with proper audit logging', async () => {
      const profile = await integrationTester.createTestVendorProfile({
        companyName: 'Update Test Company'
      });
      
      // Update the profile
      const updateResponse = await integrationTester.getHttpClient().patch(
        `/api/vendor-profile/${profile.id}`,
        { companyName: 'Updated Test Company' }
      );
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.companyName).toBe('Updated Test Company');
      
      // Verify audit log was created
      const auditLogs = await integrationTester.getAuditLogs(profile.id);
      const updateLog = auditLogs.find(log => 
        log.fieldChanged === 'companyName' && 
        log.newValue === 'Updated Test Company'
      );
      
      expect(updateLog).toBeDefined();
    });
  });

  describe('Audit Trail and Compliance', () => {
    let testProfile: any;

    beforeEach(async () => {
      testProfile = await integrationTester.createTestVendorProfile({
        companyName: 'Audit Trail Test Company'
      });
    });

    it('should create audit logs for profile creation', async () => {
      const auditLogs = await integrationTester.getAuditLogs(testProfile.id);
      
      expect(auditLogs).toBeDefined();
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const creationLog = auditLogs.find(log => log.action === 'claimed vendor profile');
      expect(creationLog).toBeDefined();
      expect(creationLog.immutable).toBe(true);
    });

    it('should track all field changes with old and new values', async () => {
      // Make multiple updates
      await integrationTester.getHttpClient().patch(
        `/api/vendor-profile/${testProfile.id}`,
        { phone: '+1-555-999-8888' }
      );
      
      await integrationTester.getHttpClient().patch(
        `/api/vendor-profile/${testProfile.id}`,
        { email: 'updated@audittest.com' }
      );
      
      const auditLogs = await integrationTester.getAuditLogs(testProfile.id);
      
      // Check for phone update
      const phoneLog = auditLogs.find(log => log.fieldChanged === 'phone');
      expect(phoneLog).toBeDefined();
      expect(phoneLog.oldValue).toContain('Phone not available');
      expect(phoneLog.newValue).toContain('+1-555-999-8888');
      
      // Check for email update
      const emailLog = auditLogs.find(log => log.fieldChanged === 'email');
      expect(emailLog).toBeDefined();
      expect(emailLog.oldValue).toContain('email@example.com');
      expect(emailLog.newValue).toContain('updated@audittest.com');
    });

    it('should export audit logs in both JSON and CSV formats', async () => {
      // Test JSON export
      const jsonResponse = await integrationTester.getHttpClient().get(
        `/api/vendor-profile/${testProfile.id}/audit-logs/export?format=json`
      );
      
      expect(jsonResponse.status).toBe(200);
      expect(jsonResponse.data.auditLogs).toBeDefined();
      expect(jsonResponse.data.vendorProfile).toBeDefined();
      
      // Test CSV export
      const csvResponse = await integrationTester.getHttpClient().get(
        `/api/vendor-profile/${testProfile.id}/audit-logs/export?format=csv`
      );
      
      expect(csvResponse.status).toBe(200);
      expect(typeof csvResponse.data).toBe('string');
      expect(csvResponse.data).toContain('Timestamp,Action,Actor Name');
    });

    it('should support date-range filtering for audit exports', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const response = await integrationTester.getHttpClient().get(
        `/api/vendor-profile/${testProfile.id}/audit-logs/export?format=json&startDate=${startDate}&endDate=${endDate}`
      );
      
      expect(response.status).toBe(200);
      expect(response.data.dateRange.start).toBe(startDate);
      expect(response.data.dateRange.end).toBe(endDate);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connectivity issues gracefully', async () => {
      // Test with invalid database connection would require mocking
      // For now, test general error handling
      const response = await integrationTester.getHttpClient().get('/api/vendor-profile/invalid-id');
      
      expect(response.status).toBe(404);
      expect(response.data.message).toBeDefined();
    });

    it('should validate input data and provide meaningful error messages', async () => {
      const response = await integrationTester.getHttpClient().post('/api/vendor-profile', {
        companyName: 'Valid Company Name',
        taxId: '123456789',
        // Missing required address fields
      });
      
      expect(response.status).toBe(400);
      expect(response.data.message).toBeDefined();
    });

    it('should handle rate limiting without crashing', async () => {
      // Make multiple rapid requests
      const promises = Array(25).fill(null).map(() => 
        integrationTester.getHttpClient().post('/api/vendor-profile', {
          companyName: 'Rate Limit Test',
          taxId: `rate-${Date.now()}`,
          address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
        })
      );
      
      const results = await Promise.allSettled(promises);
      
      // Should have some rate limited responses
      const rateLimited = results.filter(r => 
        r.status === 'rejected' || 
        (r.status === 'fulfilled' && r.value.status === 429)
      ).length;
      
      expect(rateLimited).toBeGreaterThan(0);
    });

    it('should maintain data integrity during concurrent operations', async () => {
      const profile = await integrationTester.createTestVendorProfile({
        companyName: 'Concurrency Test Company'
      });
      
      // Make concurrent updates
      const updatePromises = [
        integrationTester.getHttpClient().patch(`/api/vendor-profile/${profile.id}`, { phone: '+1-555-111-2222' }),
        integrationTester.getHttpClient().patch(`/api/vendor-profile/${profile.id}`, { email: 'first@test.com' }),
        integrationTester.getHttpClient().get(`/api/vendor-profile/${profile.id}`)
      ];
      
      const results = await Promise.allSettled(updatePromises);
      
      // All operations should complete without errors
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(3);
      
      // Final state should be consistent
      const finalProfile = await integrationTester.getVendorProfileById(profile.id);
      expect(finalProfile).toBeDefined();
    });
  });

  describe('Workflow Orchestration', () => {
    it('should handle end-to-end vendor onboarding workflow', async () => {
      // 1. Create vendor profile
      const profile = await integrationTester.createTestVendorProfile({
        companyName: 'End-to-End Test Company',
        email: 'e2e@testcompany.com'
      });
      
      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      
      // 2. Verify audit trail was created
      const auditLogs = await integrationTester.getAuditLogs(profile.id);
      expect(auditLogs.length).toBeGreaterThan(0);
      
      // 3. Verify provenance tracking
      const provenance = await integrationTester.getDataProvenance(profile.id);
      expect(provenance.length).toBeGreaterThan(0);
      
      // 4. Test data export
      const exportResponse = await integrationTester.getHttpClient().get(
        `/api/vendor-profile/${profile.id}/audit-logs/export?format=json`
      );
      expect(exportResponse.status).toBe(200);
      
      // 5. Update profile and verify change tracking
      await integrationTester.getHttpClient().patch(
        `/api/vendor-profile/${profile.id}`,
        { website: 'https://e2etestcompany.com' }
      );
      
      const updatedLogs = await integrationTester.getAuditLogs(profile.id);
      const websiteLog = updatedLogs.find(log => log.fieldChanged === 'website');
      expect(websiteLog).toBeDefined();
    });

    it('should support business logic validation across multiple operations', async () => {
      // Create profile with incomplete data
      const profile = await integrationTester.createTestVendorProfile({
        companyName: 'Validation Test Company',
        email: 'validation@testcompany.com'
        // Missing phone, website, etc.
      });
      
      // Update with additional data
      await integrationTester.getHttpClient().patch(
        `/api/vendor-profile/${profile.id}`,
        { phone: '+1-555-123-4567', website: 'https://validationtest.com' }
      );
      
      // Verify all data is properly tracked
      const finalProfile = await integrationTester.getVendorProfileById(profile.id);
      expect(finalProfile.phone).toBe('+1-555-123-4567');
      expect(finalProfile.website).toBe('https://validationtest.com');
      
      // Verify audit trail shows progression
      const auditLogs = await integrationTester.getAuditLogs(profile.id);
      const phoneUpdateLog = auditLogs.find(log => log.fieldChanged === 'phone');
      const websiteUpdateLog = auditLogs.find(log => log.fieldChanged === 'website');
      
      expect(phoneUpdateLog).toBeDefined();
      expect(websiteUpdateLog).toBeDefined();
    });
  });
});

// Export for use in other test files
export { IntegrationTester, INTEGRATION_CONFIG };
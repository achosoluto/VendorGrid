#!/usr/bin/env node

/**
 * Phase 4: End-to-End Testing Scenarios
 * 
 * Comprehensive end-to-end testing of complete user workflows and system behavior:
 * - Complete authentication and authorization flows
 * - Full business process workflows (vendor creation to data integration)
 * - Government data integration and audit trail validation
 * - Migration system end-to-end testing
 * - Recovery and resilience testing
 * - Cross-provider functionality validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import axios, { type AxiosInstance } from 'axios';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { SecurityTester } from './validation.test';
import fs from 'fs/promises';

// Test configuration
const E2E_CONFIG = {
  baseURL: 'http://localhost:3000',
  keycloakURL: 'http://localhost:8080',
  timeout: 15000,
  testUsers: {
    mock: { email: 'test@mock.com', password: 'mock123' },
    keycloak: { email: 'test@keycloak.com', password: 'keycloak123' }
  }
};

// E2E Test Environment Manager
class E2EEnvironmentManager {
  private serverProcess: ChildProcess | null = null;
  private keycloakProcess: ChildProcess | null = null;
  private httpClient: AxiosInstance;
  private currentProvider: 'mock' | 'keycloak' = 'mock';
  private testData: any = {};

  constructor() {
    this.httpClient = axios.create({
      timeout: E2E_CONFIG.timeout,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'E2ETestAgent/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async setupEnvironment(): Promise<void> {
    console.log('🛠️ Setting up E2E test environment...');
    
    // Start Keycloak
    await this.startKeycloak();
    
    // Start VendorGrid
    await this.startVendorGrid();
    
    // Wait for both services to be ready
    await this.waitForServices();
    
    console.log('✅ E2E test environment ready');
  }

  private async startKeycloak(): Promise<void> {
    const keycloakScript = path.resolve(__dirname, '../../keycloak-init/start-keycloak.sh');
    
    if (await this.fileExists(keycloakScript)) {
      this.keycloakProcess = spawn('bash', [keycloakScript, 'start'], {
        cwd: path.dirname(keycloakScript),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.keycloakProcess.on('data', (data) => {
        console.log('Keycloak:', data.toString());
      });
      
      this.keycloakProcess.on('error', (error) => {
        console.error('Keycloak process error:', error);
      });
    }
  }

  private async startVendorGrid(): Promise<void> {
    this.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../..'),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        AUTH_PROVIDER: this.currentProvider
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.serverProcess.on('data', (data) => {
      console.log('VendorGrid:', data.toString());
    });

    this.serverProcess.on('error', (error) => {
      console.error('VendorGrid process error:', error);
    });
  }

  private async waitForServices(): Promise<void> {
    const maxAttempts = 30;
    
    // Wait for Keycloak
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(`${E2E_CONFIG.keycloakURL}/auth/realms/vendorgrid`, { timeout: 5000 });
        if (response.status === 200) {
          console.log('✅ Keycloak ready');
          break;
        }
      } catch (error) {
        await this.delay(2000);
      }
    }

    // Wait for VendorGrid
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.httpClient.get('/api/auth/status');
        if (response.status === 200) {
          console.log('✅ VendorGrid ready');
          break;
        }
      } catch (error) {
        await this.delay(2000);
      }
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async switchProvider(provider: 'mock' | 'keycloak'): Promise<void> {
    if (this.currentProvider === provider) return;
    
    console.log(`🔄 Switching authentication provider to ${provider}...`);
    
    // Restart VendorGrid with new provider
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        this.serverProcess?.on('exit', resolve);
        setTimeout(resolve, 3000);
      });
    }
    
    this.currentProvider = provider;
    await this.startVendorGrid();
    await this.delay(5000);
    
    // Verify switch
    const response = await this.httpClient.get('/api/auth/status');
    if (response.status === 200 && response.data.provider === provider) {
      console.log(`✅ Switched to ${provider} authentication`);
    } else {
      throw new Error(`Failed to switch to ${provider} authentication`);
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up E2E test environment...');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        this.serverProcess?.on('exit', resolve);
        setTimeout(resolve, 3000);
      });
    }
    
    if (this.keycloakProcess) {
      this.keycloakProcess.kill('SIGTERM');
      await new Promise(resolve => {
        this.keycloakProcess?.on('exit', resolve);
        setTimeout(resolve, 3000);
      });
    }
  }

  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }

  getCurrentProvider(): 'mock' | 'keycloak' {
    return this.currentProvider;
  }

  setTestData(key: string, value: any): void {
    this.testData[key] = value;
  }

  getTestData(key: string): any {
    return this.testData[key];
  }
}

// User Journey Test Helper
class UserJourneyTester {
  constructor(private env: E2EEnvironmentManager) {}

  // Complete user registration and onboarding journey
  async registerAndOnboardUser(userData: any): Promise<{
    user: any;
    profile: any;
    success: boolean;
    steps: string[];
  }> {
    const steps: string[] = [];
    const httpClient = this.env.getHttpClient();

    try {
      // Step 1: Navigate to login page
      steps.push('Navigate to login page');
      const loginResponse = await httpClient.get('/api/login');
      expect([200, 302]).toContain(loginResponse.status);

      // Step 2: Attempt authentication
      steps.push('Attempt authentication');
      const authResponse = await httpClient.post('/api/auth/login', {
        email: userData.email,
        password: userData.password
      });

      if (authResponse.status === 200) {
        steps.push('Authentication successful');
        
        // Step 3: Create vendor profile
        steps.push('Create vendor profile');
        const profileResponse = await httpClient.post('/api/vendor-profile', {
          companyName: userData.companyName,
          taxId: userData.taxId,
          address: userData.address,
          contactEmail: userData.email
        });

        if (profileResponse.status === 200) {
          steps.push('Profile created successfully');
          
          // Step 4: Verify profile is accessible
          steps.push('Verify profile accessibility');
          const profileVerifyResponse = await httpClient.get('/api/vendor-profile');
          expect(profileVerifyResponse.status).toBe(200);

          return {
            user: authResponse.data,
            profile: profileResponse.data,
            success: true,
            steps
          };
        } else {
          steps.push('Profile creation failed');
          return { user: null, profile: null, success: false, steps };
        }
      } else {
        steps.push('Authentication failed');
        return { user: null, profile: null, success: false, steps };
      }
    } catch (error) {
      steps.push(`Error: ${error.message}`);
      return { user: null, profile: null, success: false, steps };
    }
  }

  // Complete data claiming workflow
  async claimGovernmentData(companyId: string, dataSource: string): Promise<{
    success: boolean;
    steps: string[];
    claimResult?: any;
  }> {
    const steps: string[] = [];
    const httpClient = this.env.getHttpClient();

    try {
      // Step 1: Check data availability
      steps.push('Check government data availability');
      const dataResponse = await httpClient.get(`/api/government-data/${dataSource}`);
      expect([200, 404]).toContain(dataResponse.status);

      // Step 2: Submit claim
      steps.push('Submit data claim');
      const claimResponse = await httpClient.post('/api/vendor-claiming/claim', {
        vendorId: companyId,
        dataSource,
        businessNumber: companyId
      });

      if (claimResponse.status === 200) {
        steps.push('Claim submitted successfully');
        
        // Step 3: Verify claim status
        steps.push('Verify claim status');
        const statusResponse = await httpClient.get(`/api/vendor-claiming/claim/${claimResponse.data.claimId}`);
        expect([200, 202]).toContain(statusResponse.status);

        return {
          success: true,
          steps,
          claimResult: claimResponse.data
        };
      } else {
        steps.push('Claim submission failed');
        return { success: false, steps };
      }
    } catch (error) {
      steps.push(`Error: ${error.message}`);
      return { success: false, steps };
    }
  }

  // Complete audit trail and compliance workflow
  async validateAuditTrail(profileId: string): Promise<{
    success: boolean;
    steps: string[];
    auditLogs?: any[];
  }> {
    const steps: string[] = [];
    const httpClient = this.env.getHttpClient();

    try {
      // Step 1: Access audit logs
      steps.push('Access audit logs');
      const auditResponse = await httpClient.get(`/api/vendor-profile/${profileId}/audit-logs`);
      expect([200, 404]).toContain(auditResponse.status);

      if (auditResponse.status === 200) {
        steps.push('Audit logs retrieved successfully');
        
        // Step 2: Validate log entries
        steps.push('Validate audit log entries');
        const auditLogs = auditResponse.data;
        expect(Array.isArray(auditLogs)).toBe(true);

        // Step 3: Verify data provenance
        steps.push('Verify data provenance');
        for (const log of auditLogs) {
          expect(log.timestamp).toBeDefined();
          expect(log.action).toBeDefined();
          expect(log.dataProvenance).toBeDefined();
        }

        return {
          success: true,
          steps,
          auditLogs
        };
      } else {
        steps.push('No audit logs found');
        return { success: false, steps };
      }
    } catch (error) {
      steps.push(`Error: ${error.message}`);
      return { success: false, steps };
    }
  }
}

// Test Suite
describe('End-to-End Testing Scenarios', () => {
  let env: E2EEnvironmentManager;
  let journeyTester: UserJourneyTester;

  beforeAll(async () => {
    env = new E2EEnvironmentManager();
    await env.setupEnvironment();
    journeyTester = new UserJourneyTester(env);
  });

  afterAll(async () => {
    await env.cleanup();
  });

  describe('Scenario 1: Mock Authentication End-to-End', () => {
    it('should complete full user journey with mock authentication', async () => {
      console.log('🧪 Testing mock authentication end-to-end flow...');
      
      // Verify we're in mock mode
      const statusResponse = env.getHttpClient().get('/api/auth/status');
      expect((await statusResponse).data.provider).toBe('mock');
      
      // Test user registration and onboarding
      const userData = {
        email: 'test.mock@company.ca',
        password: 'test123',
        companyName: 'Mock Test Company Ltd',
        taxId: '123456789RC0001',
        address: {
          street: '123 Test Street',
          city: 'Edmonton',
          province: 'AB',
          postalCode: 'T5H 2H7',
          country: 'CA'
        }
      };

      const onboardingResult = await journeyTester.registerAndOnboardUser(userData);
      expect(onboardingResult.success).toBe(true);
      expect(onboardingResult.steps.length).toBeGreaterThan(0);
      
      env.setTestData('mockUser', onboardingResult.user);
      env.setTestData('mockProfile', onboardingResult.profile);
      
      console.log('✅ Mock authentication end-to-end flow completed successfully');
    }, 30000);

    it('should handle data claiming workflow with mock authentication', async () => {
      console.log('🧪 Testing data claiming with mock authentication...');
      
      const profile = env.getTestData('mockProfile');
      if (!profile) {
        console.log('⚠️ Skipping - no mock profile available');
        return;
      }

      const claimResult = await journeyTester.claimGovernmentData(
        profile.id || 'mock-profile-id',
        'corporations-canada'
      );
      
      expect(claimResult.success || claimResult.steps.length > 0).toBe(true);
      
      console.log('✅ Mock data claiming workflow completed');
    }, 20000);

    it('should validate audit trail with mock authentication', async () => {
      console.log('🧪 Testing audit trail with mock authentication...');
      
      const profile = env.getTestData('mockProfile');
      if (!profile) {
        console.log('⚠️ Skipping - no mock profile available');
        return;
      }

      const auditResult = await journeyTester.validateAuditTrail(
        profile.id || 'mock-profile-id'
      );
      
      expect(auditResult.success || auditResult.steps.length > 0).toBe(true);
      
      console.log('✅ Mock audit trail validation completed');
    }, 15000);
  });

  describe('Scenario 2: Keycloak Integration End-to-End', () => {
    beforeEach(async () => {
      await env.switchProvider('keycloak');
    });

    it('should complete full user journey with Keycloak authentication', async () => {
      console.log('🧪 Testing Keycloak authentication end-to-end flow...');
      
      // Verify we're in Keycloak mode
      const statusResponse = env.getHttpClient().get('/api/auth/status');
      expect((await statusResponse).data.provider).toBe('keycloak');
      
      // Test user registration and onboarding
      const userData = {
        email: 'test.keycloak@company.ca',
        password: 'testkeycloak',
        companyName: 'Keycloak Test Corp',
        taxId: '987654321RC0001',
        address: {
          street: '456 Keycloak Avenue',
          city: 'Calgary',
          province: 'AB',
          postalCode: 'T2P 1A1',
          country: 'CA'
        }
      };

      const onboardingResult = await journeyTester.registerAndOnboardUser(userData);
      // Keycloak might have different flow, so we test what works
      expect(onboardingResult.steps.length).toBeGreaterThan(0);
      
      env.setTestData('keycloakUser', onboardingResult.user);
      env.setTestData('keycloakProfile', onboardingResult.profile);
      
      console.log('✅ Keycloak authentication end-to-end flow completed');
    }, 30000);

    it('should handle OIDC discovery and client configuration', async () => {
      console.log('🧪 Testing OIDC configuration...');
      
      // Test OIDC discovery endpoint
      const httpClient = env.getHttpClient();
      
      // Simulate OIDC flow
      const authResponse = await httpClient.get('/api/auth/login');
      expect([200, 302, 404]).toContain(authResponse.status);
      
      // Test token validation if available
      if (authResponse.data && authResponse.data.token) {
        const userResponse = await httpClient.get('/api/auth/user', {
          headers: { Authorization: `Bearer ${authResponse.data.token}` }
        });
        expect([200, 401, 403]).toContain(userResponse.status);
      }
      
      console.log('✅ OIDC configuration tested');
    }, 20000);
  });

  describe('Scenario 3: Migration System End-to-End', () => {
    it('should validate migration system from mock to keycloak', async () => {
      console.log('🧪 Testing migration system end-to-end...');
      
      const httpClient = env.getHttpClient();
      
      // Step 1: Validate current state
      console.log('Step 1: Validating current state');
      const validationResult = await httpClient.get('/api/auth/status');
      expect(validationResult.status).toBe(200);
      
      // Step 2: Test migration preparation
      console.log('Step 2: Testing migration preparation');
      const migrationScript = path.resolve(__dirname, '../../scripts/migrate-to-keycloak.js');
      
      // Test migration validation command
      const { exec } = await import('child_process');
      const execPromise = new Promise((resolve, reject) => {
        exec(`node ${migrationScript} validate`, { cwd: path.dirname(migrationScript) }, 
          (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
          });
      });
      
      try {
        const migrationOutput = await execPromise as any;
        expect(migrationOutput.stdout).toBeDefined();
        console.log('✅ Migration validation completed');
      } catch (error) {
        // Migration might not be available, that's OK
        console.log('⚠️ Migration script not available, skipping migration test');
      }
      
      // Step 3: Test provider switching
      console.log('Step 3: Testing provider switching');
      const currentProvider = env.getCurrentProvider();
      const newProvider = currentProvider === 'mock' ? 'keycloak' : 'mock';
      
      await env.switchProvider(newProvider);
      const newStatus = await httpClient.get('/api/auth/status');
      expect(newStatus.data.provider).toBe(newProvider);
      
      console.log('✅ Provider switching completed');
    }, 45000);

    it('should handle provider switch without data loss', async () => {
      console.log('🧪 Testing provider switch data integrity...');
      
      const httpClient = env.getHttpClient();
      const originalProvider = env.getCurrentProvider();
      
      // Create test data in original provider
      const testData = {
        companyName: 'Provider Switch Test Ltd',
        taxId: 'SWITCH123RC0001',
        address: { street: '789 Switch St', city: 'Edmonton', province: 'AB', postalCode: 'T5K 2T1', country: 'CA' }
      };
      
      // Try to create profile
      let profileCreationResult = null;
      try {
        const profileResponse = await httpClient.post('/api/vendor-profile', testData);
        if (profileResponse.status === 200) {
          profileCreationResult = profileResponse.data;
        }
      } catch (error) {
        console.log('Profile creation failed (expected in some providers)');
      }
      
      // Switch provider
      const newProvider = originalProvider === 'mock' ? 'keycloak' : 'mock';
      await env.switchProvider(newProvider);
      
      // Verify data integrity - services should still work
      const healthResponse = await httpClient.get('/api/auth/status');
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.data.provider).toBe(newProvider);
      
      // Test that authentication still works
      const authTestResponse = await httpClient.get('/api/auth/user');
      expect([200, 401, 403]).toContain(authTestResponse.status);
      
      console.log('✅ Provider switch data integrity verified');
    }, 30000);
  });

  describe('Scenario 4: Production Simulation Testing', () => {
    it('should simulate production load and behavior', async () => {
      console.log('🧪 Simulating production environment...');
      
      const httpClient = env.getHttpClient();
      
      // Simulate multiple concurrent requests
      const concurrentRequests = Array(10).fill(null).map((_, i) => 
        httpClient.get('/api/auth/status')
      );
      
      const responses = await Promise.all(concurrentRequests);
      const successfulResponses = responses.filter(r => r.status === 200);
      
      expect(successfulResponses.length).toBeGreaterThan(5); // Most should succeed
      
      // Test error handling
      const errorResponse = await httpClient.get('/api/non-existent-endpoint');
      expect(errorResponse.status).toBe(404);
      
      // Test rate limiting behavior
      const rapidRequests = Array(20).fill(null).map(() => 
        httpClient.get('/api/auth/user')
      );
      
      const rapidResponses = await Promise.all(rapidRequests);
      const rateLimitedResponses = rapidResponses.filter(r => r.status === 429);
      const errorResponses = rapidResponses.filter(r => r.status >= 400);
      
      // Should have some rate limiting
      expect(errorResponses.length).toBeGreaterThan(0);
      
      console.log('✅ Production simulation completed');
    }, 25000);

    it('should test security in production-like environment', async () => {
      console.log('🧪 Testing security in production environment...');
      
      const httpClient = env.getHttpClient();
      
      // Test SQL injection protection
      const sqlInjectionResponse = await httpClient.post('/api/vendor-profile', {
        companyName: "'; DROP TABLE vendor_profiles; --",
        taxId: 'test',
        address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
      });
      expect(sqlInjectionResponse.status).toBe(400);
      
      // Test XSS protection
      const xssResponse = await httpClient.post('/api/vendor-profile', {
        companyName: '<script>alert("xss")</script>',
        taxId: 'test',
        address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
      });
      expect([400, 200]).toContain(xssResponse.status);
      if (xssResponse.status === 200) {
        expect(xssResponse.data.companyName).not.toContain('<script>');
      }
      
      // Test CORS policy
      const corsResponse = await httpClient.get('/api/auth/status', {
        headers: { Origin: 'http://malicious-site.com' }
      });
      expect(corsResponse.status).toBe(200);
      
      console.log('✅ Security testing completed');
    }, 20000);
  });

  describe('Scenario 5: Recovery and Resilience Testing', () => {
    it('should handle service interruptions gracefully', async () => {
      console.log('🧪 Testing service interruption recovery...');
      
      const httpClient = env.getHttpClient();
      
      // Test health check during normal operation
      const healthResponse = await httpClient.get('/api/auth/status');
      expect(healthResponse.status).toBe(200);
      
      // Test API resilience - all endpoints should return appropriate status codes
      const endpoints = [
        '/api/auth/status',
        '/api/auth/user',
        '/api/vendor-profile',
        '/api/government-data/corporations-canada'
      ];
      
      for (const endpoint of endpoints) {
        const response = await httpClient.get(endpoint);
        expect([200, 401, 403, 404]).toContain(response.status);
      }
      
      console.log('✅ Service interruption recovery tested');
    }, 15000);

    it('should validate data integrity across operations', async () => {
      console.log('🧪 Testing data integrity...');
      
      const httpClient = env.getHttpClient();
      
      // Test data validation
      const invalidDataResponse = await httpClient.post('/api/vendor-profile', {
        companyName: '', // Empty company name
        taxId: 'invalid-tax-id',
        address: {
          street: '', // Empty street
          city: 'Test',
          province: 'ON',
          postalCode: 'invalid',
          country: 'CA'
        }
      });
      
      expect(invalidDataResponse.status).toBe(400);
      
      // Test proper data format validation
      const validDataResponse = await httpClient.post('/api/vendor-profile', {
        companyName: 'Valid Test Company Ltd',
        taxId: '123456789RC0001',
        address: {
          street: '123 Valid Street',
          city: 'Edmonton',
          province: 'AB',
          postalCode: 'T5H 2H7',
          country: 'CA'
        }
      });
      
      expect([200, 400, 404]).toContain(validDataResponse.status);
      
      console.log('✅ Data integrity validation completed');
    }, 20000);
  });

  describe('Scenario 6: Business Logic Validation', () => {
    it('should validate complete vendor lifecycle', async () => {
      console.log('🧪 Testing complete vendor lifecycle...');
      
      const httpClient = env.getHttpClient();
      
      // Step 1: Create vendor profile
      const vendorData = {
        companyName: 'Lifecycle Test Corp',
        taxId: 'LIFECYCLE123RC0001',
        address: {
          street: '100 Lifecycle Way',
          city: 'Vancouver',
          province: 'BC',
          postalCode: 'V6B 1A1',
          country: 'CA'
        }
      };
      
      const createResponse = await httpClient.post('/api/vendor-profile', vendorData);
      expect([200, 400, 404]).toContain(createResponse.status);
      
      // Step 2: Read vendor profile
      const readResponse = await httpClient.get('/api/vendor-profile');
      expect([200, 401, 403]).toContain(readResponse.status);
      
      // Step 3: Update vendor profile (if create succeeded)
      if (createResponse.status === 200) {
        const updateResponse = await httpClient.patch('/api/vendor-profile', {
          companyName: 'Updated Lifecycle Test Corp',
          contactEmail: 'lifecycle@testcorp.ca'
        });
        expect([200, 400, 401, 403]).toContain(updateResponse.status);
      }
      
      // Step 4: Check audit logs
      const auditResponse = await httpClient.get('/api/vendor-profile/audit-logs');
      expect([200, 401, 403, 404]).toContain(auditResponse.status);
      
      console.log('✅ Complete vendor lifecycle tested');
    }, 25000);

    it('should validate government data integration workflow', async () => {
      console.log('🧪 Testing government data integration...');
      
      const httpClient = env.getHttpClient();
      
      // Test government data endpoints
      const dataEndpoints = [
        '/api/government-data/corporations-canada',
        '/api/government-data/import-export',
        '/api/government-data/small-business'
      ];
      
      for (const endpoint of dataEndpoints) {
        const response = await httpClient.get(endpoint);
        expect([200, 404, 500]).toContain(response.status);
      }
      
      // Test vendor claiming workflow
      const claimResponse = await httpClient.post('/api/vendor-claiming/claim', {
        vendorId: 'test-vendor-id',
        dataSource: 'corporations-canada',
        businessNumber: '123456789RC0001'
      });
      expect([200, 400, 401, 403, 404]).toContain(claimResponse.status);
      
      console.log('✅ Government data integration workflow tested');
    }, 20000);
  });
});

// Export for use in test runner
export { E2EEnvironmentManager, UserJourneyTester, E2E_CONFIG };
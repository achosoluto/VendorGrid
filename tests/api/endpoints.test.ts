#!/usr/bin/env node

/**
 * Phase 4: API Endpoint Testing Suite
 * 
 * Comprehensive testing of all API endpoints for VendorGrid:
 * - Authentication endpoints
 * - Vendor profile management (CRUD)
 * - Audit and compliance endpoints
 * - Access logs and data provenance
 * - Government data integration
 * - Vendor claiming system
 * - Notification system
 * - System status
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import axios, { type AxiosInstance } from 'axios';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 10000,
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  mockUser: {
    id: 'dev-user-123',
    email: 'developer@vendorgrid.local',
    firstName: 'Dev',
    lastName: 'User'
  }
};

// Test data for vendor profile operations
const TEST_VENDOR_DATA = {
  companyName: 'Test Company Inc.',
  taxId: '123456789',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    province: 'ON',
    postalCode: 'A1A 1A1',
    country: 'CA'
  },
  phone: '+1-555-123-4567',
  email: 'contact@testcompany.com',
  website: 'https://testcompany.com',
  industry: 'Technology',
  description: 'A test company for API testing'
};

// Utility class for API testing
class APITester {
  private serverProcess: ChildProcess | null = null;
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = axios.create({
      timeout: TEST_CONFIG.timeout,
      validateStatus: () => true // Don't throw on 4xx/5xx responses
    });
  }

  async startServer(): Promise<void> {
    // Start the server
    this.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../..'),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to start
    await this.waitForServer();
  }

  private async waitForServer(): Promise<void> {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.httpClient.get('/api/auth/status');
        if (response.status === 200) {
          console.log('✅ Server started successfully');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Server failed to start within timeout');
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        this.serverProcess?.on('exit', resolve);
        setTimeout(resolve, 5000); // Force kill after 5 seconds
      });
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/auth/status');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }

  async reset(): Promise<void> {
    await this.stopServer();
  }

  // Helper method to simulate authenticated requests
  async authenticatedGet(endpoint: string): Promise<any> {
    // In mock mode, user is automatically authenticated
    return this.httpClient.get(endpoint);
  }

  async authenticatedPost(endpoint: string, data?: any): Promise<any> {
    return this.httpClient.post(endpoint, data);
  }

  async authenticatedPatch(endpoint: string, data?: any): Promise<any> {
    return this.httpClient.patch(endpoint, data);
  }
}

// Test Suite
describe('API Endpoint Testing', () => {
  let apiTester: APITester;

  beforeAll(async () => {
    apiTester = new APITester();
    await apiTester.startServer();
  });

  afterAll(async () => {
    await apiTester.reset();
  });

  describe('Authentication Endpoints', () => {
    it('should return authentication status', async () => {
      const response = await apiTester.getHttpClient().get('/api/auth/status');
      expect(response.status).toBe(200);
      
      const data = response.data;
      expect(data.timestamp).toBeDefined();
      expect(data.provider).toBeDefined();
      expect(['mock', 'keycloak']).toContain(data.provider);
    });

    it('should return current user information', async () => {
      const response = await apiTester.authenticatedGet('/api/auth/user');
      expect(response.status).toBe(200);
      
      const user = response.data;
      expect(user.email).toBe(TEST_CONFIG.mockUser.email);
      expect(user.firstName).toBe(TEST_CONFIG.mockUser.firstName);
      expect(user.lastName).toBe(TEST_CONFIG.mockUser.lastName);
      expect(user.id).toBe(TEST_CONFIG.mockUser.id);
    });

    it('should handle login endpoint', async () => {
      const response = await apiTester.getHttpClient().get('/api/login');
      expect(response.status).toBe(200);
      
      const data = response.data;
      expect(data.message).toContain('Mock login successful');
      expect(data.user).toBeDefined();
    });

    it('should handle logout endpoint', async () => {
      const response = await apiTester.getHttpClient().get('/api/logout');
      expect(response.status).toBe(200);
      
      const data = response.data;
      expect(data.message).toContain('Mock logout successful');
    });
  });

  describe('Vendor Profile Management', () => {
    it('should return null profile for new user', async () => {
      const response = await apiTester.authenticatedGet('/api/vendor-profile');
      expect(response.status).toBe(200);
      
      const data = response.data;
      expect(data.profile).toBeNull();
    });

    it('should create new vendor profile', async () => {
      const response = await apiTester.authenticatedPost('/api/vendor-profile', TEST_VENDOR_DATA);
      expect(response.status).toBe(200);
      
      const profile = response.data;
      expect(profile.id).toBeDefined();
      expect(profile.companyName).toBe(TEST_VENDOR_DATA.companyName);
      expect(profile.taxId).toBe(TEST_VENDOR_DATA.taxId);
      expect(profile.userId).toBe(TEST_CONFIG.mockUser.id);
    });

    it('should prevent duplicate vendor profile creation', async () => {
      // Profile already created in previous test
      const response = await apiTester.authenticatedPost('/api/vendor-profile', TEST_VENDOR_DATA);
      expect(response.status).toBe(400);
      expect(response.data.message).toContain('Vendor profile already exists');
    });

    it('should update existing vendor profile', async () => {
      // First, get the profile to get the ID
      const getResponse = await apiTester.authenticatedGet('/api/vendor-profile');
      const profileId = getResponse.data.profile.id;
      
      const updateData = {
        companyName: 'Updated Test Company Inc.',
        phone: '+1-555-987-6543'
      };
      
      const response = await apiTester.authenticatedPatch(`/api/vendor-profile/${profileId}`, updateData);
      expect(response.status).toBe(200);
      
      const updatedProfile = response.data;
      expect(updatedProfile.companyName).toBe(updateData.companyName);
      expect(updatedProfile.phone).toBe(updateData.phone);
    });

    it('should prevent unauthorized profile access', async () => {
      // In a real test, this would test with a different user ID
      // For now, we'll test with an invalid profile ID
      const response = await apiTester.authenticatedPatch('/api/vendor-profile/invalid-id', {
        companyName: 'Hacked Company'
      });
      expect(response.status).toBe(403);
      expect(response.data.message).toContain('Unauthorized');
    });
  });

  describe('Audit and Compliance Endpoints', () => {
    let profileId: string;

    beforeEach(async () => {
      // Get or create a test profile
      const getResponse = await apiTester.authenticatedGet('/api/vendor-profile');
      profileId = getResponse.data.profile?.id;
      
      if (!profileId) {
        const createResponse = await apiTester.authenticatedPost('/api/vendor-profile', TEST_VENDOR_DATA);
        profileId = createResponse.data.id;
      }
    });

    it('should retrieve audit logs for vendor profile', async () => {
      const response = await apiTester.authenticatedGet(`/api/vendor-profile/${profileId}/audit-logs`);
      expect(response.status).toBe(200);
      
      const logs = response.data;
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      
      // Verify audit log structure
      const log = logs[0];
      expect(log.id).toBeDefined();
      expect(log.action).toBeDefined();
      expect(log.actorName).toBeDefined();
      expect(log.timestamp).toBeDefined();
      expect(log.timeAgo).toBeDefined();
    });

    it('should export audit logs in JSON format', async () => {
      const response = await apiTester.authenticatedGet(
        `/api/vendor-profile/${profileId}/audit-logs/export?format=json`
      );
      expect(response.status).toBe(200);
      
      const exportData = response.data;
      expect(exportData.exportedAt).toBeDefined();
      expect(exportData.vendorProfile).toBeDefined();
      expect(exportData.auditLogs).toBeDefined();
      expect(Array.isArray(exportData.auditLogs)).toBe(true);
    });

    it('should export audit logs in CSV format', async () => {
      const response = await apiTester.authenticatedGet(
        `/api/vendor-profile/${profileId}/audit-logs/export?format=csv`
      );
      expect(response.status).toBe(200);
      
      const csvContent = response.data;
      expect(typeof csvContent).toBe('string');
      expect(csvContent).toContain('Timestamp,Action,Actor Name');
      expect(csvContent).toContain('\n'); // CSV should have newlines
    });

    it('should filter audit logs by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day from now
      
      const response = await apiTester.authenticatedGet(
        `/api/vendor-profile/${profileId}/audit-logs/export?format=json&startDate=${startDate}&endDate=${endDate}`
      );
      expect(response.status).toBe(200);
      
      const exportData = response.data;
      expect(exportData.dateRange.start).toBe(startDate);
      expect(exportData.dateRange.end).toBe(endDate);
    });

    it('should handle invalid date format gracefully', async () => {
      const response = await apiTester.authenticatedGet(
        `/api/vendor-profile/${profileId}/audit-logs/export?startDate=invalid-date`
      );
      expect(response.status).toBe(400);
      expect(response.data.message).toContain('Invalid startDate format');
    });

    it('should retrieve access logs for vendor profile', async () => {
      const response = await apiTester.authenticatedGet(`/api/vendor-profile/${profileId}/access-logs`);
      expect(response.status).toBe(200);
      
      const logs = response.data;
      expect(Array.isArray(logs)).toBe(true);
      
      // Verify access log structure if logs exist
      if (logs.length > 0) {
        const log = logs[0];
        expect(log.id).toBeDefined();
        expect(log.timestamp).toBeDefined();
        expect(log.timeAgo).toBeDefined();
      }
    });

    it('should retrieve data provenance for vendor profile', async () => {
      const response = await apiTester.authenticatedGet(`/api/vendor-profile/${profileId}/provenance`);
      expect(response.status).toBe(200);
      
      const provenance = response.data;
      expect(Array.isArray(provenance)).toBe(true);
      
      // Verify provenance structure if entries exist
      if (provenance.length > 0) {
        const entry = provenance[0];
        expect(entry.fieldName).toBeDefined();
        expect(entry.source).toBeDefined();
        expect(entry.method).toBeDefined();
        expect(entry.timestamp).toBeDefined();
        expect(entry.timeAgo).toBeDefined();
      }
    });
  });

  describe('System Status and Monitoring', () => {
    it('should return system status', async () => {
      const response = await apiTester.getHttpClient().get('/api/system/status');
      expect(response.status).toBe(200);
      
      const status = response.data;
      expect(status).toBeDefined();
      // System status should contain monitoring information
      expect(typeof status).toBe('object');
    });

    it('should handle login notifications', async () => {
      const response = await apiTester.authenticatedGet('/api/notifications/login');
      expect(response.status).toBe(200);
      
      const data = response.data;
      expect(data.notifications).toBeDefined();
      expect(data.sessionId).toBeDefined();
      expect(Array.isArray(data.notifications)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to authentication endpoints', async () => {
      const httpClient = apiTester.getHttpClient();
      const requests = Array(10).fill(null).map(() => 
        httpClient.get('/api/auth/user')
      );
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should apply write rate limiting to profile operations', async () => {
      const httpClient = apiTester.getHttpClient();
      const requests = Array(25).fill(null).map(() => 
        httpClient.post('/api/vendor-profile', TEST_VENDOR_DATA)
      );
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should have separate rate limits for different operations', async () => {
      const httpClient = apiTester.getHttpClient();
      
      // Test read rate limit
      const readRequests = Array(105).fill(null).map(() => 
        httpClient.get('/api/vendor-profile')
      );
      
      const readResponses = await Promise.all(readRequests);
      const readRateLimited = readResponses.filter(r => r.status === 429);
      
      // Should have some rate limited read requests
      expect(readRateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await apiTester.getHttpClient().get('/api/non-existent-endpoint');
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid JSON in request body', async () => {
      const response = await apiTester.authenticatedPost('/api/vendor-profile', 'invalid json');
      expect(response.status).toBe(400);
    });

    it('should handle malformed request data', async () => {
      const response = await apiTester.authenticatedPost('/api/vendor-profile', {
        companyName: '', // Invalid empty company name
        taxId: 'invalid-tax-id' // Invalid tax ID
      });
      expect(response.status).toBe(400);
    });

    it('should return appropriate error messages', async () => {
      const response = await apiTester.authenticatedPost('/api/vendor-profile', {
        companyName: 'Test Company'
        // Missing required fields
      });
      
      expect(response.status).toBe(400);
      expect(response.data.message).toBeDefined();
      expect(response.data.message.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    it('should validate required fields for vendor profile creation', async () => {
      const response = await apiTester.authenticatedPost('/api/vendor-profile', {
        // Missing required fields
      });
      
      expect(response.status).toBe(400);
    });

    it('should validate email format', async () => {
      const invalidData = {
        ...TEST_VENDOR_DATA,
        email: 'invalid-email-format'
      };
      
      const response = await apiTester.authenticatedPost('/api/vendor-profile', invalidData);
      expect(response.status).toBe(400);
    });

    it('should validate phone number format', async () => {
      const invalidData = {
        ...TEST_VENDOR_DATA,
        phone: 'invalid-phone'
      };
      
      const response = await apiTester.authenticatedPost('/api/vendor-profile', invalidData);
      expect(response.status).toBe(400);
    });

    it('should validate postal code format', async () => {
      const invalidData = {
        ...TEST_VENDOR_DATA,
        address: {
          ...TEST_VENDOR_DATA.address,
          postalCode: 'invalid-postal'
        }
      };
      
      const response = await apiTester.authenticatedPost('/api/vendor-profile', invalidData);
      expect(response.status).toBe(400);
    });
  });

  describe('Performance and Response Times', () => {
    it('should respond to simple requests within acceptable time', async () => {
      const start = Date.now();
      const response = await apiTester.getHttpClient().get('/api/auth/status');
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(10).fill(null).map(() => 
        apiTester.getHttpClient().get('/api/auth/status')
      );
      
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should handle 10 concurrent requests within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    });
  });
});

// Export for use in other test files
export { APITester, TEST_CONFIG, TEST_VENDOR_DATA };
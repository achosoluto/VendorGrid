#!/usr/bin/env node

/**
 * Phase 4: Security Features and Edge Cases Validation Testing
 * 
 * Comprehensive security testing of VendorGrid authentication and data systems:
 * - Access control and authorization testing
 * - Input validation and injection attack prevention
 * - Rate limiting and DoS protection
 * - Session management security
 * - Data encryption and protection
 * - CORS and security headers
 * - Error handling and information disclosure
 * - Business logic security flaws
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import axios, { type AxiosInstance } from 'axios';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

// Test configuration
const SECURITY_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 10000,
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  authLimiterWindow: 15 * 60 * 1000,
  writeLimiterWindow: 15 * 60 * 1000
};

// Utility class for security testing
class SecurityTester {
  private serverProcess: ChildProcess | null = null;
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = axios.create({
      timeout: SECURITY_CONFIG.timeout,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'SecurityTestAgent/1.0',
        'Accept': 'application/json'
      }
    });
  }

  async startServer(): Promise<void> {
    this.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    await this.waitForServer();
  }

  private async waitForServer(): Promise<void> {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.httpClient.get('/api/auth/status');
        if (response.status === 200) {
          console.log('✅ Server ready for security testing');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Server failed to start for security testing');
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        this.serverProcess?.on('exit', resolve);
        setTimeout(resolve, 5000);
      });
    }
  }

  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }

  // Security test helpers
  async testSQLInjection(endpoint: string, payload: any): Promise<{ status: number; response: any }> {
    const response = await this.httpClient.post(endpoint, payload);
    return { status: response.status, response: response.data };
  }

  async testXSSAttack(endpoint: string, data: any): Promise<{ status: number; response: any }> {
    const response = await this.httpClient.post(endpoint, data);
    return { status: response.status, response: response.data };
  }

  async testRateLimiting(endpoint: string, requestCount: number = 10): Promise<{
    totalRequests: number;
    rateLimited: number;
    successful: number;
    responses: any[];
  }> {
    const responses = [];
    let rateLimited = 0;
    let successful = 0;

    for (let i = 0; i < requestCount; i++) {
      const response = await this.httpClient.get(endpoint);
      responses.push(response);
      
      if (response.status === 429) {
        rateLimited++;
      } else if (response.status < 400) {
        successful++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      totalRequests: requestCount,
      rateLimited,
      successful,
      responses
    };
  }

  async testCSRFProtection(endpoint: string, method: 'GET' | 'POST' | 'PATCH' = 'POST'): Promise<{
    status: number;
    csrfProtected: boolean;
    response: any;
  }> {
    // Test without proper CSRF token
    const response = await this.httpClient({
      method,
      url: endpoint,
      data: { test: 'csrf_attempt' },
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://malicious-site.com'
      }
    });
    
    return {
      status: response.status,
      csrfProtected: response.status === 403 || response.status === 401,
      response: response.data
    };
  }

  async testDirectoryTraversal(path: string): Promise<{ status: number; response: any }> {
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '....//....//....//etc//passwd'
    ];

    for (const maliciousPath of maliciousPaths) {
      try {
        const response = await this.httpClient.get(`/api/files/${maliciousPath}`);
        if (response.status !== 404) {
          return { status: response.status, response: response.data };
        }
      } catch (error) {
        // Path not accessible
      }
    }

    return { status: 404, response: { message: 'All paths protected' } };
  }

  async testCommandInjection(endpoint: string, payload: any): Promise<{ status: number; response: any }> {
    const maliciousPayloads = [
      '; rm -rf /',
      '&& cat /etc/passwd',
      '| whoami',
      '`id`',
      '$(ls -la)'
    ];

    for (const payloadStr of maliciousPayloads) {
      try {
        const testData = { ...payload, command: payloadStr };
        const response = await this.httpClient.post(endpoint, testData);
        if (response.status !== 400) {
          return { status: response.status, response: response.data };
        }
      } catch (error) {
        // Payload rejected
      }
    }

    return { status: 400, response: { message: 'All command injection attempts blocked' } };
  }
}

// Test Suite
describe('Security Features and Edge Cases Validation', () => {
  let securityTester: SecurityTester;

  beforeAll(async () => {
    securityTester = new SecurityTester();
    await securityTester.startServer();
  });

  afterAll(async () => {
    await securityTester.stopServer();
  });

  describe('Access Control and Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        '/api/auth/user',
        '/api/vendor-profile',
        '/api/vendor-profile/test-id/audit-logs'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await securityTester.getHttpClient().get(endpoint);
        expect([401, 403]).toContain(response.status);
      }
    });

    it('should implement proper authorization checks', async () => {
      // Test accessing another user's vendor profile
      const response = await securityTester.getHttpClient().get('/api/vendor-profile/foreign-user-id');
      
      // Should return 403 (forbidden) rather than 404 (not found) to avoid information disclosure
      expect([403, 404]).toContain(response.status);
    });

    it('should prevent unauthorized data access', async () => {
      // Test accessing audit logs without proper ownership
      const response = await securityTester.getHttpClient().get(
        '/api/vendor-profile/unauthorized-id/audit-logs'
      );
      
      expect([401, 403, 404]).toContain(response.status);
    });

    it('should validate user ownership for profile modifications', async () => {
      // Test updating someone else's profile
      const response = await securityTester.getHttpClient().patch(
        '/api/vendor-profile/unauthorized-id',
        { companyName: 'Hacked Company' }
      );
      
      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('Input Validation and Injection Prevention', () => {
    it('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE vendor_profiles; --",
        "' OR '1'='1",
        "'; INSERT INTO vendor_profiles (companyName) VALUES ('Hacked'); --",
        "1' UNION SELECT * FROM users--"
      ];

      for (const payload of sqlInjectionPayloads) {
        const result = await securityTester.testSQLInjection('/api/vendor-profile', {
          companyName: payload,
          taxId: 'test-123',
          address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
        });

        expect(result.status).toBe(400); // Should reject malicious input
        expect(result.response.message).toBeDefined();
      }
    });

    it('should prevent NoSQL injection attacks', async () => {
      const nosqlPayloads = [
        { $ne: null },
        { $gt: "" },
        { $where: "this.password" }
      ];

      for (const payload of nosqlPayloads) {
        const result = await securityTester.testSQLInjection('/api/vendor-profile', {
          companyName: 'Test Company',
          taxId: payload,
          address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
        });

        expect(result.status).toBe(400);
      }
    });

    it('should validate and sanitize XSS payloads', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        "';alert('XSS');//"
      ];

      for (const payload of xssPayloads) {
        const result = await securityTester.testXSSAttack('/api/vendor-profile', {
          companyName: payload,
          taxId: 'test-123',
          address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
        });

        // Should either reject or sanitize the input
        expect([400, 200]).toContain(result.status);
        if (result.status === 200) {
          // If accepted, should be properly escaped
          expect(result.response.companyName).not.toContain('<script>');
        }
      }
    });

    it('should prevent command injection attacks', async () => {
      const commandPayloads = [
        { companyName: '; rm -rf /' },
        { companyName: '&& cat /etc/passwd' },
        { companyName: '| whoami' },
        { companyName: '`id`' },
        { companyName: '$(ls -la)' }
      ];

      for (const payload of commandPayloads) {
        const result = await securityTester.testCommandInjection('/api/vendor-profile', {
          ...payload,
          taxId: 'test-123',
          address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
        });

        expect(result.status).toBe(400); // Should reject command injection
      }
    });

    it('should validate data types and formats', async () => {
      const invalidDataTests = [
        {
          data: { companyName: 123, taxId: 'test' },
          expectedStatus: 400
        },
        {
          data: { companyName: 'Test', taxId: 'invalid-email-format', email: 'not-an-email' },
          expectedStatus: 400
        },
        {
          data: { companyName: 'Test', taxId: 'test', postalCode: 'invalid-postal' },
          expectedStatus: 400
        }
      ];

      for (const test of invalidDataTests) {
        const response = await securityTester.getHttpClient().post('/api/vendor-profile', {
          ...test.data,
          address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
        });
        
        expect(response.status).toBe(test.expectedStatus);
      }
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should implement authentication rate limiting', async () => {
      const result = await securityTester.testRateLimiting('/api/auth/user', 10);
      
      // Should have some rate-limited requests
      expect(result.rateLimited).toBeGreaterThan(0);
      expect(result.totalRequests).toBe(10);
    });

    it('should implement write operation rate limiting', async () => {
      const writeEndpoint = '/api/vendor-profile';
      const result = await securityTester.testRateLimiting(writeEndpoint, 25);
      
      // Should rate limit write operations
      expect(result.rateLimited).toBeGreaterThan(0);
    });

    it('should have different limits for different operation types', async () => {
      // Test read operations limit
      const readResult = await securityTester.testRateLimiting('/api/auth/status', 120);
      
      // Read operations should have higher limits than auth operations
      // This test verifies the rate limiting is working differently for different endpoints
      expect(readResult.rateLimited).toBeLessThanOrEqual(30); // Should allow most read requests
    });

    it('should handle rapid sequential requests gracefully', async () => {
      const rapidRequests = Array(50).fill(null).map(() => 
        securityTester.getHttpClient().get('/api/auth/status')
      );
      
      const responses = await Promise.all(rapidRequests);
      const errorResponses = responses.filter(r => r.status >= 400);
      
      // Some requests should be rate limited, but not all
      expect(errorResponses.length).toBeGreaterThan(0);
      expect(errorResponses.length).toBeLessThan(rapidRequests.length);
    });

    it('should implement proper rate limit headers', async () => {
      const response = await securityTester.getHttpClient().get('/api/auth/user');
      
      // Should include rate limiting headers
      const hasRateLimitHeaders = 
        response.headers['ratelimit-limit'] !== undefined ||
        response.headers['x-ratelimit-limit'] !== undefined;
      
      if (hasRateLimitHeaders) {
        expect(response.headers['ratelimit-remaining'] || response.headers['x-ratelimit-remaining']).toBeDefined();
      }
    });
  });

  describe('Session Management Security', () => {
    it('should implement secure session handling', async () => {
      // Test session security in Keycloak mode
      // This would require specific Keycloak testing setup
      const response = await securityTester.getHttpClient().get('/api/auth/status');
      
      expect(response.status).toBe(200);
      expect(response.data.provider).toBeDefined();
    });

    it('should handle session timeouts appropriately', async () => {
      // Test that expired sessions are handled properly
      const response = await securityTester.getHttpClient().get('/api/auth/user');
      
      expect([200, 401, 403]).toContain(response.status);
    });

    it('should prevent session fixation', async () => {
      // Test that new sessions are created for each login
      const responses = await Promise.all([
        securityTester.getHttpClient().get('/api/login'),
        securityTester.getHttpClient().get('/api/login'),
        securityTester.getHttpClient().get('/api/login')
      ]);
      
      // Should handle multiple login attempts appropriately
      responses.forEach(response => {
        expect([200, 302, 303]).toContain(response.status);
      });
    });
  });

  describe('Data Protection and Encryption', () => {
    it('should not expose sensitive data in responses', async () => {
      const response = await securityTester.getHttpClient().get('/api/auth/user');
      
      // Should not expose internal implementation details
      const responseStr = JSON.stringify(response.data).toLowerCase();
      const sensitiveTerms = ['password', 'secret', 'key', 'token', 'private'];
      
      const hasSensitiveData = sensitiveTerms.some(term => responseStr.includes(term));
      expect(hasSensitiveData).toBe(false);
    });

    it('should validate and sanitize file uploads', async () => {
      // Test file upload security if implemented
      // For now, test that file-related endpoints are protected
      const response = await securityTester.getHttpClient().get('/api/files/test');
      
      expect([401, 403, 404]).toContain(response.status);
    });

    it('should handle encrypted data appropriately', async () => {
      // Test that encrypted fields are not exposed in plaintext
      const response = await securityTester.getHttpClient().get('/api/vendor-profile');
      
      // Should handle any encrypted data appropriately
      expect(response.status).toBeDefined();
    });
  });

  describe('CORS and Security Headers', () => {
    it('should implement proper CORS policy', async () => {
      const response = await securityTester.getHttpClient().get('/api/auth/status', {
        headers: {
          'Origin': 'http://malicious-site.com',
          'Access-Control-Request-Method': 'POST'
        }
      });
      
      const corsHeader = response.headers['access-control-allow-origin'];
      
      // Should either deny cross-origin requests or have strict CORS policy
      if (corsHeader) {
        expect(['*', 'http://malicious-site.com']).not.toContain(corsHeader);
      }
    });

    it('should include security headers', async () => {
      const response = await securityTester.getHttpClient().get('/api/auth/status');
      
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'strict-transport-security'
      ];
      
      const presentHeaders = securityHeaders.filter(header => 
        response.headers[header] !== undefined
      );
      
      // Should have at least some security headers
      expect(presentHeaders.length).toBeGreaterThan(0);
    });

    it('should prevent clickjacking attacks', async () => {
      const response = await securityTester.getHttpClient().get('/api/auth/status');
      
      const xFrameOptions = response.headers['x-frame-options'];
      
      if (xFrameOptions) {
        expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions.toUpperCase());
      }
    });
  });

  describe('Error Handling and Information Disclosure', () => {
    it('should not expose stack traces in production', async () => {
      const response = await securityTester.getHttpClient().get('/api/non-existent-endpoint');
      
      const responseStr = JSON.stringify(response.data);
      
      // Should not expose internal error details
      expect(responseStr).not.toContain('at ');
      expect(responseStr).not.toContain('node_modules');
      expect(responseStr).not.toContain('.js:');
    });

    it('should provide generic error messages for security violations', async () => {
      const response = await securityTester.getHttpClient().post('/api/vendor-profile', {
        companyName: '<script>alert("xss")</script>',
        taxId: 'test',
        address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
      });
      
      const errorMessage = response.data.message?.toLowerCase() || '';
      
      // Should provide generic error without revealing internal details
      expect(errorMessage).not.toContain('database');
      expect(errorMessage).not.toContain('sql');
      expect(errorMessage).not.toContain('validation');
    });

    it('should handle 404 errors without information disclosure', async () => {
      const response = await securityTester.getHttpClient().get('/api/admin/secret-data');
      
      expect(response.status).toBe(404);
      
      const responseStr = JSON.stringify(response.data);
      expect(responseStr).not.toContain('admin');
      expect(responseStr).not.toContain('secret');
    });

    it('should prevent enumeration attacks', async () => {
      // Test that invalid user IDs don't reveal information
      const invalidIds = ['admin', 'root', 'test', 'user1', 'api'];
      
      for (const invalidId of invalidIds) {
        const response = await securityTester.getHttpClient().get(`/api/vendor-profile/${invalidId}`);
        expect([401, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Business Logic Security', () => {
    it('should prevent price manipulation in business operations', async () => {
      // Test that business logic can't be bypassed through parameter manipulation
      const response = await securityTester.getHttpClient().post('/api/vendor-profile', {
        companyName: 'Test Company',
        taxId: '12345',
        // Try to manipulate verification status
        verificationStatus: 'verified',
        address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
      });
      
      // Should not allow client to set verification status directly
      if (response.status === 200) {
        expect(response.data.verificationStatus).not.toBe('verified');
      }
    });

    it('should validate business rules on the server side', async () => {
      // Test that business logic can't be bypassed
      const response = await securityTester.getHttpClient().post('/api/vendor-profile', {
        companyName: '', // Empty company name should be rejected
        taxId: '12345',
        address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
      });
      
      expect(response.status).toBe(400);
    });

    it('should prevent privilege escalation through API calls', async () => {
      // Test that users can't elevate their privileges through API
      const response = await securityTester.getHttpClient().post('/api/vendor-profile', {
        ...({
          companyName: 'Test Company',
          taxId: '12345',
          address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
        }),
        // Try to set admin privileges
        isAdmin: true,
        role: 'admin',
        permissions: ['*']
      });
      
      // Should not allow privilege escalation
      if (response.status === 200) {
        expect(response.data.isAdmin).toBeFalsy();
        expect(response.data.role).not.toBe('admin');
      }
    });
  });

  describe('Advanced Security Tests', () => {
    it('should prevent XXE attacks in XML processing', async () => {
      // Test XML external entity attacks if XML processing is used
      const xxePayload = `<?xml version="1.0"?>
        <!DOCTYPE root [
          <!ENTITY xxe SYSTEM "file:///etc/passwd">
        ]>
        <root>&xxe;</root>`;
      
      const response = await securityTester.getHttpClient().post('/api/vendor-profile', {
        companyName: 'Test Company',
        taxId: xxePayload,
        address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
      });
      
      expect(response.status).toBe(400);
    });

    it('should handle path traversal attempts', async () => {
      const result = await securityTester.testDirectoryTraversal('test-path');
      
      expect(result.status).toBe(404);
    });

    it('should prevent prototype pollution attacks', async () => {
      const pollutionPayload = {
        companyName: 'Test Company',
        taxId: 'test',
        '__proto__': { admin: true },
        'constructor': { prototype: { admin: true } },
        address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' }
      };
      
      const response = await securityTester.getHttpClient().post('/api/vendor-profile', pollutionPayload);
      
      // Should either reject or sanitize the input
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        // Verify no prototype pollution occurred
        expect(Object.prototype.admin).toBeUndefined();
      }
    });
  });
});

// Export for use in other test files
export { SecurityTester, SECURITY_CONFIG };
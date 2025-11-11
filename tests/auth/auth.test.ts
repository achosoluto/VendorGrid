#!/usr/bin/env node

/**
 * Phase 4: Authentication Flow Testing Suite
 * 
 * Comprehensive testing of dual authentication system (Mock + Keycloak)
 * Tests authentication flows, session management, and provider switching.
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
  vendorgridRealmUrl: 'http://localhost:8080/realms/vendorgrid',
  adminUser: { username: 'admin', password: 'admin123' },
  mockUser: {
    id: 'dev-user-123',
    email: 'developer@vendorgrid.local',
    firstName: 'Dev',
    lastName: 'User'
  }
};

// Utility functions for test management
class TestManager {
  private serverProcess: ChildProcess | null = null;
  private keycloakProcess: ChildProcess | null = null;
  private httpClient: AxiosInstance;
  private originalEnv: NodeJS.ProcessEnv;

  constructor() {
    this.httpClient = axios.create({
      timeout: TEST_CONFIG.timeout,
      validateStatus: () => true // Don't throw on 4xx/5xx responses
    });
    this.originalEnv = { ...process.env };
  }

  async startServer(provider: 'mock' | 'keycloak' = 'mock'): Promise<void> {
    // Set authentication provider
    process.env.AUTH_PROVIDER = provider;
    
    // Start the server
    this.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../..'),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to start
    await this.waitForServer();
  }

  async startKeycloak(): Promise<void> {
    // Start Keycloak infrastructure
    this.keycloakProcess = spawn('./keycloak-init/start-keycloak.sh', ['start'], {
      cwd: path.resolve(__dirname, '../..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for Keycloak to be ready
    await this.waitForKeycloak();
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

  private async waitForKeycloak(): Promise<void> {
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.httpClient.get(TEST_CONFIG.vendorgridRealmUrl);
        if (response.status === 200) {
          console.log('✅ Keycloak started successfully');
          return;
        }
      } catch (error) {
        // Keycloak not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error('Keycloak failed to start within timeout');
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

  async stopKeycloak(): Promise<void> {
    if (this.keycloakProcess) {
      this.keycloakProcess.kill('SIGTERM');
      await new Promise(resolve => {
        this.keycloakProcess?.on('exit', resolve);
        setTimeout(resolve, 5000); // Force kill after 5 seconds
      });
    }
  }

  async switchAuthProvider(provider: 'mock' | 'keycloak'): Promise<void> {
    // Update .env file
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      const updatedLines = lines.map(line => {
        if (line.startsWith('AUTH_PROVIDER=')) {
          return `AUTH_PROVIDER=${provider}`;
        }
        return line;
      });
      
      if (!updatedLines.some(line => line.startsWith('AUTH_PROVIDER='))) {
        updatedLines.push(`AUTH_PROVIDER=${provider}`);
      }
      
      fs.writeFileSync(envPath, updatedLines.join('\n'));
    }
    
    process.env.AUTH_PROVIDER = provider;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/auth/status');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async reset(): Promise<void> {
    // Restore original environment
    process.env = { ...this.originalEnv };
    
    // Clean up processes
    await this.stopServer();
    await this.stopKeycloak();
  }

  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }
}

// Test Suite
describe('Authentication Flow Testing', () => {
  let testManager: TestManager;

  beforeAll(async () => {
    testManager = new TestManager();
  });

  afterAll(async () => {
    await testManager.reset();
  });

  describe('Mock Authentication Tests', () => {
    beforeAll(async () => {
      await testManager.startServer('mock');
    });

    it('should start with mock authentication', async () => {
      const status = await testManager.healthCheck();
      expect(status).toBe(true);
    });

    it('should allow mock user access without credentials', async () => {
      const httpClient = testManager.getHttpClient();
      
      // Test protected endpoint access
      const response = await httpClient.get('/api/auth/user');
      expect(response.status).toBe(200);
      
      const user = response.data;
      expect(user.email).toBe(TEST_CONFIG.mockUser.email);
      expect(user.firstName).toBe(TEST_CONFIG.mockUser.firstName);
      expect(user.lastName).toBe(TEST_CONFIG.mockUser.lastName);
    });

    it('should handle mock login flow', async () => {
      const httpClient = testManager.getHttpClient();
      
      const response = await httpClient.get('/api/login');
      expect(response.status).toBe(200);
      
      const data = response.data;
      expect(data.message).toContain('Mock login successful');
      expect(data.user).toBeDefined();
    });

    it('should handle mock logout flow', async () => {
      const httpClient = testManager.getHttpClient();
      
      const response = await httpClient.get('/api/logout');
      expect(response.status).toBe(200);
      
      const data = response.data;
      expect(data.message).toContain('Mock logout successful');
    });

    it('should maintain mock session across requests', async () => {
      const httpClient = testManager.getHttpClient();
      
      // Make multiple requests and verify consistent user data
      const responses = await Promise.all([
        httpClient.get('/api/auth/user'),
        httpClient.get('/api/auth/user'),
        httpClient.get('/api/auth/user')
      ]);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        const user = response.data;
        expect(user.email).toBe(TEST_CONFIG.mockUser.email);
      });
    });
  });

  describe('Keycloak Authentication Tests', () => {
    beforeAll(async () => {
      // Start Keycloak infrastructure first
      await testManager.startKeycloak();
      
      // Switch to Keycloak authentication
      await testManager.switchAuthProvider('keycloak');
      
      // Restart server with Keycloak
      await testManager.stopServer();
      await testManager.startServer('keycloak');
    });

    it('should start with Keycloak authentication', async () => {
      const status = await testManager.healthCheck();
      expect(status).toBe(true);
    });

    it('should have Keycloak realm accessible', async () => {
      const httpClient = testManager.getHttpClient();
      
      const response = await httpClient.get(TEST_CONFIG.vendorgridRealmUrl);
      expect(response.status).toBe(200);
    });

    it('should require authentication for protected endpoints', async () => {
      const httpClient = testManager.getHttpClient();
      
      const response = await httpClient.get('/api/auth/user');
      expect(response.status).toBe(401);
    });

    it('should redirect to Keycloak login for unauthenticated users', async () => {
      const httpClient = testManager.getHttpClient();
      
      const response = await httpClient.get('/api/login', { 
        maxRedirects: 0,
        validateStatus: () => true 
      });
      
      // Should redirect to Keycloak
      expect([302, 303]).toContain(response.status);
    });

    it('should support OIDC discovery endpoint', async () => {
      const httpClient = testManager.getHttpClient();
      
      const response = await httpClient.get(`${TEST_CONFIG.vendorgridRealmUrl}/.well-known/openid_configuration`);
      expect(response.status).toBe(200);
      
      const config = response.data;
      expect(config.authorization_endpoint).toBeDefined();
      expect(config.token_endpoint).toBeDefined();
      expect(config.issuer).toBeDefined();
    });
  });

  describe('Provider Switching Tests', () => {
    beforeAll(async () => {
      await testManager.startServer('mock');
    });

    it('should switch from mock to Keycloak', async () => {
      // Start with mock
      let status = await testManager.healthCheck();
      expect(status).toBe(true);

      // Switch to Keycloak
      await testManager.switchAuthProvider('keycloak');
      await testManager.stopServer();
      await testManager.startServer('keycloak');

      // Verify Keycloak is active
      status = await testManager.healthCheck();
      expect(status).toBe(true);

      // Try accessing protected endpoint (should require auth now)
      const httpClient = testManager.getHttpClient();
      const response = await httpClient.get('/api/auth/user');
      expect(response.status).toBe(401);
    });

    it('should switch back to mock authentication', async () => {
      // Switch back to mock
      await testManager.switchAuthProvider('mock');
      await testManager.stopServer();
      await testManager.startServer('mock');

      // Verify mock is active
      const httpClient = testManager.getHttpClient();
      const response = await httpClient.get('/api/auth/user');
      expect(response.status).toBe(200);
      
      const user = response.data;
      expect(user.email).toBe(TEST_CONFIG.mockUser.email);
    });
  });
});

// Export for use in other test files
export { TestManager, TEST_CONFIG };
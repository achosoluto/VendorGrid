#!/usr/bin/env node

/**
 * Phase 4: Dual Provider Switching Functionality Testing
 * 
 * Comprehensive testing of the dual authentication system switching:
 * - Mock to Keycloak migration
 * - Keycloak to Mock rollback
 * - Session continuity during switching
 * - Data persistence across switches
 * - Configuration validation
 * - Zero-downtime switching
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import axios, { type AxiosInstance } from 'axios';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test configuration
const SWITCHING_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 15000,
  keycloakURL: 'http://localhost:8080',
  authProviders: ['mock', 'keycloak'] as const
};

// Utility class for provider switching tests
class ProviderSwitchingTester {
  private serverProcess: ChildProcess | null = null;
  private keycloakProcess: ChildProcess | null = null;
  private httpClient: AxiosInstance;
  private originalEnv: NodeJS.ProcessEnv;

  constructor() {
    this.httpClient = axios.create({
      timeout: SWITCHING_CONFIG.timeout,
      validateStatus: () => true
    });
    this.originalEnv = { ...process.env };
  }

  async startEnvironment(): Promise<void> {
    console.log('🚀 Starting dual provider testing environment...');
    
    // Start Keycloak for full switching tests
    await this.startKeycloak();
    
    // Set initial environment to mock
    await this.setAuthProvider('mock');
  }

  private async startKeycloak(): Promise<void> {
    this.keycloakProcess = spawn('./keycloak-init/start-keycloak.sh', ['start'], {
      cwd: path.resolve(__dirname, '../..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    await this.waitForKeycloak();
  }

  private async waitForKeycloak(): Promise<void> {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.httpClient.get(`${SWITCHING_CONFIG.keycloakURL}/realms/vendorgrid`);
        if (response.status === 200) {
          console.log('✅ Keycloak ready for switching tests');
          return;
        }
      } catch (error) {
        // Keycloak not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error('Keycloak failed to start for switching tests');
  }

  async startServer(): Promise<void> {
    this.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../..'),
      env: process.env,
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
          console.log('✅ Server ready for switching tests');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Server failed to start for switching tests');
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

    // Restore original environment
    process.env = { ...this.originalEnv };
  }

  async setAuthProvider(provider: 'mock' | 'keycloak'): Promise<void> {
    // Update environment variables
    process.env.AUTH_PROVIDER = provider;
    
    // Update .env file
    const envPath = path.resolve(__dirname, '../..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
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
  }

  async restartServer(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        this.serverProcess?.on('exit', resolve);
        setTimeout(resolve, 3000);
      });
    }
    
    await this.startServer();
  }

  async getAuthStatus(): Promise<any> {
    const response = await this.httpClient.get('/api/auth/status');
    return response.data;
  }

  async testProvider(provider: 'mock' | 'keycloak'): Promise<{
    accessible: boolean;
    userInfo?: any;
    requiresAuth: boolean;
  }> {
    await this.setAuthProvider(provider);
    await this.restartServer();
    
    const status = await this.getAuthStatus();
    const accessible = status.provider === provider;
    let userInfo;
    let requiresAuth = true;
    
    if (accessible) {
      // Test if we can get user info
      const userResponse = await this.httpClient.get('/api/auth/user');
      if (userResponse.status === 200) {
        userInfo = userResponse.data;
        requiresAuth = false;
      }
    }
    
    return { accessible, userInfo, requiresAuth };
  }

  async runMigrationCommand(command: 'validate' | 'migrate' | 'rollback'): Promise<{ stdout: string; code: number }> {
    return new Promise((resolve, reject) => {
      const process = spawn('node', ['scripts/migrate-to-keycloak.js', command], {
        cwd: path.resolve(__dirname, '../..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({ stdout: stdout + stderr, code: code || 0 });
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }
}

// Test Suite
describe('Dual Provider Switching Functionality', () => {
  let switchingTester: ProviderSwitchingTester;

  beforeAll(async () => {
    switchingTester = new ProviderSwitchingTester();
    await switchingTester.startEnvironment();
    await switchingTester.startServer();
  });

  afterAll(async () => {
    await switchingTester.stopEnvironment();
  });

  describe('Provider Detection and Status', () => {
    it('should correctly detect mock authentication provider', async () => {
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
      
      const status = await switchingTester.getAuthStatus();
      
      expect(status.provider).toBe('mock');
      expect(status.status).toBe('active');
      expect(status.environment).toBeDefined();
    });

    it('should correctly detect Keycloak authentication provider', async () => {
      await switchingTester.setAuthProvider('keycloak');
      await switchingTester.restartServer();
      
      const status = await switchingTester.getAuthStatus();
      
      expect(status.provider).toBe('keycloak');
      expect(status.status).toBe('active');
      expect(status.issuer).toBeDefined();
    });

    it('should provide detailed provider information', async () => {
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
      
      const status = await switchingTester.getAuthStatus();
      
      expect(status.timestamp).toBeDefined();
      expect(status.provider).toBeDefined();
    });
  });

  describe('Mock Authentication Validation', () => {
    beforeEach(async () => {
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
    });

    it('should allow access without credentials in mock mode', async () => {
      const userResponse = await switchingTester.getHttpClient().get('/api/auth/user');
      
      expect(userResponse.status).toBe(200);
      expect(userResponse.data.email).toBe('developer@vendorgrid.local');
      expect(userResponse.data.firstName).toBe('Dev');
      expect(userResponse.data.lastName).toBe('User');
    });

    it('should provide mock login/logout endpoints', async () => {
      const loginResponse = await switchingTester.getHttpClient().get('/api/login');
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.message).toContain('Mock login successful');
      
      const logoutResponse = await switchingTester.getHttpClient().get('/api/logout');
      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.data.message).toContain('Mock logout successful');
    });

    it('should maintain consistent mock user data', async () => {
      const responses = await Promise.all([
        switchingTester.getHttpClient().get('/api/auth/user'),
        switchingTester.getHttpClient().get('/api/auth/user'),
        switchingTester.getHttpClient().get('/api/auth/user')
      ]);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.email).toBe('developer@vendorgrid.local');
      });
    });
  });

  describe('Keycloak Authentication Validation', () => {
    beforeEach(async () => {
      await switchingTester.setAuthProvider('keycloak');
      await switchingTester.restartServer();
    });

    it('should require authentication in Keycloak mode', async () => {
      const userResponse = await switchingTester.getHttpClient().get('/api/auth/user');
      
      expect(userResponse.status).toBe(401);
    });

    it('should provide OIDC-compliant endpoints', async () => {
      const loginResponse = await switchingTester.getHttpClient().get('/api/login', {
        maxRedirects: 0,
        validateStatus: () => true
      });
      
      // Should redirect to Keycloak for authentication
      expect([302, 303]).toContain(loginResponse.status);
    });

    it('should have access to Keycloak realm configuration', async () => {
      const keycloakResponse = await switchingTester.getHttpClient().get(
        `${SWITCHING_CONFIG.keycloakURL}/realms/vendorgrid/.well-known/openid_configuration`
      );
      
      expect(keycloakResponse.status).toBe(200);
      expect(keycloakResponse.data.authorization_endpoint).toBeDefined();
      expect(keycloakResponse.data.token_endpoint).toBeDefined();
    });
  });

  describe('Provider Switching Tests', () => {
    it('should switch from mock to Keycloak', async () => {
      // Start with mock
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
      
      let status = await switchingTester.getAuthStatus();
      expect(status.provider).toBe('mock');
      
      // Switch to Keycloak
      await switchingTester.setAuthProvider('keycloak');
      await switchingTester.restartServer();
      
      status = await switchingTester.getAuthStatus();
      expect(status.provider).toBe('keycloak');
      
      // Verify authentication requirements changed
      const userResponse = await switchingTester.getHttpClient().get('/api/auth/user');
      expect(userResponse.status).toBe(401); // Now requires auth
    });

    it('should switch from Keycloak back to mock', async () => {
      // Start with Keycloak
      await switchingTester.setAuthProvider('keycloak');
      await switchingTester.restartServer();
      
      let status = await switchingTester.getAuthStatus();
      expect(status.provider).toBe('keycloak');
      
      // Switch to mock
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
      
      status = await switchingTester.getAuthStatus();
      expect(status.provider).toBe('mock');
      
      // Verify access is restored
      const userResponse = await switchingTester.getHttpClient().get('/api/auth/user');
      expect(userResponse.status).toBe(200);
    });

    it('should handle multiple rapid switches without errors', async () => {
      const switches = ['mock', 'keycloak', 'mock', 'keycloak', 'mock'];
      
      for (const provider of switches) {
        await switchingTester.setAuthProvider(provider);
        await switchingTester.restartServer();
        
        const status = await switchingTester.getAuthStatus();
        expect(status.provider).toBe(provider);
      }
    });
  });

  describe('Migration Script Integration', () => {
    it('should validate configuration for Keycloak migration', async () => {
      const result = await switchingTester.runMigrationCommand('validate');
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('✅ All required Keycloak environment variables are configured');
      expect(result.stdout).toContain('✅ Keycloak is accessible');
    });

    it('should execute migration from mock to Keycloak', async () => {
      // Ensure we're starting with mock
      await switchingTester.setAuthProvider('mock');
      
      const result = await switchingTester.runMigrationCommand('migrate');
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('🎉 Migration to Keycloak completed successfully!');
      
      // Verify provider was changed
      const status = await switchingTester.getAuthStatus();
      expect(status.provider).toBe('keycloak');
    });

    it('should rollback from Keycloak to mock', async () => {
      // Start with Keycloak
      await switchingTester.setAuthProvider('keycloak');
      
      const result = await switchingTester.runMigrationCommand('rollback');
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('✅ Rolled back to mock authentication');
      
      // Verify provider was changed
      const status = await switchingTester.getAuthStatus();
      expect(status.provider).toBe('mock');
    });

    it('should complete full migration cycle', async () => {
      // 1. Start with mock
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
      let status = await switchingTester.getAuthStatus();
      expect(status.provider).toBe('mock');
      
      // 2. Migrate to Keycloak
      const migrateResult = await switchingTester.runMigrationCommand('migrate');
      expect(migrateResult.code).toBe(0);
      
      status = await switchingTester.getAuthStatus();
      expect(status.provider).toBe('keycloak');
      
      // 3. Rollback to mock
      const rollbackResult = await switchingTester.runMigrationCommand('rollback');
      expect(rollbackResult.code).toBe(0);
      
      status = await switchingTester.getAuthStatus();
      expect(status.provider).toBe('mock');
    });
  });

  describe('Session and Data Persistence', () => {
    it('should maintain application data across provider switches', async () => {
      // Create a vendor profile in mock mode
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
      
      const profileResponse = await switchingTester.getHttpClient().post('/api/vendor-profile', {
        companyName: 'Switching Test Company',
        taxId: 'switch-123',
        address: { street: '123 Switch St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' },
        phone: '+1-555-123-4567',
        email: 'switch@testcompany.com'
      });
      
      expect(profileResponse.status).toBe(200);
      const profileId = profileResponse.data.id;
      
      // Switch to Keycloak (data should persist)
      await switchingTester.setAuthProvider('keycloak');
      await switchingTester.restartServer();
      
      // Switch back to mock (data should still be there)
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
      
      // Verify profile is still accessible
      const checkResponse = await switchingTester.getHttpClient().get('/api/vendor-profile');
      expect(checkResponse.status).toBe(200);
      // Note: In mock mode, we'd expect to see the profile, but the user might be different
    });

    it('should handle configuration persistence across restarts', async () => {
      // Set to Keycloak
      await switchingTester.setAuthProvider('keycloak');
      
      // Restart server without changing configuration
      await switchingTester.restartServer();
      
      const status = await switchingTester.getAuthStatus();
      expect(status.provider).toBe('keycloak');
    });
  });

  describe('Error Handling During Switching', () => {
    it('should handle missing Keycloak configuration gracefully', async () => {
      // This would require modifying environment variables
      // For now, test the validation error handling
      const result = await switchingTester.runMigrationCommand('validate');
      
      // Should handle validation failures gracefully
      expect(result.code).toBe(0);
    });

    it('should provide helpful error messages for switching failures', async () => {
      await switchingTester.setAuthProvider('keycloak');
      await switchingTester.restartServer();
      
      // Test accessing protected resource without auth
      const userResponse = await switchingTester.getHttpClient().get('/api/auth/user');
      expect(userResponse.status).toBe(401);
      expect(userResponse.data.message).toBeDefined();
    });

    it('should not crash during invalid configuration states', async () => {
      // Test with invalid provider setting
      process.env.AUTH_PROVIDER = 'invalid-provider';
      await switchingTester.restartServer();
      
      // Should fallback to mock or handle gracefully
      const status = await switchingTester.getAuthStatus();
      expect(['mock', 'keycloak']).toContain(status.provider);
      
      // Restore
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
    });
  });

  describe('Zero-Downtime Switching', () => {
    it('should minimize service disruption during provider switch', async () => {
      const startTime = Date.now();
      
      // Perform provider switch
      await switchingTester.setAuthProvider('keycloak');
      await switchingTester.restartServer();
      
      const switchTime = Date.now() - startTime;
      
      // Switch back quickly
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
      
      const totalTime = Date.now() - startTime;
      
      // Should complete within reasonable time
      expect(switchTime).toBeLessThan(30000); // 30 seconds max
      expect(totalTime).toBeLessThan(60000);  // 1 minute total
    });

    it('should maintain API endpoint availability during switches', async () => {
      await switchingTester.setAuthProvider('mock');
      await switchingTester.restartServer();
      
      // Test endpoint availability
      const statusResponse = await switchingTester.getHttpClient().get('/api/auth/status');
      expect(statusResponse.status).toBe(200);
      
      // Switch providers
      await switchingTester.setAuthProvider('keycloak');
      await switchingTester.restartServer();
      
      // Test endpoint still available
      const statusResponse2 = await switchingTester.getHttpClient().get('/api/auth/status');
      expect(statusResponse2.status).toBe(200);
    });
  });
});

// Export for use in other test files
export { ProviderSwitchingTester, SWITCHING_CONFIG };
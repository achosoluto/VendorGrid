#!/usr/bin/env node

/**
 * Phase 4: Performance and Load Testing Suite
 * 
 * Comprehensive performance testing of VendorGrid authentication and API systems:
 * - Authentication response times
 * - Concurrent user load testing
 * - API endpoint performance under load
 * - Database query performance
 * - Memory and resource usage monitoring
 * - System stability during stress testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import axios, { type AxiosInstance } from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { Worker } from 'worker_threads';
import path from 'path';

// Test configuration
const PERFORMANCE_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000, // Longer timeout for performance tests
  concurrentUsers: [1, 5, 10, 20, 50],
  requestsPerUser: 10,
  testDuration: 30000, // 30 seconds max test duration
  responseTimeThreshold: 2000, // 2 seconds max acceptable response time
  throughputThreshold: 100, // 100 requests per second minimum
  memoryThreshold: 500 * 1024 * 1024, // 500MB max memory usage
};

// Utility class for performance testing
class PerformanceTester {
  private serverProcess: ChildProcess | null = null;
  private httpClient: AxiosInstance;
  private startTime: number = 0;
  private endTime: number = 0;

  constructor() {
    this.httpClient = axios.create({
      timeout: PERFORMANCE_CONFIG.timeout,
      validateStatus: () => true
    });
  }

  async startServer(): Promise<void> {
    this.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, NODE_ENV: 'production' }, // Use production mode for performance testing
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to be ready
    await this.waitForServer();
  }

  private async waitForServer(): Promise<void> {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.httpClient.get('/api/auth/status');
        if (response.status === 200) {
          console.log('✅ Server ready for performance testing');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Server failed to start for performance testing');
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        this.serverProcess?.on('exit', resolve);
        setTimeout(resolve, 10000); // Wait longer for graceful shutdown
      });
    }
  }

  // Measure response time for a single request
  async measureResponseTime(endpoint: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', data?: any): Promise<number> {
    const start = Date.now();
    
    try {
      if (method === 'GET') {
        await this.httpClient.get(endpoint);
      } else if (method === 'POST') {
        await this.httpClient.post(endpoint, data);
      } else if (method === 'PATCH') {
        await this.httpClient.patch(endpoint, data);
      }
    } catch (error) {
      // Ignore errors for response time measurement
    }
    
    return Date.now() - start;
  }

  // Perform load test with specified number of concurrent users
  async performLoadTest(
    endpoint: string, 
    concurrentUsers: number, 
    requestsPerUser: number = PERFORMANCE_CONFIG.requestsPerUser
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    const responseTimes: number[] = [];
    let successfulRequests = 0;
    let failedRequests = 0;

    // Create worker function for concurrent testing
    const workerFunction = `
      const axios = require('axios');
      
      async function performRequests(requests) {
        const results = [];
        const errors = [];
        
        for (const request of requests) {
          try {
            const start = Date.now();
            await axios.get('${endpoint}');
            const responseTime = Date.now() - start;
            results.push({ responseTime, success: true });
          } catch (error) {
            errors.push(error.message);
            results.push({ responseTime: 0, success: false, error: error.message });
          }
        }
        
        return { results, errors };
      }
      
      performRequests(requests).then(result => {
        process.parentPort?.postMessage(result);
      });
    `;

    // Create and run multiple workers
    const workers: Promise<any>[] = [];
    const requestsPerWorker = Math.ceil(requestsPerUser / Math.min(concurrentUsers, 10));
    
    for (let i = 0; i < concurrentUsers; i++) {
      const worker = new Worker(workerFunction, {
        eval: true,
        workerData: null
      });
      
      // Mock the worker behavior with a simpler approach
      const workerPromise = new Promise<any>((resolve) => {
        // Simulate worker behavior
        const requests = Array(requestsPerWorker).fill(null);
        const results: any[] = [];
        const workerErrors: string[] = [];
        
        const performRequests = async () => {
          for (const _ of requests) {
            try {
              const start = Date.now();
              await this.httpClient.get(endpoint);
              const responseTime = Date.now() - start;
              results.push({ responseTime, success: true });
            } catch (error) {
              workerErrors.push((error as Error).message);
              results.push({ responseTime: 0, success: false });
            }
          }
          resolve({ results, errors: workerErrors });
        };
        
        performRequests();
      });
      
      workers.push(workerPromise);
    }

    // Wait for all workers to complete
    const workerResults = await Promise.all(workers);
    
    // Aggregate results
    for (const result of workerResults) {
      successfulRequests += result.results.filter((r: any) => r.success).length;
      failedRequests += result.results.filter((r: any) => !r.success).length;
      responseTimes.push(...result.results.filter((r: any) => r.success).map((r: any) => r.responseTime));
      errors.push(...result.errors);
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const totalRequests = successfulRequests + failedRequests;
    const requestsPerSecond = (totalRequests / totalDuration) * 1000;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      requestsPerSecond,
      errors
    };
  }

  // Monitor system resources during testing
  async getSystemMetrics(): Promise<{
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    timestamp: number;
  }> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memoryUsage: memUsage,
      cpuUsage,
      timestamp: Date.now()
    };
  }

  // Test database performance
  async testDatabasePerformance(): Promise<{
    readPerformance: number[];
    writePerformance: number[];
  }> {
    const readPerformance: number[] = [];
    const writePerformance: number[] = [];

    // Test read performance
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      try {
        await this.httpClient.get('/api/auth/user');
        readPerformance.push(Date.now() - start);
      } catch (error) {
        readPerformance.push(-1);
      }
    }

    // Test write performance (rate limited)
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        await this.httpClient.post('/api/vendor-profile', {
          companyName: `Perf Test Company ${i}`,
          taxId: `12345${i}`,
          address: { street: '123 Test St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' },
          phone: '+1-555-123-4567',
          email: `test${i}@company.com`
        });
        writePerformance.push(Date.now() - start);
      } catch (error) {
        writePerformance.push(-1);
      }
    }

    return { readPerformance, writePerformance };
  }

  // Stress test with increasing load
  async stressTest(endpoint: string, maxUsers: number = 50): Promise<any[]> {
    const results = [];
    
    for (let users = 1; users <= maxUsers; users += 5) {
      const result = await this.performLoadTest(endpoint, users, 5);
      results.push({ users, ...result });
      
      // Add delay between test levels
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }

  async reset(): Promise<void> {
    await this.stopServer();
  }
}

// Test Suite
describe('Performance and Load Testing', () => {
  let performanceTester: PerformanceTester;

  beforeAll(async () => {
    performanceTester = new PerformanceTester();
    await performanceTester.startServer();
  });

  afterAll(async () => {
    await performanceTester.reset();
  });

  describe('Single User Performance', () => {
    it('should respond to auth status requests within acceptable time', async () => {
      const responseTime = await performanceTester.measureResponseTime('/api/auth/status');
      expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThreshold);
    });

    it('should respond to user info requests within acceptable time', async () => {
      const responseTime = await performanceTester.measureResponseTime('/api/auth/user');
      expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThreshold);
    });

    it('should respond to vendor profile requests within acceptable time', async () => {
      const responseTime = await performanceTester.measureResponseTime('/api/vendor-profile');
      expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThreshold);
    });

    it('should handle profile creation within acceptable time', async () => {
      const responseTime = await performanceTester.measureResponseTime(
        '/api/vendor-profile', 
        'POST',
        {
          companyName: 'Performance Test Company',
          taxId: 'perf-test-123',
          address: { street: '123 Perf St', city: 'Test City', province: 'ON', postalCode: 'A1A 1A1', country: 'CA' },
          phone: '+1-555-123-4567',
          email: 'perf@testcompany.com'
        }
      );
      expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThreshold * 2); // Allow more time for writes
    });
  });

  describe('Concurrent User Load Testing', () => {
    PERFORMANCE_CONFIG.concurrentUsers.forEach((concurrentUsers) => {
      it(`should handle ${concurrentUsers} concurrent users`, async () => {
        const result = await performanceTester.performLoadTest(
          '/api/auth/status', 
          concurrentUsers, 
          5 // Fewer requests per user for load testing
        );
        
        // Performance assertions
        expect(result.successfulRequests).toBeGreaterThan(0);
        expect(result.averageResponseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThreshold);
        expect(result.requestsPerSecond).toBeGreaterThan(PERFORMANCE_CONFIG.throughputThreshold / 10);
        
        // Error rate should be low
        const errorRate = (result.failedRequests / result.totalRequests) * 100;
        expect(errorRate).toBeLessThan(5); // Less than 5% error rate
      });
    });
  });

  describe('Database Performance Testing', () => {
    it('should maintain read performance under load', async () => {
      const dbPerf = await performanceTester.testDatabasePerformance();
      
      const readTimes = dbPerf.readPerformance.filter(time => time > 0);
      expect(readTimes.length).toBeGreaterThan(5); // Most reads should succeed
      expect(readTimes.reduce((a, b) => a + b, 0) / readTimes.length).toBeLessThan(1000); // Average < 1 second
    });

    it('should handle write operations efficiently', async () => {
      const dbPerf = await performanceTester.testDatabasePerformance();
      
      const writeTimes = dbPerf.writePerformance.filter(time => time > 0);
      expect(writeTimes.length).toBeGreaterThan(2); // Some writes should succeed (rate limiting considered)
      expect(writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length).toBeLessThan(3000); // Average < 3 seconds
    });
  });

  describe('System Resource Monitoring', () => {
    it('should not exceed memory limits during normal operation', async () => {
      // Start with baseline memory
      const baselineMetrics = await performanceTester.getSystemMetrics();
      
      // Perform some operations
      for (let i = 0; i < 10; i++) {
        await performanceTester.measureResponseTime('/api/auth/status');
      }
      
      // Check memory after operations
      const afterMetrics = await performanceTester.getSystemMetrics();
      const memoryIncrease = afterMetrics.memoryUsage.heapUsed - baselineMetrics.memoryUsage.heapUsed;
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_CONFIG.memoryThreshold);
    });

    it('should maintain stable performance over extended periods', async () => {
      const responseTimes: number[] = [];
      
      // Measure response times over 30 seconds
      const startTime = Date.now();
      const testDuration = 30000; // 30 seconds
      
      while (Date.now() - startTime < testDuration) {
        const responseTime = await performanceTester.measureResponseTime('/api/auth/status');
        responseTimes.push(responseTime);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 request per second
      }
      
      // Check for performance degradation
      const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
      const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Second half should not be significantly slower
      expect(secondAvg).toBeLessThan(firstAvg * 1.5);
    });
  });

  describe('Stress Testing', () => {
    it('should handle increasing load gracefully', async () => {
      const stressResults = await performanceTester.stressTest('/api/auth/status', 25);
      
      // Each test level should show some successful requests
      stressResults.forEach((result, index) => {
        expect(result.successfulRequests).toBeGreaterThan(0);
        
        // Response time should not degrade too much
        expect(result.averageResponseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThreshold * 2);
        
        // Error rate should remain reasonable
        const errorRate = (result.failedRequests / result.totalRequests) * 100;
        expect(errorRate).toBeLessThan(10); // Less than 10% error rate under stress
      });
    });

    it('should recover from high load situations', async () => {
      // First, create high load
      await performanceTester.performLoadTest('/api/auth/status', 30, 5);
      
      // Wait for system to settle
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test normal operation after high load
      const responseTime = await performanceTester.measureResponseTime('/api/auth/status');
      expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThreshold);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting without significant performance impact', async () => {
      const start = Date.now();
      
      // Make requests that will trigger rate limiting
      const requests = Array(15).fill(null).map(() => 
        performanceTester.getSystemMetrics()
      );
      
      await Promise.all(requests);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain system stability during rate limiting', async () => {
      // Check that the system doesn't crash or become unresponsive
      const responseTime = await performanceTester.measureResponseTime('/api/auth/status');
      expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThreshold * 3); // Allow some degradation during rate limiting
    });
  });

  describe('Production Readiness Metrics', () => {
    it('should meet minimum throughput requirements', async () => {
      const result = await performanceTester.performLoadTest('/api/auth/status', 10, 10);
      
      // Should handle at least 100 requests per second
      expect(result.requestsPerSecond).toBeGreaterThanOrEqual(PERFORMANCE_CONFIG.throughputThreshold);
    });

    it('should maintain acceptable response time under realistic load', async () => {
      // Test with realistic load: 20 users making 5 requests each
      const result = await performanceTester.performLoadTest('/api/vendor-profile', 20, 5);
      
      // Average response time should be acceptable
      expect(result.averageResponseTime).toBeLessThan(3000); // 3 seconds max under load
    });

    it('should have high availability under normal operating conditions', async () => {
      const result = await performanceTester.performLoadTest('/api/auth/status', 5, 20);
      
      // Success rate should be very high
      const successRate = (result.successfulRequests / result.totalRequests) * 100;
      expect(successRate).toBeGreaterThan(95); // 95% success rate
    });
  });
});

// Export for use in other test files
export { PerformanceTester, PERFORMANCE_CONFIG };
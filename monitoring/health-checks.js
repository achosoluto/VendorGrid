#!/usr/bin/env node

/**
 * Production Health Check System for VendorGrid
 * Phase 6: Production Deployment and Monitoring
 * 
 * This script provides comprehensive health checks for all system components
 * during the Replit to Keycloak authentication migration.
 */

import fetch from 'node-fetch';
import { execSync } from 'child_process';
import fs from 'fs';

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'blue');
    console.log('='.repeat(60));
}

class HealthCheck {
    constructor() {
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        this.keycloakUrl = process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080';
        this.results = {
            timestamp: new Date().toISOString(),
            checks: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
    }

    async checkAuthentication() {
        log('\n🔐 Checking Authentication System...', 'blue');
        
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.results.checks.authentication = {
                    status: 'passed',
                    message: 'Authentication endpoint accessible',
                    data: data
                };
                log('✅ Authentication endpoint is working', 'green');
                this.results.summary.passed++;
            } else {
                this.results.checks.authentication = {
                    status: 'failed',
                    message: `Authentication endpoint returned status ${response.status}`
                };
                log(`❌ Authentication endpoint failed: ${response.status}`, 'red');
                this.results.summary.failed++;
            }
        } catch (error) {
            this.results.checks.authentication = {
                status: 'failed',
                message: `Authentication check failed: ${error.message}`
            };
            log(`❌ Authentication check failed: ${error.message}`, 'red');
            this.results.summary.failed++;
        }
        
        this.results.summary.total++;
    }

    async checkKeycloak() {
        log('\n🗝️ Checking Keycloak Infrastructure...', 'blue');
        
        try {
            // Check Keycloak master realm
            const response = await fetch(`${this.keycloakUrl}/realms/master`);
            if (response.ok) {
                this.results.checks.keycloak_master = {
                    status: 'passed',
                    message: 'Keycloak master realm accessible'
                };
                log('✅ Keycloak master realm accessible', 'green');
                this.results.summary.passed++;
            } else {
                this.results.checks.keycloak_master = {
                    status: 'failed',
                    message: `Keycloak master realm returned status ${response.status}`
                };
                log(`❌ Keycloak master realm failed: ${response.status}`, 'red');
                this.results.summary.failed++;
            }
        } catch (error) {
            this.results.checks.keycloak_master = {
                status: 'failed',
                message: `Keycloak check failed: ${error.message}`
            };
            log(`❌ Keycloak check failed: ${error.message}`, 'red');
            this.results.summary.failed++;
        }
        
        this.results.summary.total++;
    }

    async checkDatabase() {
        log('\n🗄️ Checking Database Connectivity...', 'blue');
        
        try {
            const response = await fetch(`${this.baseUrl}/api/health/db`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.results.checks.database = {
                    status: 'passed',
                    message: 'Database connectivity confirmed'
                };
                log('✅ Database connectivity confirmed', 'green');
                this.results.summary.passed++;
            } else {
                this.results.checks.database = {
                    status: 'failed',
                    message: `Database check returned status ${response.status}`
                };
                log(`❌ Database check failed: ${response.status}`, 'red');
                this.results.summary.failed++;
            }
        } catch (error) {
            this.results.checks.database = {
                status: 'failed',
                message: `Database check failed: ${error.message}`
            };
            log(`❌ Database check failed: ${error.message}`, 'red');
            this.results.summary.failed++;
        }
        
        this.results.summary.total++;
    }

    async checkPerformance() {
        log('\n⚡ Checking Performance Metrics...', 'blue');
        
        try {
            const startTime = Date.now();
            const response = await fetch(`${this.baseUrl}/api/health/ping`);
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            if (response.ok) {
                this.results.checks.performance = {
                    status: responseTime < 1000 ? 'passed' : 'warning',
                    message: `Response time: ${responseTime}ms`,
                    responseTime: responseTime
                };
                
                if (responseTime < 1000) {
                    log(`✅ Performance check passed: ${responseTime}ms`, 'green');
                    this.results.summary.passed++;
                } else {
                    log(`⚠️ Performance warning: ${responseTime}ms`, 'yellow');
                    this.results.summary.warnings++;
                }
            } else {
                this.results.checks.performance = {
                    status: 'failed',
                    message: `Performance check returned status ${response.status}`
                };
                log(`❌ Performance check failed: ${response.status}`, 'red');
                this.results.summary.failed++;
            }
        } catch (error) {
            this.results.checks.performance = {
                status: 'failed',
                message: `Performance check failed: ${error.message}`
            };
            log(`❌ Performance check failed: ${error.message}`, 'red');
            this.results.summary.failed++;
        }
        
        this.results.summary.total++;
    }

    async checkSystemResources() {
        log('\n🖥️ Checking System Resources...', 'blue');
        
        try {
            // Check memory usage
            const memUsage = process.memoryUsage();
            const memUsed = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
            const memTotal = Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100;
            
            if (memUsed < 500) { // Less than 500MB heap usage
                this.results.checks.memory = {
                    status: 'passed',
                    message: `Memory usage: ${memUsed}MB / ${memTotal}MB`,
                    heapUsed: memUsed,
                    heapTotal: memTotal
                };
                log(`✅ Memory usage normal: ${memUsed}MB`, 'green');
                this.results.summary.passed++;
            } else {
                this.results.checks.memory = {
                    status: 'warning',
                    message: `High memory usage: ${memUsed}MB / ${memTotal}MB`,
                    heapUsed: memUsed,
                    heapTotal: memTotal
                };
                log(`⚠️ High memory usage: ${memUsed}MB`, 'yellow');
                this.results.summary.warnings++;
            }
        } catch (error) {
            this.results.checks.memory = {
                status: 'failed',
                message: `Memory check failed: ${error.message}`
            };
            log(`❌ Memory check failed: ${error.message}`, 'red');
            this.results.summary.failed++;
        }
        
        this.results.summary.total++;
    }

    async runAllChecks() {
        logSection('Production Health Check Report');
        log(`Timestamp: ${this.results.timestamp}`, 'blue');
        
        await this.checkAuthentication();
        await this.checkKeycloak();
        await this.checkDatabase();
        await this.checkPerformance();
        await this.checkSystemResources();
        
        this.generateReport();
    }

    generateReport() {
        logSection('Health Check Summary');
        
        const summary = this.results.summary;
        log(`Total Checks: ${summary.total}`, 'blue');
        log(`Passed: ${summary.passed}`, 'green');
        log(`Failed: ${summary.failed}`, summary.failed > 0 ? 'red' : 'reset');
        log(`Warnings: ${summary.warnings}`, summary.warnings > 0 ? 'yellow' : 'reset');
        
        const healthScore = Math.round(((summary.passed + summary.warnings * 0.5) / summary.total) * 100);
        log(`Health Score: ${healthScore}%`, healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'red');
        
        if (summary.failed > 0) {
            log('\n❌ Failed Checks:', 'red');
            Object.entries(this.results.checks).forEach(([key, result]) => {
                if (result.status === 'failed') {
                    log(`  - ${key}: ${result.message}`, 'red');
                }
            });
        }
        
        if (summary.warnings > 0) {
            log('\n⚠️ Warnings:', 'yellow');
            Object.entries(this.results.checks).forEach(([key, result]) => {
                if (result.status === 'warning') {
                    log(`  - ${key}: ${result.message}`, 'yellow');
                }
            });
        }
        
        // Save report
        const reportPath = `./logs/health-check-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        log(`\n📋 Detailed report saved: ${reportPath}`, 'blue');
        
        return healthScore >= 80;
    }
}

// Main execution
async function main() {
    const healthCheck = new HealthCheck();
    const success = await healthCheck.runAllChecks();
    process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        log(`❌ Health check system failed: ${error.message}`, 'red');
        process.exit(1);
    });
}

export default HealthCheck;
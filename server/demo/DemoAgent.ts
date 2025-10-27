import { governmentDataAgent } from '../agents/GovernmentDataIntegrationAgent';
import { governmentDataMonitor } from '../monitoring/GovernmentDataMonitor';
import { analyticsService } from '../services/AnalyticsService';
import { storage } from '../storage';

/**
 * VendorGrid Demo Agent
 * 
 * Creates realistic demo scenarios to showcase the Government Data Integration
 * capabilities including job processing, error handling, and analytics.
 */

export class DemoAgent {
  private demoRunning = false;
  private demoInterval?: NodeJS.Timeout;

  /**
   * Start comprehensive demo scenario
   */
  async startDemo(): Promise<{
    success: boolean;
    message: string;
    scenario: string;
    duration: string;
  }> {
    if (this.demoRunning) {
      return {
        success: false,
        message: 'Demo is already running',
        scenario: 'none',
        duration: 'N/A'
      };
    }

    console.log('🎬 Starting VendorGrid Government Data Integration Demo...');
    this.demoRunning = true;

    try {
      // Phase 1: System initialization
      await this.initializeDemoEnvironment();
      
      // Phase 2: Start realistic data ingestion
      await this.simulateDataIngestion();
      
      // Phase 3: Create diverse error scenarios
      await this.simulateErrorScenarios();
      
      // Phase 4: Demonstrate monitoring and alerting
      await this.demonstrateMonitoring();
      
      // Phase 5: Show cost optimization recommendations
      await this.demonstrateCostOptimization();

      // Start continuous demo activity
      this.startContinuousDemoActivity();

      return {
        success: true,
        message: 'Demo successfully started - Government Data Integration Agent is now processing realistic Canadian business data',
        scenario: 'Canadian Business Registry Integration',
        duration: '15 minutes'
      };

    } catch (error) {
      this.demoRunning = false;
      console.error('❌ Demo startup failed:', error);
      return {
        success: false,
        message: `Demo failed to start: ${error.message}`,
        scenario: 'error',
        duration: 'N/A'
      };
    }
  }

  /**
   * Stop demo and reset to normal state
   */
  async stopDemo(): Promise<{
    success: boolean;
    message: string;
    summary: {
      total_jobs_simulated: number;
      vendors_processed: number;
      errors_demonstrated: number;
      alerts_generated: number;
    };
  }> {
    if (!this.demoRunning) {
      return {
        success: false,
        message: 'No demo is currently running',
        summary: { total_jobs_simulated: 0, vendors_processed: 0, errors_demonstrated: 0, alerts_generated: 0 }
      };
    }

    console.log('🎬 Stopping VendorGrid Demo...');
    this.demoRunning = false;

    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = undefined;
    }

    const jobs = governmentDataAgent.getJobStatus();
    const alerts = governmentDataMonitor.getActiveAlerts();
    
    const summary = {
      total_jobs_simulated: jobs.length,
      vendors_processed: jobs.reduce((sum, job) => sum + job.successfulRecords, 0),
      errors_demonstrated: jobs.reduce((sum, job) => sum + job.errors.length, 0),
      alerts_generated: alerts.length
    };

    return {
      success: true,
      message: 'Demo stopped successfully',
      summary
    };
  }

  /**
   * Get current demo status
   */
  getDemoStatus(): {
    running: boolean;
    scenario: string;
    active_jobs: number;
    recent_activity: string[];
    next_phase: string;
  } {
    const jobs = governmentDataAgent.getJobStatus();
    const runningJobs = jobs.filter(job => job.status === 'running' || job.status === 'pending');
    
    const recentActivity = [
      '🏛️ Processing Corporations Canada Federal Registry',
      '📊 Statistics Canada Business Register sync complete',
      '⚙️ Ontario Business Registry bulk download in progress',
      '🔍 AI verification of business numbers ongoing',
      '💰 Cost optimization recommendations generated'
    ];

    return {
      running: this.demoRunning,
      scenario: this.demoRunning ? 'Canadian Government Data Integration' : 'none',
      active_jobs: runningJobs.length,
      recent_activity: recentActivity.slice(0, 3),
      next_phase: this.demoRunning ? 'Continuous processing with periodic error injection' : 'Demo stopped'
    };
  }

  /**
   * Initialize demo environment with realistic data
   */
  private async initializeDemoEnvironment(): Promise<void> {
    console.log('🚀 Phase 1: Initializing demo environment...');
    
    // Ensure monitoring is active
    if (!governmentDataMonitor['isMonitoring']) {
      await governmentDataMonitor.startMonitoring();
    }

    // Seed some initial vendor data if database is empty
    await this.seedDemoVendorData();

    console.log('✅ Demo environment initialized');
  }

  /**
   * Simulate realistic data ingestion from multiple sources
   */
  private async simulateDataIngestion(): Promise<void> {
    console.log('📥 Phase 2: Starting realistic data ingestion simulation...');
    
    const sources = governmentDataAgent.getDataSources().filter(s => s.enabled);
    
    // Start ingestion for each source with realistic timing
    for (const source of sources) {
      console.log(`🔄 Starting ingestion for ${source.name}...`);
      
      try {
        await governmentDataAgent.startSourceIngestion(source.id);
        
        // Stagger source starts to be realistic
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`⚠️ Expected demo error for ${source.name}: ${error.message}`);
      }
    }

    console.log('✅ Data ingestion simulation started');
  }

  /**
   * Create diverse error scenarios for demonstration
   */
  private async simulateErrorScenarios(): Promise<void> {
    console.log('🚨 Phase 3: Creating diverse error scenarios...');
    
    const demoErrors = [
      'Schema validation failed: Missing required field "phone"',
      'Database constraint violation: Duplicate tax_id "123456789"',
      'HTTP 429: Rate limit exceeded for Corporations Canada API',
      'Connection timeout: Statistics Canada API unreachable',
      'Authentication failed: Invalid API key for Ontario Business Registry',
      'Data quality issue: Invalid postal code format "INVALID"'
    ];

    // Inject demo errors into recent jobs
    const jobs = governmentDataAgent.getJobStatus();
    for (let i = 0; i < Math.min(jobs.length, 3); i++) {
      const job = jobs[i];
      const errorCount = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < errorCount; j++) {
        const randomError = demoErrors[Math.floor(Math.random() * demoErrors.length)];
        job.errors.push(randomError);
        job.failedRecords += Math.floor(Math.random() * 5) + 1;
      }
    }

    console.log('✅ Error scenarios created for analytics demonstration');
  }

  /**
   * Demonstrate monitoring and alerting capabilities
   */
  private async demonstrateMonitoring(): Promise<void> {
    console.log('📊 Phase 4: Demonstrating monitoring and alerting...');
    
    // Create sample alerts to showcase alerting system
    const demoAlerts = [
      {
        type: 'job_failure' as const,
        severity: 'high' as const,
        message: 'Job failed for Corporations Canada - network timeout after 3 retries',
        details: { jobId: 'job_demo_001', sourceId: 'corporations_canada_federal', retryCount: 3 }
      },
      {
        type: 'data_quality' as const,
        severity: 'medium' as const,
        message: 'Data quality score below threshold: 87.3%',
        details: { threshold: 90, actualScore: 87.3, affectedRecords: 45 }
      },
      {
        type: 'system_health' as const,
        severity: 'low' as const,
        message: 'Memory usage elevated: 78% of available heap',
        details: { memoryUsage: 78, threshold: 80 }
      }
    ];

    // Note: In a real implementation, these would be created through the monitoring system
    console.log('📢 Demo alerts would be generated here for:', demoAlerts.map(a => a.message));
    
    console.log('✅ Monitoring demonstration ready');
  }

  /**
   * Show cost optimization recommendations
   */
  private async demonstrateCostOptimization(): Promise<void> {
    console.log('💰 Phase 5: Demonstrating cost optimization...');
    
    // This will be handled by the analytics service automatically
    // when the cost routing analysis is called
    
    console.log('✅ Cost optimization analytics ready');
  }

  /**
   * Start continuous demo activity to keep the dashboard interesting
   */
  private startContinuousDemoActivity(): void {
    console.log('🔄 Starting continuous demo activity...');
    
    this.demoInterval = setInterval(async () => {
      if (!this.demoRunning) return;

      try {
        await this.performDemoActivity();
      } catch (error) {
        console.error('Demo activity error:', error);
      }
    }, 45000); // Activity every 45 seconds for cleaner demo

    console.log('✅ Continuous demo activity started');
  }

  /**
   * Perform periodic demo activities
   */
  private async performDemoActivity(): Promise<void> {
    const activities = [
      () => this.simulateJobCompletion(),
      () => this.simulateNewJobStart(),
      () => this.updateJobProgress(),
      () => this.simulateRandomError(),
      () => this.simulateDataQualityCheck()
    ];

    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    await randomActivity();
  }

  /**
   * Simulate job completion
   */
  private async simulateJobCompletion(): Promise<void> {
    const jobs = governmentDataAgent.getJobStatus();
    const runningJobs = jobs.filter(job => job.status === 'running');
    
    if (runningJobs.length > 0) {
      const job = runningJobs[0];
      job.status = 'completed';
      job.endTime = new Date();
      job.processedRecords = job.totalRecords;
      job.successfulRecords = job.totalRecords - job.failedRecords;
      
      console.log(`✅ Demo: Job ${job.id} completed - ${job.successfulRecords} records processed`);
    }
  }

  /**
   * Simulate new job start
   */
  private async simulateNewJobStart(): Promise<void> {
    const sources = governmentDataAgent.getDataSources();
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    
    try {
      await governmentDataAgent.startSourceIngestion(randomSource.id);
      console.log(`🚀 Demo: Started new job for ${randomSource.name}`);
    } catch (error) {
      // Expected in demo mode
      console.log(`⚠️ Demo: Simulated start conflict for ${randomSource.name}`);
    }
  }

  /**
   * Update job progress for running jobs
   */
  private async updateJobProgress(): Promise<void> {
    const jobs = governmentDataAgent.getJobStatus();
    const runningJobs = jobs.filter(job => job.status === 'running');
    
    runningJobs.forEach(job => {
      if (job.processedRecords < job.totalRecords) {
        const increment = Math.floor(Math.random() * 50) + 10;
        job.processedRecords = Math.min(job.totalRecords, job.processedRecords + increment);
        job.successfulRecords = job.processedRecords - job.failedRecords;
      }
    });
  }

  /**
   * Simulate random error occurrence
   */
  private async simulateRandomError(): Promise<void> {
    const jobs = governmentDataAgent.getJobStatus();
    const runningJobs = jobs.filter(job => job.status === 'running');
    
    if (runningJobs.length > 0 && Math.random() < 0.3) { // 30% chance
      const job = runningJobs[Math.floor(Math.random() * runningJobs.length)];
      const demoErrors = [
        'Network latency spike detected: 2.3s response time',
        'Temporary API rate limit: backing off for 30 seconds',
        'Data validation warning: Unusual postal code format detected',
        'Duplicate detection: Potential match found requiring review'
      ];
      
      const randomError = demoErrors[Math.floor(Math.random() * demoErrors.length)];
      job.errors.push(randomError);
      job.failedRecords += 1;
      
      console.log(`⚠️ Demo: Simulated error - ${randomError}`);
    }
  }

  /**
   * Simulate data quality check
   */
  private async simulateDataQualityCheck(): Promise<void> {
    console.log('🔍 Demo: Running data quality assessment...');
    // This would trigger analytics recalculation in a real system
  }

  /**
   * Seed initial vendor data for demo
   */
  private async seedDemoVendorData(): Promise<void> {
    try {
      // Check if we already have demo data by trying to get a vendor with demo tax ID
      const existingVendor = await storage.getVendorProfileByTaxId('demo_123456789');
      
      if (existingVendor) {
        console.log('✅ Demo vendor data already exists');
        return;
      }

      console.log('🌱 Seeding demo vendor data...');
      
      // First ensure we have a system user for demo data
      let systemUser;
      try {
        systemUser = await storage.getUser('system-data-ingestion');
        if (!systemUser) {
          systemUser = await storage.upsertUser({
            id: 'system-data-ingestion',
            firstName: 'System',
            lastName: 'Data Ingestion',
            email: 'system+data-ingestion@vendorgrid.com'
          });
        }
      } catch (error) {
        console.log('⚠️  Failed to create system user for demo data:', error.message);
        return;
      }

      const demoVendors = [
        {
          userId: systemUser.id,
          companyName: 'Maple Technologies Inc.',
          taxId: 'demo_123456789',
          businessNumber: '123456789',
          address: '123 King Street West',
          city: 'Toronto',
          state: 'Ontario',
          zipCode: 'M5H 3T9',
          country: 'CA',
          phone: '416-555-0123',
          email: 'contact@mapletechinc.ca',
          website: 'https://mapletechinc.ca',
          legalStructure: 'Federal Corporation',
          dataSource: 'demo_seed',
          isActive: true
        },
        {
          userId: systemUser.id,
          companyName: 'Northern Solutions Ltd.',
          taxId: 'demo_987654321',
          businessNumber: '987654321',
          address: '456 Bay Street',
          city: 'Vancouver',
          state: 'British Columbia',
          zipCode: 'V6C 1A1',
          country: 'CA',
          phone: '604-555-0456',
          email: 'info@northernsolutions.ca',
          website: 'https://northernsolutions.ca',
          legalStructure: 'Provincial Corporation',
          dataSource: 'demo_seed',
          isActive: true
        }
      ];

      for (const vendor of demoVendors) {
        await storage.createVendorProfile(vendor as any);
      }
      
      console.log('✅ Demo vendor data seeded successfully');
      
    } catch (error) {
      console.log('⚠️ Demo vendor seeding skipped:', error.message);
    }
  }

  /**
   * Create demo showcase scenarios
   */
  async createShowcaseScenario(scenario: 'success' | 'errors' | 'mixed'): Promise<{
    success: boolean;
    message: string;
    jobs_created: number;
    estimated_duration: string;
  }> {
    console.log(`🎭 Creating showcase scenario: ${scenario}`);

    try {
      let jobsCreated = 0;
      
      switch (scenario) {
        case 'success':
          // Create successful processing scenario
          await governmentDataAgent.startSourceIngestion('corporations_canada_federal');
          await governmentDataAgent.startSourceIngestion('statistics_canada_business_register');
          jobsCreated = 2;
          
          // Simulate quick completion for demo
          setTimeout(() => {
            const jobs = governmentDataAgent.getJobStatus();
            jobs.forEach(job => {
              if (job.status === 'running') {
                job.status = 'completed';
                job.endTime = new Date();
                job.successfulRecords = job.totalRecords || 250;
                job.processedRecords = job.successfulRecords;
              }
            });
          }, 5000);
          break;

        case 'errors':
          // Create error-heavy scenario
          await governmentDataAgent.startSourceIngestion('ontario_business_registry');
          jobsCreated = 1;
          
          // Inject errors after delay
          setTimeout(() => {
            const jobs = governmentDataAgent.getJobStatus();
            const latestJob = jobs[jobs.length - 1];
            if (latestJob) {
              latestJob.status = 'failed';
              latestJob.endTime = new Date();
              latestJob.errors = [
                'Connection timeout after 30 seconds',
                'HTTP 503: Service temporarily unavailable',
                'Rate limit exceeded: 1000 requests per hour',
                'Authentication failed: Invalid API credentials'
              ];
              latestJob.failedRecords = 150;
            }
          }, 3000);
          break;

        case 'mixed':
          // Create mixed success/failure scenario
          await this.simulateDataIngestion();
          jobsCreated = 3;
          
          // Create mixed results after delay
          setTimeout(() => {
            const jobs = governmentDataAgent.getJobStatus();
            jobs.forEach((job, index) => {
              if (job.status === 'running') {
                if (index % 2 === 0) {
                  // Even jobs succeed
                  job.status = 'completed';
                  job.endTime = new Date();
                  job.successfulRecords = (job.totalRecords || 200) * 0.85;
                  job.failedRecords = (job.totalRecords || 200) * 0.15;
                  job.processedRecords = job.totalRecords || 200;
                } else {
                  // Odd jobs have issues
                  job.errors.push('Intermittent network connectivity issues');
                  job.failedRecords += 25;
                }
              }
            });
          }, 7000);
          break;
      }

      return {
        success: true,
        message: `Showcase scenario '${scenario}' created successfully`,
        jobs_created: jobsCreated,
        estimated_duration: '30 seconds'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create showcase scenario: ${error.message}`,
        jobs_created: 0,
        estimated_duration: 'N/A'
      };
    }
  }
}

// Export singleton instance
export const demoAgent = new DemoAgent();
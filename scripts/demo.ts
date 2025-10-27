#!/usr/bin/env node

/**
 * VendorGrid Government Data Integration Demo CLI
 * 
 * Interactive command-line interface to demonstrate the full capabilities
 * of the Government Data Integration Agent with realistic scenarios.
 */

import readline from 'readline';
import chalk from 'chalk';
import axios from 'axios';

// Demo configuration
const BASE_URL = process.env.DEMO_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/government-data`;

// CLI interface setup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * CLI Demo Controller
 */
class VendorGridDemoCLI {
  private sessionToken?: string;
  private demoRunning = false;

  constructor() {
    // For demo purposes, we'll use mock authentication
    this.sessionToken = 'demo-session-token';
  }

  /**
   * Start the interactive demo experience
   */
  async start(): Promise<void> {
    console.clear();
    this.printWelcome();
    
    await this.checkSystemHealth();
    await this.showMainMenu();
  }

  /**
   * Print welcome banner
   */
  private printWelcome(): void {
    console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🎬 VendorGrid Demo Agent                                   ║
║               Government Data Integration Showcase                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
    `));
    
    console.log(chalk.white(`
Welcome to the VendorGrid Government Data Integration demonstration!

This interactive demo showcases our enterprise-grade system for processing
Canadian business registries with real-time monitoring, analytics, and
cost optimization.

Features demonstrated:
• Real-time data ingestion from multiple government sources
• Intelligent error handling and categorization
• Live monitoring dashboard with health metrics
• Cost-aware routing and optimization
• Advanced analytics and reporting
    `));
  }

  /**
   * Check system health before starting
   */
  private async checkSystemHealth(): Promise<void> {
    console.log(chalk.yellow('🔍 Checking system health...'));
    
    try {
      const response = await axios.get(`${API_BASE}/ping`);
      if (response.data.success) {
        console.log(chalk.green('✅ VendorGrid Government Data Agent is operational'));
        console.log(chalk.gray(`   Environment: ${response.data.data.environment}`));
        console.log(chalk.gray(`   Sources configured: ${response.data.data.sourcesConfigured}`));
      }
    } catch (error) {
      console.log(chalk.red('❌ System health check failed'));
      console.log(chalk.red('   Please ensure the VendorGrid server is running on port 5000'));
      console.log(chalk.gray('   Run: npm run dev (in the server directory)'));
      process.exit(1);
    }
  }

  /**
   * Show main menu options
   */
  private async showMainMenu(): Promise<void> {
    console.log(chalk.cyan.bold('\n📋 Demo Options:'));
    console.log('1. 🎬 Start Full Demo (15-minute comprehensive showcase)');
    console.log('2. 🎭 Quick Scenario Demos');
    console.log('3. 📊 View Live Dashboard Data');
    console.log('4. 🔍 System Status & Analytics');
    console.log('5. 📖 Demo Guide & Documentation');
    console.log('6. 🚪 Exit');

    const choice = await this.promptUser('\nSelect an option (1-6): ');
    await this.handleMenuChoice(choice.trim());
  }

  /**
   * Handle main menu selection
   */
  private async handleMenuChoice(choice: string): Promise<void> {
    switch (choice) {
      case '1':
        await this.startFullDemo();
        break;
      case '2':
        await this.showScenarioMenu();
        break;
      case '3':
        await this.viewDashboard();
        break;
      case '4':
        await this.viewSystemStatus();
        break;
      case '5':
        await this.showGuide();
        break;
      case '6':
        console.log(chalk.green('👋 Thank you for trying VendorGrid!'));
        process.exit(0);
        break;
      default:
        console.log(chalk.red('Invalid option. Please try again.'));
        await this.showMainMenu();
    }
  }

  /**
   * Start the full 15-minute demo
   */
  private async startFullDemo(): Promise<void> {
    console.log(chalk.cyan.bold('\n🎬 Starting Full VendorGrid Demo...'));
    
    try {
      const response = await axios.post(`${API_BASE}/demo/start`, {}, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        this.demoRunning = true;
        console.log(chalk.green('✅ Demo started successfully!'));
        console.log(chalk.white(`📊 Scenario: ${response.data.data.scenario}`));
        console.log(chalk.white(`⏱️  Duration: ${response.data.data.duration}`));
        console.log(chalk.gray(`\n${response.data.message}\n`));

        console.log(chalk.yellow('🔄 Demo is now running with continuous activity...'));
        console.log(chalk.gray('   The system will simulate realistic data processing scenarios'));
        console.log(chalk.gray('   including job management, error handling, and cost optimization'));

        await this.showDemoControls();
      } else {
        console.log(chalk.red(`❌ Failed to start demo: ${response.data.message}`));
        await this.showMainMenu();
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error starting demo: ${error.message}`));
      await this.showMainMenu();
    }
  }

  /**
   * Show controls while demo is running
   */
  private async showDemoControls(): Promise<void> {
    console.log(chalk.cyan.bold('\n📊 Demo Controls:'));
    console.log('1. 📈 View Live Dashboard');
    console.log('2. 🔍 Check Job Status');
    console.log('3. 📊 Analytics Summary');
    console.log('4. 🚨 View Alerts');
    console.log('5. 📊 Cost Analysis');
    console.log('6. ⏹️  Stop Demo');
    console.log('7. 🔙 Back to Main Menu');

    const choice = await this.promptUser('\nSelect an option (1-7): ');
    await this.handleDemoControls(choice.trim());
  }

  /**
   * Handle demo control selection
   */
  private async handleDemoControls(choice: string): Promise<void> {
    switch (choice) {
      case '1':
        await this.viewDashboard();
        break;
      case '2':
        await this.viewJobs();
        break;
      case '3':
        await this.viewAnalytics();
        break;
      case '4':
        await this.viewAlerts();
        break;
      case '5':
        await this.viewCostAnalysis();
        break;
      case '6':
        await this.stopDemo();
        return;
      case '7':
        await this.showMainMenu();
        return;
      default:
        console.log(chalk.red('Invalid option. Please try again.'));
        break;
    }

    // Return to demo controls unless exiting
    await this.showDemoControls();
  }

  /**
   * Stop the demo and show summary
   */
  private async stopDemo(): Promise<void> {
    console.log(chalk.yellow('⏹️  Stopping VendorGrid demo...'));
    
    try {
      const response = await axios.post(`${API_BASE}/demo/stop`, {}, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        this.demoRunning = false;
        console.log(chalk.green('✅ Demo stopped successfully'));
        
        const summary = response.data.data.summary;
        console.log(chalk.cyan.bold('\n📊 Demo Summary:'));
        console.log(`📋 Total jobs simulated: ${summary.total_jobs_simulated}`);
        console.log(`✅ Vendors processed: ${summary.vendors_processed}`);
        console.log(`⚠️  Errors demonstrated: ${summary.errors_demonstrated}`);
        console.log(`🚨 Alerts generated: ${summary.alerts_generated}`);
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error stopping demo: ${error.message}`));
    }

    await this.showMainMenu();
  }

  /**
   * Show scenario menu for quick demos
   */
  private async showScenarioMenu(): Promise<void> {
    console.log(chalk.cyan.bold('\n🎭 Quick Scenario Demos:'));
    console.log('1. ✅ Success Scenario (smooth processing demo)');
    console.log('2. ⚠️  Error Scenario (error handling demo)');
    console.log('3. 🔀 Mixed Scenario (realistic processing demo)');
    console.log('4. 🔙 Back to Main Menu');

    const choice = await this.promptUser('\nSelect a scenario (1-4): ');
    
    let scenarioType: string;
    switch (choice.trim()) {
      case '1':
        scenarioType = 'success';
        break;
      case '2':
        scenarioType = 'errors';
        break;
      case '3':
        scenarioType = 'mixed';
        break;
      case '4':
        await this.showMainMenu();
        return;
      default:
        console.log(chalk.red('Invalid option. Please try again.'));
        await this.showScenarioMenu();
        return;
    }

    await this.runScenario(scenarioType);
  }

  /**
   * Run a specific demo scenario
   */
  private async runScenario(type: string): Promise<void> {
    console.log(chalk.yellow(`🎬 Starting ${type} scenario demo...`));
    
    try {
      const response = await axios.post(`${API_BASE}/demo/scenario/${type}`, {}, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        console.log(chalk.green('✅ Scenario started successfully!'));
        console.log(chalk.white(`📊 Jobs created: ${response.data.data.jobs_created}`));
        console.log(chalk.white(`⏱️  Estimated duration: ${response.data.data.estimated_duration}`));
        console.log(chalk.gray(`\n${response.data.message}\n`));

        // Wait a moment then show results
        console.log(chalk.yellow('⏳ Processing scenario... (waiting 10 seconds for results)'));
        
        setTimeout(async () => {
          console.log(chalk.cyan('📊 Viewing updated job status...'));
          await this.viewJobs();
          await this.promptToContinue();
        }, 10000);
      } else {
        console.log(chalk.red(`❌ Failed to start scenario: ${response.data.message}`));
        await this.promptToContinue();
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error running scenario: ${error.message}`));
      await this.promptToContinue();
    }
  }

  /**
   * View live dashboard data
   */
  private async viewDashboard(): Promise<void> {
    console.log(chalk.cyan.bold('\n📊 Live Dashboard Data'));
    console.log(chalk.gray('━'.repeat(50)));
    
    try {
      const response = await axios.get(`${API_BASE}/monitoring/dashboard`, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        const data = response.data.data;
        
        console.log(chalk.white.bold('System Status:'));
        console.log(`  Monitoring Active: ${data.monitoring_active ? chalk.green('✅ Yes') : chalk.red('❌ No')}`);
        console.log(`  Uptime: ${data.uptime_seconds}s`);
        console.log(`  Last Update: ${new Date(data.last_update).toLocaleTimeString()}`);
        
        console.log(chalk.white.bold('\nJob Activity:'));
        console.log(`  Active Jobs: ${chalk.cyan(data.jobs.active_count)}`);
        console.log(`  Completed Today: ${chalk.green(data.jobs.completed_today)}`);
        console.log(`  Failed Today: ${chalk.red(data.jobs.failed_today)}`);
        
        console.log(chalk.white.bold('\nSystem Metrics:'));
        console.log(`  Memory Usage: ${chalk.yellow(data.system_metrics.memory_usage.toFixed(1))}%`);
        console.log(`  CPU Usage: ${chalk.yellow(data.system_metrics.cpu_usage.toFixed(1))}%`);
        
        if (data.recent_errors?.length > 0) {
          console.log(chalk.white.bold('\nRecent Errors:'));
          data.recent_errors.slice(0, 3).forEach(error => {
            console.log(`  ${chalk.red('•')} ${error}`);
          });
        }
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error fetching dashboard: ${error.message}`));
    }

    await this.promptToContinue();
  }

  /**
   * View current jobs
   */
  private async viewJobs(): Promise<void> {
    console.log(chalk.cyan.bold('\n🔍 Current Jobs Status'));
    console.log(chalk.gray('━'.repeat(50)));
    
    try {
      const response = await axios.get(`${API_BASE}/jobs`, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        const data = response.data.data;
        
        console.log(chalk.white(`Total Jobs: ${data.totalJobs}, Active: ${data.activeJobs}`));
        console.log('');
        
        if (data.jobs.length === 0) {
          console.log(chalk.gray('No jobs currently running.'));
        } else {
          data.jobs.forEach((job, index) => {
            const statusColor = job.status === 'completed' ? chalk.green : 
                               job.status === 'failed' ? chalk.red :
                               job.status === 'running' ? chalk.yellow : chalk.gray;
            
            console.log(`${index + 1}. ${chalk.white.bold(job.sourceId)}`);
            console.log(`   Status: ${statusColor(job.status.toUpperCase())}`);
            console.log(`   Started: ${new Date(job.startTime).toLocaleTimeString()}`);
            
            if (job.progress) {
              const progress = job.progress;
              const progressBar = this.createProgressBar(progress.percentage);
              console.log(`   Progress: ${progressBar} ${progress.percentage}%`);
              console.log(`   Records: ${chalk.green(progress.successful)}/${progress.total} (${chalk.red(progress.failed)} failed)`);
            }
            
            if (job.errors.length > 0) {
              console.log(`   Recent Errors: ${chalk.red(job.errors.length)} errors`);
              job.errors.slice(0, 2).forEach(error => {
                console.log(`     ${chalk.red('•')} ${error}`);
              });
            }
            console.log('');
          });
        }
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error fetching jobs: ${error.message}`));
    }

    await this.promptToContinue();
  }

  /**
   * View analytics summary
   */
  private async viewAnalytics(): Promise<void> {
    console.log(chalk.cyan.bold('\n📈 Analytics Summary'));
    console.log(chalk.gray('━'.repeat(50)));
    
    try {
      const response = await axios.get(`${API_BASE}/analytics/summary`, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        const data = response.data.data;
        
        console.log(chalk.white.bold('Overview:'));
        console.log(`  Total Sources: ${data.overview.total_sources}`);
        console.log(`  Healthy Sources: ${chalk.green(data.overview.healthy_sources)}`);
        console.log(`  Records Today: ${chalk.cyan(data.overview.records_processed_today.toLocaleString())}`);
        console.log(`  Success Rate: ${chalk.green(data.overview.avg_success_rate.toFixed(1))}%`);
        console.log(`  Daily Cost: ${chalk.yellow('$' + data.overview.daily_cost.toFixed(2))}`);
        
        console.log(chalk.white.bold('\nAlerts:'));
        console.log(`  Critical Errors: ${chalk.red(data.alerts.critical_errors)}`);
        console.log(`  Cost Opportunities: ${chalk.yellow(data.alerts.cost_optimization_opportunities)}`);
        console.log(`  Low Performers: ${chalk.red(data.alerts.low_performing_sources)}`);
        
        if (data.top_performers?.length > 0) {
          console.log(chalk.white.bold('\nTop Performers:'));
          data.top_performers.forEach((performer, index) => {
            console.log(`  ${index + 1}. ${performer.name}`);
            console.log(`     Health: ${chalk.green(performer.health_score)}, Success: ${chalk.green(performer.success_rate.toFixed(1))}%`);
          });
        }
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error fetching analytics: ${error.message}`));
    }

    await this.promptToContinue();
  }

  /**
   * View active alerts
   */
  private async viewAlerts(): Promise<void> {
    console.log(chalk.cyan.bold('\n🚨 Active Alerts'));
    console.log(chalk.gray('━'.repeat(50)));
    
    try {
      const response = await axios.get(`${API_BASE}/monitoring/alerts`, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        const alerts = response.data.data.alerts;
        
        if (alerts.length === 0) {
          console.log(chalk.green('✅ No active alerts - system running smoothly!'));
        } else {
          alerts.forEach((alert, index) => {
            const severityColor = alert.severity === 'high' ? chalk.red :
                                 alert.severity === 'medium' ? chalk.yellow : chalk.gray;
            
            console.log(`${index + 1}. ${severityColor(alert.severity.toUpperCase())} - ${alert.type}`);
            console.log(`   ${alert.message}`);
            console.log(`   Time: ${new Date(alert.timestamp).toLocaleString()}`);
            console.log('');
          });
        }
        
        console.log(chalk.white(`Total Active Alerts: ${alerts.length}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error fetching alerts: ${error.message}`));
    }

    await this.promptToContinue();
  }

  /**
   * View cost analysis
   */
  private async viewCostAnalysis(): Promise<void> {
    console.log(chalk.cyan.bold('\n💰 Cost Analysis & Routing'));
    console.log(chalk.gray('━'.repeat(50)));
    
    try {
      const response = await axios.get(`${API_BASE}/analytics/cost-routing`, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        const data = response.data.data;
        
        console.log(chalk.white.bold('Cost Overview:'));
        console.log(`  Estimated Daily Cost: ${chalk.yellow('$' + data.cost_analysis.estimated_daily_cost.toFixed(2))}`);
        console.log(`  Cost per Record: ${chalk.yellow('$' + data.cost_analysis.cost_per_record.toFixed(4))}`);
        console.log(`  Efficiency Score: ${chalk.green(data.cost_analysis.efficiency_score.toFixed(1))}/100`);
        
        if (data.routing_recommendations?.length > 0) {
          console.log(chalk.white.bold('\nCost Optimization Recommendations:'));
          data.routing_recommendations.slice(0, 3).forEach((rec, index) => {
            console.log(`${index + 1}. ${rec.recommendation}`);
            console.log(`   Impact: ${chalk.green(rec.impact)}`);
            console.log(`   Savings: ${chalk.yellow(rec.savings_potential)}`);
            console.log('');
          });
        }
        
        if (data.source_costs?.length > 0) {
          console.log(chalk.white.bold('Source Costs:'));
          data.source_costs.forEach(source => {
            const statusColor = source.status === 'preferred' ? chalk.green :
                               source.status === 'expensive' ? chalk.red : chalk.yellow;
            
            console.log(`  ${source.source_name}: $${source.cost_per_record.toFixed(4)}/record ${statusColor('[' + source.status + ']')}`);
          });
        }
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error fetching cost analysis: ${error.message}`));
    }

    await this.promptToContinue();
  }

  /**
   * Show demo guide and documentation
   */
  private async showGuide(): Promise<void> {
    console.log(chalk.cyan.bold('\n📖 VendorGrid Demo Guide'));
    console.log(chalk.gray('━'.repeat(50)));
    
    try {
      const response = await axios.get(`${API_BASE}/demo/guide`);

      if (response.data.success) {
        const guide = response.data.data;
        
        console.log(chalk.white.bold(guide.title));
        console.log(chalk.gray(guide.description));
        console.log('');
        
        console.log(chalk.white.bold('Quick Start Steps:'));
        Object.values(guide.quick_start).forEach((step, index) => {
          console.log(`  ${index + 1}. ${step}`);
        });
        console.log('');
        
        console.log(chalk.white.bold('Available Scenarios:'));
        Object.entries(guide.scenarios).forEach(([name, description]) => {
          console.log(`  ${chalk.cyan(name)}: ${description}`);
        });
        console.log('');
        
        console.log(chalk.white.bold('Features Showcased:'));
        guide.features_showcased.forEach(feature => {
          console.log(`  ${chalk.green('•')} ${feature}`);
        });
        console.log('');
        
        console.log(chalk.white.bold('Data Sources Integrated:'));
        guide.data_sources.forEach(source => {
          console.log(`  ${chalk.blue('•')} ${source}`);
        });
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error fetching guide: ${error.message}`));
    }

    await this.promptToContinue();
  }

  /**
   * View system status
   */
  private async viewSystemStatus(): Promise<void> {
    console.log(chalk.cyan.bold('\n🔍 System Status'));
    console.log(chalk.gray('━'.repeat(50)));
    
    try {
      // Check demo status
      const demoResponse = await axios.get(`${API_BASE}/demo/status`, {
        headers: this.getAuthHeaders()
      });

      if (demoResponse.data.success) {
        const demo = demoResponse.data.data;
        console.log(chalk.white.bold('Demo Status:'));
        console.log(`  Running: ${demo.running ? chalk.green('✅ Yes') : chalk.red('❌ No')}`);
        console.log(`  Scenario: ${demo.scenario}`);
        console.log(`  Active Jobs: ${demo.active_jobs}`);
        console.log(`  Next Phase: ${demo.next_phase}`);
        console.log('');
      }

      // Check system health
      const healthResponse = await axios.get(`${API_BASE}/health`, {
        headers: this.getAuthHeaders()
      });

      if (healthResponse.data.success) {
        const health = healthResponse.data.data.metrics;
        console.log(chalk.white.bold('System Health:'));
        console.log(`  Total Vendors: ${chalk.cyan(health.totalVendors.toLocaleString())}`);
        console.log(`  Recently Added: ${chalk.green(health.recentlyAdded)}`);
        console.log(`  Active Jobs: ${chalk.yellow(health.activeJobs)}`);
        console.log(`  Sources Enabled: ${chalk.blue(health.dataSourcesEnabled)}`);
        if (health.lastIngestionTime) {
          console.log(`  Last Ingestion: ${new Date(health.lastIngestionTime).toLocaleString()}`);
        }
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error fetching system status: ${error.message}`));
    }

    await this.promptToContinue();
  }

  /**
   * Create a visual progress bar
   */
  private createProgressBar(percentage: number): string {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    return chalk.green('█'.repeat(filled)) + chalk.gray('█'.repeat(empty));
  }

  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.sessionToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Prompt user for input
   */
  private promptUser(question: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  /**
   * Prompt to continue (press enter)
   */
  private async promptToContinue(): Promise<void> {
    await this.promptUser(chalk.gray('\nPress Enter to continue...'));
    console.log('');
  }
}

// Main execution
const demo = new VendorGridDemoCLI();

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Demo interrupted. Thank you for trying VendorGrid!'));
  rl.close();
  process.exit(0);
});

// Start the demo
demo.start().catch((error) => {
  console.error(chalk.red('❌ Demo failed to start:'), error.message);
  process.exit(1);
});

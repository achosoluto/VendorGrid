import { Router } from 'express';
import { governmentDataAgent } from '../agents/GovernmentDataIntegrationAgent';
import { isAuthenticated } from '../mockAuth';
import { governmentDataMonitor } from '../monitoring/GovernmentDataMonitor';
import { analyticsService } from '../services/AnalyticsService';
import { demoAgent } from '../demo/DemoAgent';

const router = Router();

/**
 * Government Data Integration Agent API Routes
 * 
 * Provides endpoints for managing large-scale government data ingestion
 * and monitoring the bulk processing of Canadian business registries.
 */

// Get all configured data sources
router.get('/api/government-data/sources', isAuthenticated, async (req, res) => {
  try {
    const sources = governmentDataAgent.getDataSources();
    res.json({
      success: true,
      data: sources.map(source => ({
        id: source.id,
        name: source.name,
        type: source.type,
        enabled: source.enabled,
        lastSync: source.lastSync,
        rateLimits: source.rateLimits
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve data sources',
      message: error.message
    });
  }
});

// Get system health and statistics
router.get('/api/government-data/health', isAuthenticated, async (req, res) => {
  try {
    const health = await governmentDataAgent.getSystemHealth();
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date(),
        metrics: health
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system health',
      message: error.message
    });
  }
});

// Start full ingestion from all enabled sources
router.post('/api/government-data/ingest/full', isAuthenticated, async (req, res) => {
  try {
    console.log('🚀 Starting full government data ingestion...');
    const result = await governmentDataAgent.startFullIngestion();
    
    res.json({
      success: true,
      message: 'Full data ingestion started',
      data: {
        jobsStarted: result.jobs.length,
        jobs: result.jobs.map(job => ({
          id: job.id,
          sourceId: job.sourceId,
          status: job.status,
          startTime: job.startTime
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start full ingestion',
      message: error.message
    });
  }
});

// Start ingestion from a specific source
router.post('/api/government-data/ingest/:sourceId', isAuthenticated, async (req, res) => {
  try {
    const { sourceId } = req.params;
    console.log(`🔄 Starting ingestion for source: ${sourceId}`);
    
    const job = await governmentDataAgent.startSourceIngestion(sourceId);
    
    res.json({
      success: true,
      message: `Data ingestion started for source: ${sourceId}`,
      data: {
        jobId: job.id,
        sourceId: job.sourceId,
        status: job.status,
        startTime: job.startTime
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to start source ingestion',
      message: error.message
    });
  }
});

// Get status of all active jobs
router.get('/api/government-data/jobs', isAuthenticated, async (req, res) => {
  try {
    const jobs = governmentDataAgent.getJobStatus();
    
    res.json({
      success: true,
      data: {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(job => job.status === 'running' || job.status === 'pending').length,
        jobs: jobs.map(job => ({
          id: job.id,
          sourceId: job.sourceId,
          status: job.status,
          startTime: job.startTime,
          endTime: job.endTime,
          progress: job.totalRecords > 0 ? {
            total: job.totalRecords,
            processed: job.processedRecords,
            successful: job.successfulRecords,
            failed: job.failedRecords,
            percentage: Math.round((job.processedRecords / job.totalRecords) * 100)
          } : null,
          errors: job.errors.length > 0 ? job.errors.slice(-5) : [] // Last 5 errors
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve job status',
      message: error.message
    });
  }
});

// Get detailed status of a specific job
router.get('/api/government-data/jobs/:jobId', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = governmentDataAgent.getJobDetails(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: `No job found with ID: ${jobId}`
      });
    }
    
    res.json({
      success: true,
      data: {
        ...job,
        duration: job.startTime && job.endTime 
          ? job.endTime.getTime() - job.startTime.getTime()
          : job.startTime 
            ? Date.now() - job.startTime.getTime()
            : null,
        estimatedTimeRemaining: job.totalRecords > 0 && job.processedRecords > 0 && job.status === 'running'
          ? Math.round(((job.totalRecords - job.processedRecords) / job.processedRecords) * (Date.now() - job.startTime.getTime()))
          : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve job details',
      message: error.message
    });
  }
});

// Pause a running job
router.post('/api/government-data/jobs/:jobId/pause', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const success = await governmentDataAgent.pauseJob(jobId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to pause job',
        message: 'Job not found or not in a pausable state'
      });
    }
    
    res.json({
      success: true,
      message: `Job ${jobId} has been paused`,
      data: { jobId, action: 'paused' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to pause job',
      message: error.message
    });
  }
});

// Resume a paused job
router.post('/api/government-data/jobs/:jobId/resume', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const success = await governmentDataAgent.resumeJob(jobId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to resume job',
        message: 'Job not found or not in a resumable state'
      });
    }
    
    res.json({
      success: true,
      message: `Job ${jobId} has been resumed`,
      data: { jobId, action: 'resumed' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resume job',
      message: error.message
    });
  }
});

// Get ingestion statistics and metrics
router.get('/api/government-data/stats', isAuthenticated, async (req, res) => {
  try {
    const health = await governmentDataAgent.getSystemHealth();
    const jobs = governmentDataAgent.getJobStatus();
    
    // Calculate additional statistics
    const completedJobs = jobs.filter(job => job.status === 'completed');
    const failedJobs = jobs.filter(job => job.status === 'failed');
    const totalProcessed = completedJobs.reduce((sum, job) => sum + job.successfulRecords, 0);
    const totalFailed = jobs.reduce((sum, job) => sum + job.failedRecords, 0);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalVendors: health.totalVendors,
          recentlyAdded: health.recentlyAdded,
          dataSourcesEnabled: health.dataSourcesEnabled,
          lastIngestionTime: health.lastIngestionTime
        },
        processing: {
          activeJobs: health.activeJobs,
          totalJobs: jobs.length,
          completedJobs: completedJobs.length,
          failedJobs: failedJobs.length,
          totalRecordsProcessed: totalProcessed,
          totalRecordsFailed: totalFailed,
          successRate: totalProcessed + totalFailed > 0 
            ? Math.round((totalProcessed / (totalProcessed + totalFailed)) * 100)
            : 0
        },
        sources: governmentDataAgent.getDataSources().map(source => ({
          id: source.id,
          name: source.name,
          enabled: source.enabled,
          lastSync: source.lastSync,
          rateLimits: source.rateLimits
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      message: error.message
    });
  }
});

// Development endpoint to check if agent is working (no auth required)
router.get('/api/government-data/ping', async (req, res) => {
  try {
    const sources = governmentDataAgent.getDataSources();
    res.json({
      success: true,
      message: 'Government Data Integration Agent is operational',
      data: {
        status: 'online',
        timestamp: new Date(),
        sourcesConfigured: sources.length,
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Agent initialization error',
      message: error.message
    });
  }
});

// Get monitoring dashboard data
router.get('/api/government-data/monitoring/dashboard', isAuthenticated, async (req, res) => {
  try {
    const dashboardData = governmentDataMonitor.getDashboardData();
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve monitoring dashboard',
      message: error.message
    });
  }
});

// Get monitoring alerts
router.get('/api/government-data/monitoring/alerts', isAuthenticated, async (req, res) => {
  try {
    const alerts = governmentDataMonitor.getActiveAlerts();
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts',
      message: error.message
    });
  }
});

// Resolve a monitoring alert
router.post('/api/government-data/monitoring/alerts/:alertId/resolve', isAuthenticated, async (req, res) => {
  try {
    const { alertId } = req.params;
    const resolved = governmentDataMonitor.resolveAlert(alertId);
    
    if (resolved) {
      res.json({
        success: true,
        message: `Alert ${alertId} resolved`,
        data: { alertId, resolved: true }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found',
        message: `Alert ${alertId} not found or already resolved`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      message: error.message
    });
  }
});

// Get system metrics
router.get('/api/government-data/monitoring/metrics', isAuthenticated, async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || 10;
    const metrics = governmentDataMonitor.getRecentMetrics(count);
    
    res.json({
      success: true,
      data: {
        metrics,
        count: metrics.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

// Start monitoring system
router.post('/api/government-data/monitoring/start', isAuthenticated, async (req, res) => {
  try {
    await governmentDataMonitor.startMonitoring();
    res.json({
      success: true,
      message: 'Monitoring system started',
      data: { status: 'monitoring' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start monitoring',
      message: error.message
    });
  }
});

// Stop monitoring system
router.post('/api/government-data/monitoring/stop', isAuthenticated, async (req, res) => {
  try {
    governmentDataMonitor.stopMonitoring();
    res.json({
      success: true,
      message: 'Monitoring system stopped',
      data: { status: 'stopped' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop monitoring',
      message: error.message
    });
  }
});

// ADVANCED ANALYTICS ENDPOINTS

// Get source-level KPIs and performance metrics
router.get('/api/government-data/analytics/sources', isAuthenticated, async (req, res) => {
  try {
    const sourceKPIs = await analyticsService.getSourceKPIs();
    res.json({
      success: true,
      data: {
        sources: sourceKPIs,
        timestamp: new Date(),
        total_sources: sourceKPIs.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve source analytics',
      message: error.message
    });
  }
});

// Get comprehensive error taxonomy and analysis
router.get('/api/government-data/analytics/errors', isAuthenticated, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const errorTaxonomy = await analyticsService.getErrorTaxonomy(days);
    
    res.json({
      success: true,
      data: errorTaxonomy
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve error analytics',
      message: error.message
    });
  }
});

// Get cost-aware routing analysis and recommendations
router.get('/api/government-data/analytics/cost-routing', isAuthenticated, async (req, res) => {
  try {
    const costAnalysis = await analyticsService.getCostRoutingAnalysis();
    
    res.json({
      success: true,
      data: costAnalysis,
      insights: {
        recommendation_count: costAnalysis.routing_recommendations.length,
        preferred_sources: costAnalysis.source_costs.filter(s => s.status === 'preferred').length,
        expensive_sources: costAnalysis.source_costs.filter(s => s.status === 'expensive').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cost analysis',
      message: error.message
    });
  }
});

// Get analytics summary dashboard
router.get('/api/government-data/analytics/summary', isAuthenticated, async (req, res) => {
  try {
    const [sourceKPIs, errorTaxonomy, costAnalysis] = await Promise.all([
      analyticsService.getSourceKPIs(),
      analyticsService.getErrorTaxonomy(7),
      analyticsService.getCostRoutingAnalysis()
    ]);
    
    // Calculate summary metrics
    const totalRecordsToday = sourceKPIs.reduce((sum, source) => sum + source.kpis.records_processed_today, 0);
    const avgSuccessRate = sourceKPIs.reduce((sum, source) => sum + source.kpis.success_rate, 0) / sourceKPIs.length;
    const healthySources = sourceKPIs.filter(source => source.health_score >= 80).length;
    const criticalErrors = Object.values(errorTaxonomy.categories).filter(cat => cat.severity === 'critical').length;
    
    res.json({
      success: true,
      data: {
        overview: {
          total_sources: sourceKPIs.length,
          healthy_sources: healthySources,
          records_processed_today: totalRecordsToday,
          avg_success_rate: Math.round(avgSuccessRate * 100) / 100,
          daily_cost: costAnalysis.cost_analysis.estimated_daily_cost
        },
        alerts: {
          critical_errors: criticalErrors,
          cost_optimization_opportunities: costAnalysis.routing_recommendations.length,
          low_performing_sources: sourceKPIs.filter(s => s.health_score < 60).length
        },
        top_performers: sourceKPIs.slice(0, 3).map(s => ({
          name: s.name,
          health_score: s.health_score,
          success_rate: s.kpis.success_rate
        })),
        cost_insights: {
          preferred_sources: costAnalysis.source_costs.filter(s => s.status === 'preferred').length,
          potential_savings: costAnalysis.routing_recommendations[0]?.savings_potential || 'N/A'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics summary',
      message: error.message
    });
  }
});

// Test endpoint to verify agent functionality
router.post('/api/government-data/test', isAuthenticated, async (req, res) => {
  try {
    console.log('🧪 Testing Government Data Integration Agent...');
    
    // Start a test ingestion with the first enabled source
    const sources = governmentDataAgent.getDataSources().filter(s => s.enabled);
    if (sources.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No enabled data sources found',
        message: 'Enable at least one data source before testing'
      });
    }
    
    const testSource = sources[0];
    const job = await governmentDataAgent.startSourceIngestion(testSource.id);
    
    res.json({
      success: true,
      message: 'Government Data Integration Agent test started',
      data: {
        testJob: {
          id: job.id,
          sourceId: job.sourceId,
          status: job.status,
          message: 'Check job status for progress updates'
        },
        instructions: {
          checkStatus: `/api/government-data/jobs/${job.id}`,
          viewAllJobs: '/api/government-data/jobs',
          systemHealth: '/api/government-data/health'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error.message
    });
  }
});

// DEMO AGENT ENDPOINTS

// Start comprehensive demo scenario
router.post('/api/government-data/demo/start', isAuthenticated, async (req, res) => {
  try {
    const result = await demoAgent.startDemo();
    res.json({
      success: result.success,
      message: result.message,
      data: {
        scenario: result.scenario,
        duration: result.duration,
        instructions: {
          status: '/api/government-data/demo/status',
          dashboard: '/api/government-data/monitoring/dashboard',
          jobs: '/api/government-data/jobs',
          analytics: '/api/government-data/analytics/summary'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start demo',
      message: error.message
    });
  }
});

// Stop demo and get summary
router.post('/api/government-data/demo/stop', isAuthenticated, async (req, res) => {
  try {
    const result = await demoAgent.stopDemo();
    res.json({
      success: result.success,
      message: result.message,
      data: {
        summary: result.summary,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop demo',
      message: error.message
    });
  }
});

// Get current demo status
router.get('/api/government-data/demo/status', isAuthenticated, (req, res) => {
  try {
    const status = demoAgent.getDemoStatus();
    res.json({
      success: true,
      data: {
        ...status,
        timestamp: new Date(),
        instructions: status.running ? {
          stop_demo: 'POST /api/government-data/demo/stop',
          view_dashboard: '/api/government-data/monitoring/dashboard',
          check_jobs: '/api/government-data/jobs'
        } : {
          start_demo: 'POST /api/government-data/demo/start',
          create_scenario: 'POST /api/government-data/demo/scenario/{type}'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get demo status',
      message: error.message
    });
  }
});

// Create specific demo scenarios
router.post('/api/government-data/demo/scenario/:type', isAuthenticated, async (req, res) => {
  try {
    const scenarioType = req.params.type as 'success' | 'errors' | 'mixed';
    
    if (!['success', 'errors', 'mixed'].includes(scenarioType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scenario type',
        message: 'Scenario type must be: success, errors, or mixed',
        available_scenarios: ['success', 'errors', 'mixed']
      });
    }
    
    const result = await demoAgent.createShowcaseScenario(scenarioType);
    res.json({
      success: result.success,
      message: result.message,
      data: {
        scenario: scenarioType,
        jobs_created: result.jobs_created,
        estimated_duration: result.estimated_duration,
        instructions: {
          check_progress: '/api/government-data/jobs',
          view_errors: '/api/government-data/analytics/errors',
          dashboard: '/api/government-data/monitoring/dashboard'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create demo scenario',
      message: error.message
    });
  }
});

// Demo quick-start guide endpoint
router.get('/api/government-data/demo/guide', (req, res) => {
  res.json({
    success: true,
    data: {
      title: '🎬 VendorGrid Government Data Integration Demo Guide',
      description: 'Interactive demonstration of Canadian business data processing capabilities',
      quick_start: {
        step1: 'POST /api/government-data/demo/start - Start comprehensive demo',
        step2: 'GET /api/government-data/monitoring/dashboard - View live dashboard',
        step3: 'GET /api/government-data/jobs - Monitor job progress',
        step4: 'GET /api/government-data/analytics/summary - View analytics',
        step5: 'POST /api/government-data/demo/stop - Stop demo and get summary'
      },
      scenarios: {
        'success': 'Demonstrates smooth data processing with high success rates',
        'errors': 'Shows error handling, categorization, and recovery',
        'mixed': 'Realistic blend of successes and failures'
      },
      features_showcased: [
        'Real-time job monitoring and progress tracking',
        'Error taxonomy and intelligent categorization',
        'Cost-aware routing and optimization recommendations',
        'Source-level KPI tracking and health scoring',
        'Live analytics dashboard with charts and metrics',
        'Alert generation and monitoring system'
      ],
      data_sources: [
        'Corporations Canada Federal Registry',
        'Statistics Canada Business Register',
        'Ontario Business Registry',
        'Quebec Business Registry (REQ)',
        'BC Business Registry'
      ]
    }
  });
});

export default router;
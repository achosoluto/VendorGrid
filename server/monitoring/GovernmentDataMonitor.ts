import { EventEmitter } from 'events';
import { governmentDataAgent } from '../agents/GovernmentDataIntegrationAgent';
import { storage } from '../storage';
import fs from 'fs/promises';
import path from 'path';

/**
 * Government Data Integration Monitoring & Alerting System
 * 
 * Provides comprehensive monitoring, alerting, and logging for the
 * Government Data Integration Agent with production-ready features.
 */

export interface MonitoringAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'job_failure' | 'rate_limit' | 'system_health' | 'data_quality' | 'api_error';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  firstSeen?: Date;
  lastUpdated?: Date;
  suppressedCount?: number;
}

export interface AlertState {
  active: boolean;
  firstSeen: Date;
  lastLogged: Date;
  suppressedCount: number;
  currentScore?: number;
}

export interface LoginNotification {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  dataQualityScore?: number;
  activeAlertsCount: number;
  acknowledged: boolean;
}

export interface SystemMetrics {
  timestamp: Date;
  jobsRunning: number;
  jobsCompleted: number;
  jobsFailed: number;
  totalVendors: number;
  dailyIngestionRate: number;
  apiSuccessRate: number;
  averageProcessingTime: number;
  dataQualityScore: number;
  systemLoad: {
    cpu?: number;
    memory?: number;
    diskSpace?: number;
  };
}

export class GovernmentDataMonitor extends EventEmitter {
  private alerts: Map<string, MonitoringAlert> = new Map();
  private metrics: SystemMetrics[] = [];
  private logFilePath: string;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  // Stateful alerting
  private alertStates: Map<string, AlertState> = new Map();
  private loginNotifications: Map<string, LoginNotification> = new Map();
  private userSessions: Set<string> = new Set(); // Track active sessions

  constructor() {
    super();
    this.logFilePath = path.join(process.cwd(), 'logs', 'government-data-integration.log');
    this.initializeLogging();
  }

  /**
   * Start monitoring system
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    console.log('📊 Starting Government Data Integration monitoring...');
    this.isMonitoring = true;

    // Monitor every 60 seconds for demo (less noisy)
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.checkSystemHealth();
    }, 60000);

    // Initial metrics collection
    await this.collectMetrics();
    await this.checkSystemHealth();

    this.log('info', 'Government Data Integration monitoring started');
  }

  /**
   * Stop monitoring system
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('🔴 Stopping Government Data Integration monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.log('info', 'Government Data Integration monitoring stopped');
  }

  /**
   * Collect system metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const jobs = governmentDataAgent.getJobStatus();
      const health = await governmentDataAgent.getSystemHealth();

      const jobsRunning = jobs.filter(job => job.status === 'running').length;
      const jobsCompleted = jobs.filter(job => job.status === 'completed').length;
      const jobsFailed = jobs.filter(job => job.status === 'failed').length;

      // Calculate success rate
      const totalCompleted = jobsCompleted + jobsFailed;
      const apiSuccessRate = totalCompleted > 0 ? (jobsCompleted / totalCompleted) * 100 : 100;

      // Calculate average processing time from completed jobs
      const completedJobs = jobs.filter(job => job.status === 'completed' && job.startTime && job.endTime);
      const averageProcessingTime = completedJobs.length > 0 
        ? completedJobs.reduce((sum, job) => {
            const duration = job.endTime!.getTime() - job.startTime!.getTime();
            return sum + duration;
          }, 0) / completedJobs.length
        : 0;

      // Calculate data quality score (based on successful vs failed records)
      const totalSuccessful = jobs.reduce((sum, job) => sum + job.successfulRecords, 0);
      const totalFailed = jobs.reduce((sum, job) => sum + job.failedRecords, 0);
      const totalProcessed = totalSuccessful + totalFailed;
      const dataQualityScore = totalProcessed > 0 ? (totalSuccessful / totalProcessed) * 100 : 100;

      const metrics: SystemMetrics = {
        timestamp: new Date(),
        jobsRunning,
        jobsCompleted,
        jobsFailed,
        totalVendors: health.totalVendors,
        dailyIngestionRate: health.recentlyAdded,
        apiSuccessRate,
        averageProcessingTime,
        dataQualityScore,
        systemLoad: await this.getSystemLoad()
      };

      this.metrics.push(metrics);

      // Keep only last 1000 metrics (about 8 hours at 30s intervals)
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      // Emit metrics event
      this.emit('metrics', metrics);

    } catch (error) {
      this.log('error', `Failed to collect metrics: ${error.message}`);
      this.createAlert('system_health', 'medium', 'Metrics collection failed', { error: error.message });
    }
  }

  /**
   * Check system health and create alerts if needed
   */
  private async checkSystemHealth(): Promise<void> {
    try {
      const jobs = governmentDataAgent.getJobStatus();
      const health = await governmentDataAgent.getSystemHealth();
      const currentMetrics = this.metrics[this.metrics.length - 1];

      // Check for failed jobs
      const failedJobs = jobs.filter(job => job.status === 'failed');
      for (const job of failedJobs) {
        const alertId = `job_failure_${job.id}`;
        if (!this.alerts.has(alertId)) {
          this.createAlert('job_failure', 'high', 
            `Job ${job.id} failed for source ${job.sourceId}`, 
            { jobId: job.id, sourceId: job.sourceId, errors: job.errors }
          );
        }
      }

      // Check API success rate
      if (currentMetrics && currentMetrics.apiSuccessRate < 80) {
        this.createAlert('system_health', 'high', 
          `Low API success rate: ${currentMetrics.apiSuccessRate.toFixed(1)}%`,
          { successRate: currentMetrics.apiSuccessRate }
        );
      }

      // Check data quality with stateful alerting (no spam)
      if (currentMetrics) {
        this.handleDataQualityAlert(currentMetrics.dataQualityScore);
      }

      // Check for long-running jobs (over 1 hour)
      const longRunningJobs = jobs.filter(job => 
        job.status === 'running' && 
        job.startTime && 
        (Date.now() - job.startTime.getTime()) > 3600000
      );

      for (const job of longRunningJobs) {
        const alertId = `long_running_${job.id}`;
        if (!this.alerts.has(alertId)) {
          const duration = Math.round((Date.now() - job.startTime!.getTime()) / 60000);
          this.createAlert('system_health', 'medium', 
            `Job ${job.id} running for ${duration} minutes`,
            { jobId: job.id, duration: duration }
          );
        }
      }

    } catch (error) {
      this.log('error', `Health check failed: ${error.message}`);
      this.createAlert('system_health', 'critical', 'System health check failed', { error: error.message });
    }
  }

  /**
   * Get system load metrics
   */
  private async getSystemLoad(): Promise<{ cpu?: number; memory?: number; diskSpace?: number }> {
    try {
      // Basic memory usage
      const memUsage = process.memoryUsage();
      const memoryUsage = memUsage.heapUsed / memUsage.heapTotal * 100;

      return {
        memory: memoryUsage
      };
    } catch (error) {
      this.log('warn', `Failed to get system load: ${error.message}`);
      return {};
    }
  }

  /**
   * Create a monitoring alert
   */
  private createAlert(
    type: MonitoringAlert['type'], 
    severity: MonitoringAlert['severity'], 
    message: string, 
    details: Record<string, any> = {}
  ): void {
    const alert: MonitoringAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      severity,
      type,
      message,
      details,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.set(alert.id, alert);
    
    // Log the alert
    this.log('warn', `ALERT [${severity.toUpperCase()}] ${type}: ${message}`, details);
    
    // Emit alert event
    this.emit('alert', alert);

    // Auto-resolve low severity alerts after 10 minutes
    if (severity === 'low') {
      setTimeout(() => {
        this.resolveAlert(alert.id);
      }, 600000);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.log('info', `Alert resolved: ${alert.message}`);
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): MonitoringAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 10): SystemMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get monitoring dashboard data
   */
  getDashboardData(): {
    alerts: MonitoringAlert[];
    metrics: SystemMetrics[];
    summary: {
      activeJobs: number;
      totalAlerts: number;
      systemHealth: 'healthy' | 'warning' | 'critical';
      lastUpdate: Date;
    };
  } {
    const activeAlerts = this.getActiveAlerts();
    const recentMetrics = this.getRecentMetrics(5);
    
    // Determine system health
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (activeAlerts.some(alert => alert.severity === 'critical')) {
      systemHealth = 'critical';
    } else if (activeAlerts.some(alert => alert.severity === 'high' || alert.severity === 'medium')) {
      systemHealth = 'warning';
    }

    const jobs = governmentDataAgent.getJobStatus();
    const activeJobs = jobs.filter(job => job.status === 'running' || job.status === 'pending').length;

    return {
      alerts: activeAlerts,
      metrics: recentMetrics,
      summary: {
        activeJobs,
        totalAlerts: activeAlerts.length,
        systemHealth,
        lastUpdate: new Date()
      }
    };
  }

  /**
   * Initialize logging system
   */
  private async initializeLogging(): Promise<void> {
    try {
      const logDir = path.dirname(this.logFilePath);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize logging directory:', error);
    }
  }

  /**
   * Log a message with structured format
   */
  private async log(level: 'info' | 'warn' | 'error', message: string, meta?: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: 'government-data-integration',
      message,
      ...(meta && { meta })
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    // Console output
    const colorMap = {
      info: '\x1b[36m',   // Cyan
      warn: '\x1b[33m',   // Yellow
      error: '\x1b[31m'   // Red
    };
    const resetColor = '\x1b[0m';
    console.log(`${colorMap[level]}[${timestamp}] ${level.toUpperCase()}: ${message}${resetColor}`);

    // File output
    try {
      await fs.appendFile(this.logFilePath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Handle data quality alerts with stateful logic (no spam)
   */
  private handleDataQualityAlert(qualityScore: number): void {
    const alertKey = 'data_quality_main';
    const threshold = 90;
    const isBelow = qualityScore < threshold;
    
    const currentState = this.alertStates.get(alertKey);
    
    if (isBelow) {
      if (!currentState || !currentState.active) {
        // New alert - log it once
        const state: AlertState = {
          active: true,
          firstSeen: new Date(),
          lastLogged: new Date(),
          suppressedCount: 0,
          currentScore: qualityScore
        };
        this.alertStates.set(alertKey, state);
        
        // Log only once when alert starts
        this.log('warn', `ALERT [MEDIUM] data_quality: Started - Score below threshold: ${qualityScore.toFixed(1)}%`, 
          { qualityScore, threshold, firstAlert: true });
          
        // Create login notification
        this.createLoginNotification(qualityScore);
        
      } else {
        // Alert is ongoing - just update state, don't log
        currentState.suppressedCount++;
        currentState.currentScore = qualityScore;
        // Update login notification with current score
        this.updateLoginNotification(qualityScore);
      }
    } else if (currentState?.active) {
      // Alert resolved
      currentState.active = false;
      const duration = Date.now() - currentState.firstSeen.getTime();
      
      this.log('info', `ALERT [MEDIUM] data_quality: Resolved - Score back above threshold: ${qualityScore.toFixed(1)}%`,
        { qualityScore, threshold, duration: Math.round(duration / 1000), suppressedCount: currentState.suppressedCount });
        
      // Clear login notification
      this.clearLoginNotification();
    }
  }

  /**
   * Create login notification for data quality issues
   */
  private createLoginNotification(qualityScore: number): void {
    const notification: LoginNotification = {
      id: 'data_quality_notification',
      message: `Data quality score is ${qualityScore.toFixed(1)}% (below 90% threshold)`,
      severity: qualityScore < 50 ? 'error' : 'warning',
      timestamp: new Date(),
      dataQualityScore: qualityScore,
      activeAlertsCount: this.getActiveAlerts().length,
      acknowledged: false
    };
    this.loginNotifications.set(notification.id, notification);
  }

  /**
   * Update existing login notification with current score
   */
  private updateLoginNotification(qualityScore: number): void {
    const notification = this.loginNotifications.get('data_quality_notification');
    if (notification && !notification.acknowledged) {
      notification.message = `Data quality score is ${qualityScore.toFixed(1)}% (below 90% threshold)`;
      notification.severity = qualityScore < 50 ? 'error' : 'warning';
      notification.dataQualityScore = qualityScore;
      notification.activeAlertsCount = this.getActiveAlerts().length;
    }
  }

  /**
   * Clear login notification when issues are resolved
   */
  private clearLoginNotification(): void {
    this.loginNotifications.delete('data_quality_notification');
  }

  /**
   * Get pending notifications for a user login
   */
  getLoginNotifications(sessionId: string): LoginNotification[] {
    // Only show notifications once per session
    if (this.userSessions.has(sessionId)) {
      return [];
    }
    
    this.userSessions.add(sessionId);
    return Array.from(this.loginNotifications.values()).filter(n => !n.acknowledged);
  }

  /**
   * Acknowledge a notification
   */
  acknowledgeNotification(notificationId: string, sessionId?: string): boolean {
    const notification = this.loginNotifications.get(notificationId);
    if (notification) {
      notification.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get current system status summary (for dashboard/API)
   */
  getSystemStatus(): {
    dataQualityScore: number;
    activeAlertsCount: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    lastUpdate: Date;
    hasUnacknowledgedNotifications: boolean;
  } {
    const recentMetrics = this.getRecentMetrics(1)[0];
    const activeAlerts = this.getActiveAlerts();
    const hasUnacknowledgedNotifications = Array.from(this.loginNotifications.values())
      .some(n => !n.acknowledged);
    
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (activeAlerts.some(alert => alert.severity === 'critical')) {
      systemHealth = 'critical';
    } else if (activeAlerts.some(alert => alert.severity === 'high' || alert.severity === 'medium')) {
      systemHealth = 'warning';
    }

    return {
      dataQualityScore: recentMetrics?.dataQualityScore || 0,
      activeAlertsCount: activeAlerts.length,
      systemHealth,
      lastUpdate: recentMetrics?.timestamp || new Date(),
      hasUnacknowledgedNotifications
    };
  }
}

// Export singleton instance
export const governmentDataMonitor = new GovernmentDataMonitor();
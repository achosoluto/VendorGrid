import { storage } from '../storage';
import { governmentDataAgent } from '../agents/GovernmentDataIntegrationAgent';
import { db } from '../db';
import { vendorProfiles, auditLogs, dataProvenance } from '../../shared/schema';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';

/**
 * Analytics Service for Source-Level KPIs and Advanced Metrics
 * 
 * Provides detailed analytics and monitoring capabilities for the
 * Government Data Integration Agent with source-level breakdowns.
 */

export interface SourceKPIs {
  id: string;
  name: string;
  kpis: {
    success_rate: number;
    avg_latency_ms: number;
    records_processed_today: number;
    records_processed_total: number;
    failure_rate: number;
    last_successful_sync?: Date;
    uptime_percentage: number;
  };
  errors: {
    [errorType: string]: number;
  };
  cost_metrics: {
    requests_today: number;
    requests_total: number;
    estimated_cost: number;
    cost_per_record: number;
    cost_per_request: number;
  };
  health_score: number; // 0-100 composite score
}

export interface ErrorCategory {
  type: string;
  count: number;
  percentage: number;
  examples: string[];
  trend: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggested_action?: string;
}

export interface ErrorTaxonomy {
  error_summary: {
    total_errors: number;
    unique_types: number;
    most_frequent: string;
    period: string;
  };
  categories: {
    [category: string]: ErrorCategory;
  };
  trends: {
    daily_counts: { date: string; count: number }[];
    weekly_change: number;
    monthly_change: number;
  };
}

export class AnalyticsService {
  private errorPatterns: Map<string, RegExp> = new Map();
  
  constructor() {
    this.initializeErrorPatterns();
  }

  /**
   * Get comprehensive source-level KPIs
   */
  async getSourceKPIs(): Promise<SourceKPIs[]> {
    const sources = governmentDataAgent.getDataSources();
    const jobs = governmentDataAgent.getJobStatus();
    const sourceKPIs: SourceKPIs[] = [];

    for (const source of sources) {
      const sourceJobs = jobs.filter(job => job.sourceId === source.id);
      const completedJobs = sourceJobs.filter(job => job.status === 'completed');
      const failedJobs = sourceJobs.filter(job => job.status === 'failed');
      const runningJobs = sourceJobs.filter(job => job.status === 'running');

      // Calculate success rate
      const totalCompleted = completedJobs.length + failedJobs.length;
      const successRate = totalCompleted > 0 ? (completedJobs.length / totalCompleted) * 100 : 100;
      const failureRate = 100 - successRate;

      // Calculate average latency from completed jobs
      const avgLatency = completedJobs.length > 0 
        ? completedJobs.reduce((sum, job) => {
            if (job.startTime && job.endTime) {
              return sum + (job.endTime.getTime() - job.startTime.getTime());
            }
            return sum;
          }, 0) / completedJobs.length
        : 0;

      // Records processed
      const recordsProcessedTotal = sourceJobs.reduce((sum, job) => sum + job.successfulRecords, 0);
      const recordsProcessedToday = await this.getRecordsProcessedToday(source.id);

      // Error categorization
      const errors = await this.categorizeSourceErrors(source.id);

      // Cost metrics
      const costMetrics = await this.calculateSourceCosts(source.id);

      // Health score (composite: success_rate * 0.4 + uptime * 0.3 + latency_score * 0.3)
      const latencyScore = Math.max(0, 100 - (avgLatency / 1000)); // Penalize high latency
      const uptimePercentage = await this.calculateSourceUptime(source.id);
      const healthScore = Math.round(
        successRate * 0.4 + 
        uptimePercentage * 0.3 + 
        latencyScore * 0.3
      );

      sourceKPIs.push({
        id: source.id,
        name: source.name,
        kpis: {
          success_rate: Math.round(successRate * 100) / 100,
          avg_latency_ms: Math.round(avgLatency),
          records_processed_today: recordsProcessedToday,
          records_processed_total: recordsProcessedTotal,
          failure_rate: Math.round(failureRate * 100) / 100,
          last_successful_sync: source.lastSync,
          uptime_percentage: Math.round(uptimePercentage * 100) / 100,
        },
        errors,
        cost_metrics: costMetrics,
        health_score: healthScore
      });
    }

    return sourceKPIs.sort((a, b) => b.health_score - a.health_score);
  }

  /**
   * Get comprehensive error taxonomy and analysis
   */
  async getErrorTaxonomy(days: number = 7): Promise<ErrorTaxonomy> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const jobs = governmentDataAgent.getJobStatus();
    
    // Collect all errors from the specified period
    const allErrors: string[] = [];
    for (const job of jobs) {
      if (job.startTime && job.startTime >= startDate) {
        allErrors.push(...job.errors);
      }
    }

    // Categorize errors
    const categories = await this.categorizeErrors(allErrors);
    
    // Calculate trends
    const dailyCounts = await this.calculateDailyErrorCounts(days);
    const weeklyChange = await this.calculateErrorTrendChange(7);
    const monthlyChange = await this.calculateErrorTrendChange(30);

    // Find most frequent category
    let mostFrequent = 'none';
    let maxCount = 0;
    Object.entries(categories).forEach(([category, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        mostFrequent = category;
      }
    });

    return {
      error_summary: {
        total_errors: allErrors.length,
        unique_types: Object.keys(categories).length,
        most_frequent: mostFrequent,
        period: `${days} days`
      },
      categories,
      trends: {
        daily_counts: dailyCounts,
        weekly_change: weeklyChange,
        monthly_change: monthlyChange
      }
    };
  }

  /**
   * Get cost-aware routing recommendations
   */
  async getCostRoutingAnalysis(): Promise<{
    cost_analysis: {
      total_requests_today: number;
      estimated_daily_cost: number;
      cost_per_record: number;
    };
    source_costs: Array<{
      id: string;
      name: string;
      cost_per_request: number;
      cost_per_record: number;
      requests_today: number;
      requests_total: number;
      priority_score: number;
      status: 'preferred' | 'acceptable' | 'expensive' | 'unavailable';
    }>;
    routing_recommendations: Array<{
      message: string;
      savings_potential: string;
      action: string;
    }>;
  }> {
    const sources = governmentDataAgent.getDataSources();
    const sourceCosts = [];
    let totalRequestsToday = 0;
    let totalCostToday = 0;
    let totalRecordsToday = 0;

    for (const source of sources) {
      const costMetrics = await this.calculateSourceCosts(source.id);
      const recordsToday = await this.getRecordsProcessedToday(source.id);
      
      // Calculate priority score (higher = better)
      // Free sources get 100, paid sources get scored based on cost-effectiveness
      let priorityScore = 100;
      if (costMetrics.cost_per_record > 0) {
        priorityScore = Math.max(10, 100 - (costMetrics.cost_per_record * 1000));
      }

      // Determine status based on cost and availability
      let status: 'preferred' | 'acceptable' | 'expensive' | 'unavailable' = 'preferred';
      if (!source.enabled) {
        status = 'unavailable';
      } else if (costMetrics.cost_per_record === 0) {
        status = 'preferred'; // Free sources are always preferred
      } else if (costMetrics.cost_per_record < 0.01) {
        status = 'acceptable';
      } else {
        status = 'expensive';
      }

      sourceCosts.push({
        id: source.id,
        name: source.name,
        cost_per_request: costMetrics.cost_per_request,
        cost_per_record: costMetrics.cost_per_record,
        requests_today: costMetrics.requests_today,
        requests_total: costMetrics.requests_total,
        priority_score: priorityScore,
        status
      });

      totalRequestsToday += costMetrics.requests_today;
      totalCostToday += costMetrics.estimated_cost;
      totalRecordsToday += recordsToday;
    }

    // Generate routing recommendations
    const recommendations = this.generateRoutingRecommendations(sourceCosts);

    return {
      cost_analysis: {
        total_requests_today: totalRequestsToday,
        estimated_daily_cost: Math.round(totalCostToday * 100) / 100,
        cost_per_record: totalRecordsToday > 0 ? Math.round((totalCostToday / totalRecordsToday) * 10000) / 10000 : 0
      },
      source_costs: sourceCosts.sort((a, b) => b.priority_score - a.priority_score),
      routing_recommendations: recommendations
    };
  }

  /**
   * Initialize error pattern recognition
   */
  private initializeErrorPatterns(): void {
    this.errorPatterns.set('schema_validation', /(?:missing|required|invalid|validation).*(?:field|schema|format)/i);
    this.errorPatterns.set('database_constraint', /(?:duplicate|constraint|foreign key|unique|violation)/i);
    this.errorPatterns.set('api_4xx', /(?:HTTP 4\d\d|400|401|403|404|429)/i);
    this.errorPatterns.set('api_5xx', /(?:HTTP 5\d\d|500|502|503|504)/i);
    this.errorPatterns.set('rate_limit', /(?:rate limit|too many requests|quota exceeded)/i);
    this.errorPatterns.set('timeout', /(?:timeout|timed out|connection timeout)/i);
    this.errorPatterns.set('network', /(?:network|connection|socket|dns|unreachable)/i);
    this.errorPatterns.set('authentication', /(?:auth|unauthorized|forbidden|token|credential)/i);
  }

  /**
   * Categorize errors using pattern matching
   */
  private async categorizeErrors(errors: string[]): Promise<{ [category: string]: ErrorCategory }> {
    const categories: { [category: string]: ErrorCategory } = {};
    const uncategorized: string[] = [];

    // Initialize categories
    for (const [category] of this.errorPatterns) {
      categories[category] = {
        type: category,
        count: 0,
        percentage: 0,
        examples: [],
        trend: 'stable',
        severity: this.getErrorSeverity(category)
      };
    }

    // Categorize each error
    for (const error of errors) {
      let categorized = false;
      
      for (const [category, pattern] of this.errorPatterns) {
        if (pattern.test(error)) {
          categories[category].count++;
          if (categories[category].examples.length < 3) {
            categories[category].examples.push(error);
          }
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        uncategorized.push(error);
      }
    }

    // Add uncategorized errors
    if (uncategorized.length > 0) {
      categories['uncategorized'] = {
        type: 'uncategorized',
        count: uncategorized.length,
        percentage: 0,
        examples: uncategorized.slice(0, 3),
        trend: 'stable',
        severity: 'medium'
      };
    }

    // Calculate percentages and add suggested actions
    const totalErrors = errors.length;
    Object.keys(categories).forEach(category => {
      const cat = categories[category];
      cat.percentage = totalErrors > 0 ? Math.round((cat.count / totalErrors) * 1000) / 10 : 0;
      cat.suggested_action = this.getSuggestedAction(category);
      
      // Remove empty categories
      if (cat.count === 0) {
        delete categories[category];
      }
    });

    return categories;
  }

  /**
   * Get error severity level
   */
  private getErrorSeverity(category: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap = {
      'api_5xx': 'critical',
      'database_constraint': 'high',
      'authentication': 'high',
      'rate_limit': 'medium',
      'api_4xx': 'medium',
      'schema_validation': 'medium',
      'timeout': 'medium',
      'network': 'low'
    };
    return severityMap[category] || 'medium';
  }

  /**
   * Get suggested action for error category
   */
  private getSuggestedAction(category: string): string {
    const actionMap = {
      'schema_validation': 'Review and update data validation rules',
      'database_constraint': 'Check for duplicate data and fix constraints',
      'api_4xx': 'Verify API endpoints and request parameters',
      'api_5xx': 'Contact API provider or implement retry logic',
      'rate_limit': 'Reduce request frequency or implement backoff',
      'timeout': 'Increase timeout values or optimize requests',
      'network': 'Check network connectivity and DNS resolution',
      'authentication': 'Verify API keys and authentication credentials'
    };
    return actionMap[category] || 'Investigate error patterns and logs';
  }

  /**
   * Helper methods for specific calculations
   */
  private async getRecordsProcessedToday(sourceId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const jobs = governmentDataAgent.getJobStatus().filter(job => 
      job.sourceId === sourceId && 
      job.startTime && 
      job.startTime >= today
    );
    
    return jobs.reduce((sum, job) => sum + job.successfulRecords, 0);
  }

  private async categorizeSourceErrors(sourceId: string): Promise<{ [errorType: string]: number }> {
    const jobs = governmentDataAgent.getJobStatus().filter(job => job.sourceId === sourceId);
    const errors: string[] = [];
    
    jobs.forEach(job => errors.push(...job.errors));
    
    const categories = await this.categorizeErrors(errors);
    const result: { [errorType: string]: number } = {};
    
    Object.entries(categories).forEach(([type, data]) => {
      result[type] = data.count;
    });
    
    return result;
  }

  private async calculateSourceCosts(sourceId: string): Promise<{
    requests_today: number;
    requests_total: number;
    estimated_cost: number;
    cost_per_record: number;
    cost_per_request: number;
  }> {
    const jobs = governmentDataAgent.getJobStatus().filter(job => job.sourceId === sourceId);
    
    // Most government APIs are free, but we'll track requests for future cost modeling
    const costPerRequest = this.getSourceCostPerRequest(sourceId);
    
    const requestsTotal = jobs.length;
    const requestsToday = jobs.filter(job => {
      if (!job.startTime) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return job.startTime >= today;
    }).length;
    
    const totalRecords = jobs.reduce((sum, job) => sum + job.successfulRecords, 0);
    const estimatedCost = requestsTotal * costPerRequest;
    const costPerRecord = totalRecords > 0 ? estimatedCost / totalRecords : 0;

    return {
      requests_today: requestsToday,
      requests_total: requestsTotal,
      estimated_cost: Math.round(estimatedCost * 100) / 100,
      cost_per_record: Math.round(costPerRecord * 10000) / 10000,
      cost_per_request: costPerRequest
    };
  }

  private getSourceCostPerRequest(sourceId: string): number {
    // Cost mapping for different sources (most government APIs are free)
    const costMap = {
      'corporations_canada_federal': 0.0,     // Free government API
      'statistics_canada_business_register': 0.0, // Free government API
      'ontario_business_registry': 0.0,       // Free government API
      // Future paid sources would have actual costs
      'third_party_enrichment': 0.01,         // Example paid service
      'commercial_data_provider': 0.005       // Example paid service
    };
    
    return costMap[sourceId] || 0.0;
  }

  private async calculateSourceUptime(sourceId: string): Promise<number> {
    // Simple uptime calculation based on successful vs failed jobs
    const jobs = governmentDataAgent.getJobStatus().filter(job => job.sourceId === sourceId);
    if (jobs.length === 0) return 100;
    
    const successfulJobs = jobs.filter(job => job.status === 'completed').length;
    return (successfulJobs / jobs.length) * 100;
  }

  private async calculateDailyErrorCounts(days: number): Promise<{ date: string; count: number }[]> {
    const counts = [];
    const jobs = governmentDataAgent.getJobStatus();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayJobs = jobs.filter(job => {
        if (!job.startTime) return false;
        return job.startTime.toISOString().split('T')[0] === dateStr;
      });
      
      const errorCount = dayJobs.reduce((sum, job) => sum + job.errors.length, 0);
      counts.push({ date: dateStr, count: errorCount });
    }
    
    return counts;
  }

  private async calculateErrorTrendChange(days: number): Promise<number> {
    const dailyCounts = await this.calculateDailyErrorCounts(days * 2); // Get double period for comparison
    
    if (dailyCounts.length < days * 2) return 0;
    
    const recentPeriod = dailyCounts.slice(-days);
    const previousPeriod = dailyCounts.slice(-days * 2, -days);
    
    const recentTotal = recentPeriod.reduce((sum, day) => sum + day.count, 0);
    const previousTotal = previousPeriod.reduce((sum, day) => sum + day.count, 0);
    
    if (previousTotal === 0) return 0;
    return Math.round(((recentTotal - previousTotal) / previousTotal) * 100);
  }

  private generateRoutingRecommendations(sourceCosts: Array<{
    id: string;
    name: string;
    cost_per_record: number;
    status: string;
    priority_score: number;
  }>): Array<{
    message: string;
    savings_potential: string;
    action: string;
  }> {
    const recommendations = [];
    const freeSources = sourceCosts.filter(s => s.cost_per_record === 0 && s.status !== 'unavailable');
    const paidSources = sourceCosts.filter(s => s.cost_per_record > 0 && s.status !== 'unavailable');
    
    if (freeSources.length > 0 && paidSources.length > 0) {
      const bestFree = freeSources[0];
      const mostExpensive = paidSources[paidSources.length - 1];
      
      recommendations.push({
        message: `Route majority of requests to ${bestFree.name} (free) instead of ${mostExpensive.name}`,
        savings_potential: `$${(mostExpensive.cost_per_record * 1000).toFixed(2)}/1000 records`,
        action: `increase_routing_weight:${bestFree.id}`
      });
    }
    
    if (paidSources.length > 1) {
      const cheapest = paidSources[0];
      const mostExpensive = paidSources[paidSources.length - 1];
      const savings = (mostExpensive.cost_per_record - cheapest.cost_per_record) * 1000;
      
      if (savings > 0.01) {
        recommendations.push({
          message: `Prefer ${cheapest.name} over ${mostExpensive.name} for cost efficiency`,
          savings_potential: `$${savings.toFixed(2)}/1000 records`,
          action: `prefer_source:${cheapest.id}`
        });
      }
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
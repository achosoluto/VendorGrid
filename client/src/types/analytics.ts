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
  health_score: number;
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

export interface CostAnalysis {
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
}

export interface AnalyticsSummary {
  overview: {
    total_sources: number;
    healthy_sources: number;
    records_processed_today: number;
    avg_success_rate: number;
    daily_cost: number;
  };
  alerts: {
    critical_errors: number;
    cost_optimization_opportunities: number;
    low_performing_sources: number;
  };
  top_performers: Array<{
    name: string;
    health_score: number;
    success_rate: number;
  }>;
  cost_insights: {
    preferred_sources: number;
    potential_savings: string;
  };
}

export interface JobStatus {
  id: string;
  sourceId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startTime?: Date;
  endTime?: Date;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: string[];
  progress?: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    percentage: number;
  };
}

export interface SystemHealth {
  status: string;
  timestamp: Date;
  metrics: {
    activeJobs: number;
    totalVendors: number;
    recentlyAdded: number;
    dataSourcesEnabled: number;
  };
}

export interface MonitoringAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'job_failure' | 'rate_limit' | 'system_health' | 'data_quality' | 'api_error';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}
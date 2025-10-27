import { 
  SourceKPIs, 
  ErrorTaxonomy, 
  CostAnalysis, 
  AnalyticsSummary, 
  JobStatus, 
  SystemHealth, 
  MonitoringAlert 
} from '../types/analytics';

const API_BASE = '/api/government-data';

class AnalyticsApiService {
  private async fetchApi<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.data || data;
  }

  private async postApi<T>(endpoint: string, body?: any): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.data || data;
  }

  // Analytics endpoints
  async getSourceKPIs(): Promise<{ sources: SourceKPIs[]; total_sources: number; timestamp: Date }> {
    return this.fetchApi('/analytics/sources');
  }

  async getErrorTaxonomy(days: number = 7): Promise<ErrorTaxonomy> {
    return this.fetchApi(`/analytics/errors?days=${days}`);
  }

  async getCostAnalysis(): Promise<CostAnalysis> {
    return this.fetchApi('/analytics/cost-routing');
  }

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    return this.fetchApi('/analytics/summary');
  }

  // System monitoring endpoints
  async getSystemHealth(): Promise<SystemHealth> {
    return this.fetchApi('/health');
  }

  async getJobs(): Promise<{ jobs: JobStatus[]; totalJobs: number; activeJobs: number }> {
    return this.fetchApi('/jobs');
  }

  async getJobDetails(jobId: string): Promise<JobStatus> {
    return this.fetchApi(`/jobs/${jobId}`);
  }

  async pauseJob(jobId: string): Promise<void> {
    await this.postApi(`/jobs/${jobId}/pause`);
  }

  async resumeJob(jobId: string): Promise<void> {
    await this.postApi(`/jobs/${jobId}/resume`);
  }

  // Monitoring endpoints
  async getMonitoringDashboard(): Promise<{
    alerts: MonitoringAlert[];
    metrics: any[];
    summary: {
      activeJobs: number;
      totalAlerts: number;
      systemHealth: 'healthy' | 'warning' | 'critical';
      lastUpdate: Date;
    };
  }> {
    return this.fetchApi('/monitoring/dashboard');
  }

  async getAlerts(): Promise<{ alerts: MonitoringAlert[]; count: number }> {
    return this.fetchApi('/monitoring/alerts');
  }

  async resolveAlert(alertId: string): Promise<void> {
    await this.postApi(`/monitoring/alerts/${alertId}/resolve`);
  }

  async getMetrics(count: number = 10): Promise<{ metrics: any[]; count: number }> {
    return this.fetchApi(`/monitoring/metrics?count=${count}`);
  }

  // Ingestion control
  async startFullIngestion(): Promise<{ jobs: JobStatus[] }> {
    return this.postApi('/ingest/full');
  }

  async startSourceIngestion(sourceId: string): Promise<JobStatus> {
    return this.postApi(`/ingest/${sourceId}`);
  }

  // System status
  async ping(): Promise<{ status: string; timestamp: Date }> {
    return this.fetchApi('/ping');
  }

  async getSources(): Promise<{ sources: any[] }> {
    return this.fetchApi('/sources');
  }

  async getStats(): Promise<any> {
    return this.fetchApi('/stats');
  }
}

export const analyticsApi = new AnalyticsApiService();
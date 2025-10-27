import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../services/analyticsApi';
import { AnalyticsSummary, SourceKPIs, ErrorTaxonomy, CostAnalysis, JobStatus, MonitoringAlert } from '../types/analytics';

interface UseAnalyticsReturn {
  summary: AnalyticsSummary | null;
  sources: SourceKPIs[] | null;
  errors: ErrorTaxonomy | null;
  costs: CostAnalysis | null;
  jobs: JobStatus[] | null;
  alerts: MonitoringAlert[] | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  pauseJob: (jobId: string) => Promise<void>;
  resumeJob: (jobId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  startIngestion: (sourceId?: string) => Promise<void>;
}

export const useAnalytics = (autoRefreshInterval: number = 30000): UseAnalyticsReturn => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [sources, setSources] = useState<SourceKPIs[] | null>(null);
  const [errors, setErrors] = useState<ErrorTaxonomy | null>(null);
  const [costs, setCosts] = useState<CostAnalysis | null>(null);
  const [jobs, setJobs] = useState<JobStatus[] | null>(null);
  const [alerts, setAlerts] = useState<MonitoringAlert[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch all analytics data in parallel
      const [
        summaryData,
        sourcesData,
        errorsData,
        costsData,
        jobsData,
        alertsData
      ] = await Promise.all([
        analyticsApi.getAnalyticsSummary(),
        analyticsApi.getSourceKPIs(),
        analyticsApi.getErrorTaxonomy(7),
        analyticsApi.getCostAnalysis(),
        analyticsApi.getJobs(),
        analyticsApi.getAlerts()
      ]);

      setSummary(summaryData);
      setSources(sourcesData.sources);
      setErrors(errorsData);
      setCosts(costsData);
      setJobs(jobsData.jobs);
      setAlerts(alertsData.alerts);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await fetchAllData();
  }, [fetchAllData]);

  const pauseJob = useCallback(async (jobId: string) => {
    try {
      await analyticsApi.pauseJob(jobId);
      await refreshData(); // Refresh data after action
    } catch (err) {
      console.error('Error pausing job:', err);
      throw err;
    }
  }, [refreshData]);

  const resumeJob = useCallback(async (jobId: string) => {
    try {
      await analyticsApi.resumeJob(jobId);
      await refreshData(); // Refresh data after action
    } catch (err) {
      console.error('Error resuming job:', err);
      throw err;
    }
  }, [refreshData]);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      await analyticsApi.resolveAlert(alertId);
      await refreshData(); // Refresh data after action
    } catch (err) {
      console.error('Error resolving alert:', err);
      throw err;
    }
  }, [refreshData]);

  const startIngestion = useCallback(async (sourceId?: string) => {
    try {
      if (sourceId) {
        await analyticsApi.startSourceIngestion(sourceId);
      } else {
        await analyticsApi.startFullIngestion();
      }
      await refreshData(); // Refresh data after action
    } catch (err) {
      console.error('Error starting ingestion:', err);
      throw err;
    }
  }, [refreshData]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh data
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      if (!loading) {
        fetchAllData();
      }
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [fetchAllData, autoRefreshInterval, loading]);

  return {
    summary,
    sources,
    errors,
    costs,
    jobs,
    alerts,
    loading,
    error,
    refreshData,
    pauseJob,
    resumeJob,
    resolveAlert,
    startIngestion
  };
};
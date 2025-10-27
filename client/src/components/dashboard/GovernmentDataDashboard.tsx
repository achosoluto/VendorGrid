import React, { useState } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { OverviewCards } from './OverviewCards';
import { 
  SourceKPIsTable, 
  JobControlPanel, 
  ErrorAnalysis, 
  CostOptimization, 
  AlertsPanel, 
  SystemMetrics 
} from './DashboardComponents';

export const GovernmentDataDashboard: React.FC = () => {
  const {
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
  } = useAnalytics(30000); // Auto-refresh every 30 seconds

  const [selectedTab, setSelectedTab] = useState<'overview' | 'sources' | 'jobs' | 'errors' | 'costs'>('overview');

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Government Data Integration Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center mb-2">
            <div className="text-red-400 mr-2">⚠️</div>
            <h3 className="text-red-800 font-semibold">Dashboard Error</h3>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🏛️ Government Data Integration Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Canadian Business Registry Integration & Analytics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
                {loading && <span className="ml-2">🔄</span>}
              </div>
              <button
                onClick={refreshData}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'sources', label: 'Data Sources', icon: '🏛️' },
              { id: 'jobs', label: 'Jobs', icon: '⚙️' },
              { id: 'errors', label: 'Error Analysis', icon: '🚨' },
              { id: 'costs', label: 'Cost Optimization', icon: '💰' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {summary && <OverviewCards summary={summary} />}
            {alerts && alerts.length > 0 && (
              <AlertsPanel alerts={alerts} onResolveAlert={resolveAlert} />
            )}
            <SystemMetrics />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {jobs && jobs.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Jobs</h3>
                  <div className="space-y-2">
                    {jobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div>
                          <span className="font-medium text-sm">{job.sourceId}</span>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                            job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {job.successfulRecords} / {job.totalRecords} records
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sources && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Sources</h3>
                  <div className="space-y-3">
                    {sources.slice(0, 5).map((source) => (
                      <div key={source.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{source.name}</div>
                          <div className="text-xs text-gray-500">
                            {source.kpis.records_processed_today} records today
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${
                            source.health_score >= 80 ? 'bg-green-400' :
                            source.health_score >= 60 ? 'bg-yellow-400' :
                            'bg-red-400'
                          }`}></div>
                          <span className="text-sm font-medium">{source.health_score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'sources' && sources && (
          <SourceKPIsTable sources={sources} onStartIngestion={startIngestion} />
        )}

        {selectedTab === 'jobs' && jobs && (
          <JobControlPanel 
            jobs={jobs} 
            onPauseJob={pauseJob}
            onResumeJob={resumeJob}
            onStartIngestion={startIngestion}
          />
        )}

        {selectedTab === 'errors' && errors && (
          <ErrorAnalysis errors={errors} />
        )}

        {selectedTab === 'costs' && costs && (
          <CostOptimization costs={costs} />
        )}

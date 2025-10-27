import React from 'react';
import { SourceKPIs, ErrorTaxonomy, CostAnalysis, JobStatus, MonitoringAlert } from '../../types/analytics';

// Source KPIs Table Component
export const SourceKPIsTable: React.FC<{
  sources: SourceKPIs[];
  onStartIngestion: (sourceId: string) => Promise<void>;
}> = ({ sources, onStartIngestion }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">Data Source Performance</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health Score</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records Today</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sources.map((source) => (
            <tr key={source.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    source.health_score >= 80 ? 'bg-green-400' :
                    source.health_score >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{source.name}</div>
                    <div className="text-sm text-gray-500">{source.id}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium">{source.health_score}%</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm">{source.kpis.success_rate.toFixed(1)}%</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm">{source.kpis.records_processed_today.toLocaleString()}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm">${source.cost_metrics.estimated_cost.toFixed(2)}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  onClick={() => onStartIngestion(source.id)}
                  className="text-blue-600 hover:text-blue-900 font-medium"
                >
                  Start Ingestion
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Job Control Panel Component
export const JobControlPanel: React.FC<{
  jobs: JobStatus[];
  onPauseJob: (jobId: string) => Promise<void>;
  onResumeJob: (jobId: string) => Promise<void>;
  onStartIngestion: (sourceId?: string) => Promise<void>;
}> = ({ jobs, onPauseJob, onResumeJob, onStartIngestion }) => (
  <div className="space-y-6">
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Job Control Panel</h3>
        <button
          onClick={() => onStartIngestion()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Start Full Ingestion
        </button>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-medium">{job.sourceId}</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    job.status === 'completed' ? 'bg-green-100 text-green-800' :
                    job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    job.status === 'failed' ? 'bg-red-100 text-red-800' :
                    job.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {job.status === 'running' && (
                    <button
                      onClick={() => onPauseJob(job.id)}
                      className="text-yellow-600 hover:text-yellow-800 text-sm"
                    >
                      Pause
                    </button>
                  )}
                  {job.status === 'paused' && (
                    <button
                      onClick={() => onResumeJob(job.id)}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      Resume
                    </button>
                  )}
                </div>
              </div>
              {job.progress && (
                <div className="mt-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress: {job.progress.percentage}%</span>
                    <span>{job.progress.successful} / {job.progress.total} records</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress.percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {job.errors.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm text-red-600">
                    {job.errors.length} errors
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Error Analysis Component
export const ErrorAnalysis: React.FC<{ errors: ErrorTaxonomy }> = ({ errors }) => (
  <div className="space-y-6">
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{errors.error_summary.total_errors}</div>
          <div className="text-sm text-gray-600">Total Errors</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{errors.error_summary.unique_types}</div>
          <div className="text-sm text-gray-600">Error Types</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{errors.error_summary.most_frequent}</div>
          <div className="text-sm text-gray-600">Most Frequent</div>
        </div>
      </div>
      <div className="space-y-4">
        {Object.entries(errors.categories).map(([category, data]) => (
          <div key={category} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium capitalize">{category.replace('_', ' ')}</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{data.count} errors</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  data.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  data.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  data.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {data.severity}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-2">{data.percentage}% of all errors</div>
            {data.suggested_action && (
              <div className="text-sm text-blue-600">{data.suggested_action}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Cost Optimization Component
export const CostOptimization: React.FC<{ costs: CostAnalysis }> = ({ costs }) => (
  <div className="space-y-6">
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Optimization</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-900">{costs.cost_analysis.total_requests_today}</div>
          <div className="text-sm text-blue-600">Requests Today</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-900">${costs.cost_analysis.estimated_daily_cost.toFixed(2)}</div>
          <div className="text-sm text-green-600">Daily Cost</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-900">${costs.cost_analysis.cost_per_record.toFixed(4)}</div>
          <div className="text-sm text-purple-600">Cost Per Record</div>
        </div>
      </div>
      
      {costs.routing_recommendations.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">💡 Cost Optimization Recommendations</h4>
          <div className="space-y-3">
            {costs.routing_recommendations.map((rec, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="font-medium text-yellow-800 mb-1">{rec.message}</div>
                <div className="text-sm text-yellow-600">
                  Potential savings: {rec.savings_potential}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Record</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests Today</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {costs.source_costs.map((source) => (
              <tr key={source.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {source.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    source.status === 'preferred' ? 'bg-green-100 text-green-800' :
                    source.status === 'acceptable' ? 'bg-blue-100 text-blue-800' :
                    source.status === 'expensive' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {source.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${source.cost_per_record.toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {source.priority_score}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {source.requests_today}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// Alerts Panel Component
export const AlertsPanel: React.FC<{
  alerts: MonitoringAlert[];
  onResolveAlert: (alertId: string) => Promise<void>;
}> = ({ alerts, onResolveAlert }) => (
  <div className="bg-white rounded-lg shadow">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
    </div>
    <div className="p-6">
      <div className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className={`border rounded-lg p-4 ${
            alert.severity === 'critical' ? 'border-red-300 bg-red-50' :
            alert.severity === 'high' ? 'border-orange-300 bg-orange-50' :
            alert.severity === 'medium' ? 'border-yellow-300 bg-yellow-50' :
            'border-blue-300 bg-blue-50'
          }`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full mr-2 ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-medium text-gray-900 mb-1">{alert.message}</div>
                <div className="text-sm text-gray-600">{alert.type}</div>
              </div>
              <button
                onClick={() => onResolveAlert(alert.id)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Resolve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// System Metrics Component (placeholder)
export const SystemMetrics: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">System Metrics</h3>
    <div className="text-center text-gray-500 py-8">
      <div className="text-4xl mb-2">📈</div>
      <div>Real-time metrics charts will appear here</div>
      <div className="text-sm mt-2">Coming soon: Time-series charts for success rates, processing volume, and latency</div>
    </div>
  </div>
);
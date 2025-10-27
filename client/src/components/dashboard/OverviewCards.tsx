import React from 'react';
import { AnalyticsSummary } from '../../types/analytics';

interface OverviewCardsProps {
  summary: AnalyticsSummary;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ summary }) => {
  const cards = [
    {
      title: 'Data Sources',
      value: `${summary.overview.healthy_sources} / ${summary.overview.total_sources}`,
      subtitle: 'Healthy Sources',
      icon: '🏛️',
      color: 'blue',
      details: `${summary.overview.total_sources - summary.overview.healthy_sources} sources need attention`
    },
    {
      title: 'Records Today',
      value: summary.overview.records_processed_today.toLocaleString(),
      subtitle: 'Processed Successfully',
      icon: '📊',
      color: 'green',
      details: `${summary.overview.avg_success_rate.toFixed(1)}% success rate`
    },
    {
      title: 'Daily Cost',
      value: `$${summary.overview.daily_cost.toFixed(2)}`,
      subtitle: 'Estimated Cost',
      icon: '💰',
      color: summary.overview.daily_cost > 10 ? 'yellow' : 'green',
      details: `${summary.cost_insights.potential_savings} potential savings`
    },
    {
      title: 'System Health',
      value: summary.alerts.critical_errors === 0 ? 'Healthy' : 'Issues',
      subtitle: `${summary.alerts.critical_errors} Critical Alerts`,
      icon: summary.alerts.critical_errors === 0 ? '✅' : '⚠️',
      color: summary.alerts.critical_errors === 0 ? 'green' : 'red',
      details: `${summary.alerts.low_performing_sources} sources below 60% health`
    }
  ];

  const getCardStyles = (color: string) => {
    const styles = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      red: 'bg-red-50 border-red-200'
    };
    return styles[color] || styles.blue;
  };

  const getIconStyles = (color: string) => {
    const styles = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      yellow: 'text-yellow-600',
      red: 'text-red-600'
    };
    return styles[color] || styles.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className={`p-6 rounded-lg border-2 ${getCardStyles(card.color)} transition-all hover:shadow-md`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`text-3xl ${getIconStyles(card.color)}`}>
              {card.icon}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-sm text-gray-600">{card.subtitle}</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">{card.title}</div>
            <div className="text-xs text-gray-500">{card.details}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
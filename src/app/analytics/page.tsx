'use client';

import React, { useState, useEffect } from 'react';
import { usePatientsPersistent } from '../../hooks/usePatientsPersistent';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { exportAnalyticsToPDF, exportAnalyticsWithChartsToPDF } from '../../utils/pdfExport';

export default function AnalyticsPage() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { 
    patients, 
    waitingPatients, 
    inTreatmentPatients, 
    completedPatients,
    lastUpdated,
    syncWithServer 
  } = usePatientsPersistent();

  // Wait for hydration to complete
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Show loading state during hydration
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-primary-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary-900 mb-2">Analytics Dashboard</h1>
            <p className="text-primary-700">Loading analytics data...</p>
          </div>
          <div className="flex justify-center items-center py-12">
            <div className="animate-pulse text-primary-600">📊 Hydrating data...</div>
          </div>
        </div>
      </div>
    );
  }

  const getAnalytics = () => {
    const severityDistribution = {
      critical: patients.filter(p => p.severity === 'critical').length,
      high: patients.filter(p => p.severity === 'high').length,
      medium: patients.filter(p => p.severity === 'medium').length,
      low: patients.filter(p => p.severity === 'low').length,
    };

    const statusDistribution = {
      waiting: waitingPatients.length,
      inTreatment: inTreatmentPatients.length,
      completed: completedPatients.length,
    };

    const averageAge = patients.length > 0 
      ? Math.round(patients.reduce((sum, p) => sum + p.age, 0) / patients.length)
      : 0;

    // Calculate average priority
    const averagePriority = patients.length > 0 
      ? Math.round(patients.reduce((sum, p) => sum + p.priority, 0) / patients.length)
      : 0;

    // Calculate wait times for completed patients
    const completedWithTimes = completedPatients.filter(p => p.treatmentEndTime);
    const averageWaitTime = completedWithTimes.length > 0 
      ? Math.round(completedWithTimes.reduce((sum, p) => {
          const start = new Date(p.arrivalTime).getTime();
          const end = new Date(p.treatmentStartTime || p.treatmentEndTime!).getTime();
          return sum + (end - start) / (1000 * 60); // minutes
        }, 0) / completedWithTimes.length)
      : 0;

    return { 
      severityDistribution, 
      statusDistribution, 
      averageAge, 
      averagePriority, 
      averageWaitTime 
    };
  };

  const analytics = getAnalytics();

  const handleExportPDF = async () => {
    const analyticsData = {
      severityDistribution: analytics.severityDistribution,
      statusDistribution: analytics.statusDistribution,
      averageAge: analytics.averageAge,
      averagePriority: analytics.averagePriority,
      averageWaitTime: analytics.averageWaitTime,
      totalPatients: patients.length,
      completionRate: Math.round((analytics.statusDistribution.completed / Math.max(patients.length, 1)) * 100),
      highPriorityCases: patients.filter(p => p.priority >= 100).length,
      waitingPatients: waitingPatients.length,
      inTreatmentPatients: inTreatmentPatients.length
    };

    const result = await exportAnalyticsToPDF(analyticsData);
    
    if (result.success) {
      alert(`✅ Report exported successfully as ${result.fileName}`);
    } else {
      alert(`❌ Export failed: ${result.error}`);
    }
  };

  const handleExportWithCharts = async () => {
    const result = await exportAnalyticsWithChartsToPDF('analytics-dashboard');
    
    if (result.success) {
      alert(`✅ Dashboard exported successfully as ${result.fileName}`);
    } else {
      alert(`❌ Export failed: ${result.error}`);
    }
  };

  const SeverityChart = () => {
    if (!hasHydrated) return <div className="text-gray-500">Loading...</div>;
    
    return (
      <div className="space-y-3">
        {Object.entries(analytics.severityDistribution).map(([severity, count]) => (
          <div key={severity} className="flex items-center justify-between">
            <span className="capitalize font-medium">{severity}</span>
            <div className="flex items-center space-x-2">
              <div 
                className={`h-4 bg-gradient-to-r rounded ${
                  severity === 'critical' ? 'from-red-500 to-red-600' :
                  severity === 'high' ? 'from-orange-500 to-orange-600' :
                  severity === 'medium' ? 'from-yellow-500 to-yellow-600' :
                  'from-green-500 to-green-600'
                }`}
                style={{ width: `${Math.max(count * 20, 20)}px` }}
              />
              <span className="text-sm font-bold">{count}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const StatusChart = () => {
    if (!hasHydrated) return <div className="text-gray-500">Loading...</div>;
    
    return (
      <div className="space-y-3">
        {Object.entries(analytics.statusDistribution).map(([status, count]) => (
          <div key={status} className="flex items-center justify-between">
            <span className="capitalize font-medium">{status.replace(/([A-Z])/g, ' $1')}</span>
            <div className="flex items-center space-x-2">
              <div 
                className={`h-4 bg-gradient-to-r rounded ${
                  status === 'waiting' ? 'from-blue-500 to-blue-600' :
                  status === 'inTreatment' ? 'from-purple-500 to-purple-600' :
                  'from-green-500 to-green-600'
                }`}
                style={{ width: `${Math.max(count * 20, 20)}px` }}
              />
              <span className="text-sm font-bold">{count}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-primary-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-900 mb-2">Analytics Dashboard</h1>
          <p className="text-primary-700">Patient flow insights and system performance metrics</p>
          {lastUpdated && (
            <p className="text-sm text-primary-600 mt-2">
              📂 Data from persistent store • Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Button 
            variant="primary"
            onClick={handleExportPDF}
          >
            📄 Export Report (Data Only)
          </Button>
          <Button 
            variant="primary"
            onClick={handleExportWithCharts}
            className="bg-green-600 hover:bg-green-700"
          >
            📊 Export Dashboard (With Charts)
          </Button>
          <Button variant="secondary" onClick={syncWithServer}>
            🔄 Sync & Refresh Data
          </Button>
          <Button 
            variant="outline"
            onClick={() => alert('Alert configuration coming soon!')}
          >
            ⚠️ Configure Alerts
          </Button>
        </div>
      
        {/* Charts */}
        <div id="analytics-dashboard" className="grid md:grid-cols-2 gap-6 mb-6">
          <Card
            title="Severity Distribution"
            content={<SeverityChart />}
          />
          
          <Card
            title="Patient Status"
            content={<StatusChart />}
          />
        </div>

        {/* Metrics */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card
            title="Key Metrics"
            content={
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {hasHydrated ? patients.length : '...'}
                  </div>
                  <p className="text-gray-500">Total Patients</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {hasHydrated ? analytics.averageAge : '...'}
                  </div>
                  <p className="text-gray-500">Average Age</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {hasHydrated 
                      ? `${Math.round((analytics.statusDistribution.completed / Math.max(patients.length, 1)) * 100)}%`
                      : '...%'
                    }
                  </div>
                  <p className="text-gray-500">Completion Rate</p>
                </div>
              </div>
            }
          />

          <Card
            title="Performance Metrics"
            content={
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {hasHydrated ? analytics.averagePriority : '...'}
                  </div>
                  <p className="text-gray-500">Avg Priority Score</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">
                    {hasHydrated ? `${analytics.averageWaitTime}min` : '...min'}
                  </div>
                  <p className="text-gray-500">Avg Wait Time</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {hasHydrated ? patients.filter(p => p.priority >= 100).length : '...'}
                  </div>
                  <p className="text-gray-500">High Priority Cases</p>
                </div>
              </div>
            }
          />

          <Card
            title="System Status"
            content={
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Queue Length</span>
                  <span className="font-bold text-blue-600">
                    {hasHydrated ? waitingPatients.length : '...'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">In Treatment</span>
                  <span className="font-bold text-purple-600">
                    {hasHydrated ? inTreatmentPatients.length : '...'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Data Source</span>
                  <span className="text-green-600 text-sm font-medium">📂 Persistent Store</span>
                </div>
                {hasHydrated && lastUpdated && (
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Last sync: {new Date(lastUpdated).toLocaleTimeString()}
                  </div>
                )}
              </div>
            }
          />
        </div>
      
        {patients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No patient data available for analytics.</p>
            <p className="text-gray-400">Add patients through the triage system to see analytics.</p>
          </div>
        )}
      </div>
    </div>
  );
}

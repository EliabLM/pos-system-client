'use client';

import { useState } from 'react';
import { PeriodSelector, PeriodValue } from './period-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Example usage of the PeriodSelector component
 *
 * This demonstrates how to integrate the period selector
 * into your dashboard pages with state management.
 */
export function PeriodSelectorExample() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodValue>('day');

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Period Selector Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Usage */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Basic Usage</h3>
            <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
            <p className="text-sm text-muted-foreground">
              Selected period: <strong>{selectedPeriod}</strong>
            </p>
          </div>

          {/* With Custom Styling */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Centered Layout</h3>
            <div className="flex justify-center">
              <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
            </div>
          </div>

          {/* In a Dashboard Header */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Dashboard Header Example</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-sm text-muted-foreground">
                  Resumen de ventas y métricas clave
                </p>
              </div>
              <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
            </div>
          </div>

          {/* Conditional Content Based on Period */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Conditional Content</h3>
            <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm">
                {selectedPeriod === 'day' && 'Mostrando datos de hoy'}
                {selectedPeriod === 'week' && 'Mostrando datos de esta semana'}
                {selectedPeriod === 'month' && 'Mostrando datos de este mes'}
                {selectedPeriod === 'year' && 'Mostrando datos de este año'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example with data fetching */}
      <Card>
        <CardHeader>
          <CardTitle>Integration with Data Fetching</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
            {`// Example in a dashboard page
'use client';

import { useState } from 'react';
import { PeriodSelector, PeriodValue } from '@/components/dashboard';
import { useQuery } from '@tanstack/react-query';

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodValue>('day');

  // Fetch data based on selected period
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', period],
    queryFn: () => fetchMetrics(period),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Your KPI cards, charts, etc. */}
    </div>
  );
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

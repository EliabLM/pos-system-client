'use client';

import { useState } from 'react';
import { DashboardHeader } from './dashboard-header';

/**
 * Example usage of the DashboardHeader component
 *
 * This example demonstrates:
 * - Manual refresh functionality
 * - Last updated timestamp tracking
 * - Store selector (auto-managed)
 * - Responsive layout
 */
export default function DashboardHeaderExample() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate a data refresh operation
  const handleRefresh = async () => {
    setIsRefreshing(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update the last updated timestamp
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  return (
    <div className="p-6">
      {/* Dashboard Header */}
      <DashboardHeader
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
        showStoreSelector={true} // Optional: defaults to true
      />

      {/* Dashboard Content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">KPI Card 1</h3>
          <p className="text-2xl font-bold">$1,234</p>
          {isRefreshing && <p className="text-sm text-muted-foreground">Actualizando...</p>}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">KPI Card 2</h3>
          <p className="text-2xl font-bold">567</p>
          {isRefreshing && <p className="text-sm text-muted-foreground">Actualizando...</p>}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">KPI Card 3</h3>
          <p className="text-2xl font-bold">89%</p>
          {isRefreshing && <p className="text-sm text-muted-foreground">Actualizando...</p>}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">KPI Card 4</h3>
          <p className="text-2xl font-bold">+12%</p>
          {isRefreshing && <p className="text-sm text-muted-foreground">Actualizando...</p>}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 rounded-lg border bg-muted/50 p-6">
        <h2 className="text-lg font-semibold mb-4">How to Use</h2>

        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Basic Usage:</h3>
            <pre className="bg-background p-3 rounded-md overflow-x-auto">
{`import { DashboardHeader } from '@/components/dashboard/dashboard-header';

function Dashboard() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleRefresh = async () => {
    // Refresh your data here
    setLastUpdated(new Date());
  };

  return (
    <DashboardHeader
      onRefresh={handleRefresh}
      lastUpdated={lastUpdated}
    />
  );
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-2">Props:</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><code className="text-xs bg-background px-1 py-0.5 rounded">onRefresh</code>: Optional callback function triggered when refresh button is clicked</li>
              <li><code className="text-xs bg-background px-1 py-0.5 rounded">lastUpdated</code>: Optional Date object to show when data was last refreshed</li>
              <li><code className="text-xs bg-background px-1 py-0.5 rounded">showStoreSelector</code>: Optional boolean to control store selector visibility (defaults to true)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Features:</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Automatic store selection when user has only one store</li>
              <li>Store selector appears only when user has access to multiple stores</li>
              <li>Refresh button shows loading state with spinning animation</li>
              <li>Last updated timestamp updates automatically every minute</li>
              <li>Fully responsive with mobile-optimized layout</li>
              <li>Quick actions for New Sale and View Reports</li>
              <li>Keyboard accessible with proper ARIA labels</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Responsive Behavior:</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Mobile:</strong> Stacked layout, shortened button labels</li>
              <li><strong>Tablet:</strong> Flexible wrapping of elements</li>
              <li><strong>Desktop:</strong> Horizontal layout with full labels</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Integration with Zustand Store:</h3>
            <p className="mb-2">The component automatically reads:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Current user from <code className="text-xs bg-background px-1 py-0.5 rounded">useStore()</code></li>
              <li>User's organization ID and store ID</li>
              <li>Active stores using <code className="text-xs bg-background px-1 py-0.5 rounded">useActiveStores()</code> hook</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

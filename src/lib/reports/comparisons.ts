/**
 * Report Comparisons Utility
 *
 * Period comparison functions for analyzing changes over time.
 *
 * STRICT TYPING: Zero `any` types
 */

import type {
  ComparisonResult,
  ChangeData,
  ComparisonSummary,
} from '@/interfaces/reports';

/**
 * Compare two periods of data
 *
 * @param current - Current period data
 * @param previous - Previous period data
 * @param metrics - Array of metric field names to compare
 * @returns Comparison result with change data
 */
export function comparePeriods<T extends Record<string, unknown>>(
  current: T[],
  previous: T[],
  metrics: (keyof T)[]
): ComparisonResult<T> {
  const changes: ChangeData[] = [];

  metrics.forEach((metric) => {
    const currentValue = sumMetric(current, metric);
    const previousValue = sumMetric(previous, metric);
    const change = currentValue - previousValue;
    const changePercentage =
      previousValue > 0 ? (change / previousValue) * 100 : 0;

    changes.push({
      metric: String(metric),
      currentValue,
      previousValue,
      change,
      changePercentage: Number(changePercentage.toFixed(2)),
      isPositive: change >= 0,
    });
  });

  const summary = generateComparisonSummary(changes);

  return {
    current,
    previous,
    changes,
    summary,
  };
}

/**
 * Sum a metric across an array of data
 *
 * @param data - Array of data objects
 * @param metric - Metric field name
 * @returns Sum of the metric
 */
function sumMetric<T extends Record<string, unknown>>(
  data: T[],
  metric: keyof T
): number {
  const sum = data.reduce((acc, item) => {
    const value = Number(item[metric]);
    return acc + (isNaN(value) ? 0 : value);
  }, 0);

  return Number(sum.toFixed(2));
}

/**
 * Generate comparison summary from change data
 *
 * @param changes - Array of change data
 * @returns Comparison summary
 */
function generateComparisonSummary(changes: ChangeData[]): ComparisonSummary {
  const positiveChanges = changes.filter((c) => c.isPositive).length;
  const negativeChanges = changes.filter((c) => !c.isPositive).length;

  let overallTrend: 'up' | 'down' | 'stable' = 'stable';

  if (positiveChanges > negativeChanges) {
    overallTrend = 'up';
  } else if (negativeChanges > positiveChanges) {
    overallTrend = 'down';
  }

  return {
    totalChanges: changes.length,
    positiveChanges,
    negativeChanges,
    overallTrend,
  };
}

/**
 * Calculate change between two values
 *
 * @param current - Current value
 * @param previous - Previous value
 * @returns Change data
 */
export function calculateChange(
  current: number,
  previous: number,
  metric: string = 'value'
): ChangeData {
  const change = current - previous;
  const changePercentage =
    previous > 0 ? (change / previous) * 100 : current > 0 ? 100 : 0;

  return {
    metric,
    currentValue: current,
    previousValue: previous,
    change,
    changePercentage: Number(changePercentage.toFixed(2)),
    isPositive: change >= 0,
  };
}

/**
 * Compare multiple metrics between two periods
 *
 * @param currentData - Current period summary data
 * @param previousData - Previous period summary data
 * @param metricKeys - Keys of metrics to compare
 * @returns Array of change data
 */
export function compareMetrics(
  currentData: Record<string, number>,
  previousData: Record<string, number>,
  metricKeys: string[]
): ChangeData[] {
  return metricKeys.map((key) => {
    const current = currentData[key] || 0;
    const previous = previousData[key] || 0;
    return calculateChange(current, previous, key);
  });
}

/**
 * Compare arrays of data by matching key
 *
 * @param current - Current period data
 * @param previous - Previous period data
 * @param matchKey - Key to match records by
 * @param valueKey - Key of value to compare
 * @returns Array of change data for matched records
 */
export function compareByKey<T extends Record<string, unknown>>(
  current: T[],
  previous: T[],
  matchKey: keyof T,
  valueKey: keyof T
): ChangeData[] {
  const changes: ChangeData[] = [];

  // Create maps for quick lookup
  const currentMap = new Map<string, number>();
  const previousMap = new Map<string, number>();

  current.forEach((item) => {
    const key = String(item[matchKey]);
    const value = Number(item[valueKey]) || 0;
    currentMap.set(key, value);
  });

  previous.forEach((item) => {
    const key = String(item[matchKey]);
    const value = Number(item[valueKey]) || 0;
    previousMap.set(key, value);
  });

  // Get all unique keys
  const allKeys = new Set([...currentMap.keys(), ...previousMap.keys()]);

  allKeys.forEach((key) => {
    const currentValue = currentMap.get(key) || 0;
    const previousValue = previousMap.get(key) || 0;

    changes.push(calculateChange(currentValue, previousValue, key));
  });

  return changes;
}

/**
 * Get top changes (biggest increases)
 *
 * @param changes - Array of change data
 * @param n - Number of top changes to return
 * @returns Top N changes by absolute value
 */
export function getTopChanges(changes: ChangeData[], n: number): ChangeData[] {
  return [...changes]
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, n);
}

/**
 * Get biggest increases
 *
 * @param changes - Array of change data
 * @param n - Number of increases to return
 * @returns Top N increases
 */
export function getBiggestIncreases(
  changes: ChangeData[],
  n: number
): ChangeData[] {
  return [...changes]
    .filter((c) => c.isPositive)
    .sort((a, b) => b.change - a.change)
    .slice(0, n);
}

/**
 * Get biggest decreases
 *
 * @param changes - Array of change data
 * @param n - Number of decreases to return
 * @returns Top N decreases
 */
export function getBiggestDecreases(
  changes: ChangeData[],
  n: number
): ChangeData[] {
  return [...changes]
    .filter((c) => !c.isPositive)
    .sort((a, b) => a.change - b.change)
    .slice(0, n);
}

/**
 * Calculate period-over-period growth rate
 *
 * @param currentPeriod - Current period total
 * @param previousPeriod - Previous period total
 * @returns Growth rate percentage
 */
export function calculateGrowthRate(
  currentPeriod: number,
  previousPeriod: number
): number {
  if (previousPeriod === 0) {
    return currentPeriod > 0 ? 100 : 0;
  }

  const growthRate = ((currentPeriod - previousPeriod) / previousPeriod) * 100;
  return Number(growthRate.toFixed(2));
}

/**
 * Calculate year-over-year change
 *
 * @param currentYear - Current year value
 * @param previousYear - Previous year value
 * @returns Year-over-year change data
 */
export function calculateYoYChange(
  currentYear: number,
  previousYear: number
): ChangeData {
  return calculateChange(currentYear, previousYear, 'YoY');
}

/**
 * Calculate month-over-month change
 *
 * @param currentMonth - Current month value
 * @param previousMonth - Previous month value
 * @returns Month-over-month change data
 */
export function calculateMoMChange(
  currentMonth: number,
  previousMonth: number
): ChangeData {
  return calculateChange(currentMonth, previousMonth, 'MoM');
}

/**
 * Calculate quarter-over-quarter change
 *
 * @param currentQuarter - Current quarter value
 * @param previousQuarter - Previous quarter value
 * @returns Quarter-over-quarter change data
 */
export function calculateQoQChange(
  currentQuarter: number,
  previousQuarter: number
): ChangeData {
  return calculateChange(currentQuarter, previousQuarter, 'QoQ');
}

/**
 * Compare cumulative totals
 *
 * @param current - Current period cumulative values
 * @param previous - Previous period cumulative values
 * @returns Array of change data for each period
 */
export function compareCumulativeTotals(
  current: number[],
  previous: number[]
): ChangeData[] {
  const maxLength = Math.max(current.length, previous.length);
  const changes: ChangeData[] = [];

  for (let i = 0; i < maxLength; i++) {
    const currentValue = current[i] || 0;
    const previousValue = previous[i] || 0;

    changes.push(
      calculateChange(currentValue, previousValue, `Period ${i + 1}`)
    );
  }

  return changes;
}

/**
 * Calculate variance from baseline
 *
 * @param actual - Actual values
 * @param baseline - Baseline/expected values
 * @returns Array of variance change data
 */
export function calculateVariance(
  actual: number[],
  baseline: number[]
): ChangeData[] {
  const maxLength = Math.max(actual.length, baseline.length);
  const variances: ChangeData[] = [];

  for (let i = 0; i < maxLength; i++) {
    const actualValue = actual[i] || 0;
    const baselineValue = baseline[i] || 0;

    variances.push(
      calculateChange(actualValue, baselineValue, `Variance ${i + 1}`)
    );
  }

  return variances;
}

/**
 * Format change data for display
 *
 * @param change - Change data
 * @returns Formatted string with sign and percentage
 */
export function formatChange(change: ChangeData): string {
  const sign = change.isPositive ? '+' : '';
  return `${sign}${change.changePercentage.toFixed(1)}%`;
}

/**
 * Get change trend indicator
 *
 * @param change - Change data
 * @returns Trend indicator ('up', 'down', 'stable')
 */
export function getChangeTrend(
  change: ChangeData
): 'up' | 'down' | 'stable' {
  if (Math.abs(change.changePercentage) < 1) {
    return 'stable';
  }
  return change.isPositive ? 'up' : 'down';
}

/**
 * Calculate average change across multiple metrics
 *
 * @param changes - Array of change data
 * @returns Average change percentage
 */
export function calculateAverageChange(changes: ChangeData[]): number {
  if (changes.length === 0) return 0;

  const sum = changes.reduce((acc, change) => acc + change.changePercentage, 0);
  const average = sum / changes.length;

  return Number(average.toFixed(2));
}

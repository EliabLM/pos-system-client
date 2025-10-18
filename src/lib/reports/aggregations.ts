/**
 * Report Aggregations Utility
 *
 * Data aggregation functions for grouping and summarizing report data.
 *
 * STRICT TYPING: Zero `any` types
 */

import type {
  ReportPeriod,
  AggregationResult,
  GroupByResult,
  SummaryConfig,
} from '@/interfaces/reports';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Aggregate data by time period
 *
 * @param data - Array of data objects with date field
 * @param period - Time period for aggregation
 * @param dateField - Name of the date field in data objects
 * @returns Array of aggregation results grouped by period
 */
export function aggregateByPeriod<T extends Record<string, unknown>>(
  data: T[],
  period: ReportPeriod,
  dateField: keyof T = 'date' as keyof T
): AggregationResult<T>[] {
  if (data.length === 0) return [];

  // Group data by period
  const grouped = new Map<string, T[]>();

  data.forEach((item) => {
    const dateValue = item[dateField];
    if (!dateValue) return;

    const date =
      dateValue instanceof Date ? dateValue : new Date(String(dateValue));
    if (isNaN(date.getTime())) return;

    const periodKey = getPeriodKey(date, period);
    const existing = grouped.get(periodKey) || [];
    grouped.set(periodKey, [...existing, item]);
  });

  // Convert to aggregation results
  const results: AggregationResult<T>[] = [];

  grouped.forEach((items, periodKey) => {
    results.push({
      period: periodKey,
      data: items,
      count: items.length,
    });
  });

  // Sort by period
  results.sort((a, b) => a.period.localeCompare(b.period));

  return results;
}

/**
 * Get period key for a date based on period type
 *
 * @param date - Date to convert
 * @param period - Period type
 * @returns Period key string
 */
function getPeriodKey(date: Date, period: ReportPeriod): string {
  switch (period) {
    case 'day':
      return format(startOfDay(date), 'yyyy-MM-dd', { locale: es });
    case 'week':
      return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd', {
        locale: es,
      });
    case 'month':
      return format(startOfMonth(date), 'yyyy-MM', { locale: es });
    case 'year':
      return format(startOfYear(date), 'yyyy', { locale: es });
    default:
      return format(date, 'yyyy-MM-dd', { locale: es });
  }
}

/**
 * Group data by a specific field
 *
 * @param data - Array of data objects
 * @param key - Field name to group by
 * @returns Array of grouped results
 */
export function groupBy<T extends Record<string, unknown>>(
  data: T[],
  key: keyof T
): GroupByResult<T>[] {
  if (data.length === 0) return [];

  const grouped = new Map<string, T[]>();

  data.forEach((item) => {
    const groupKey = String(item[key] ?? 'undefined');
    const existing = grouped.get(groupKey) || [];
    grouped.set(groupKey, [...existing, item]);
  });

  const results: GroupByResult<T>[] = [];

  grouped.forEach((items, groupKey) => {
    results.push({
      key: groupKey,
      items,
      count: items.length,
    });
  });

  // Sort by count descending
  results.sort((a, b) => b.count - a.count);

  return results;
}

/**
 * Summarize data with aggregation functions
 *
 * @param data - Array of data objects
 * @param fields - Array of field names to summarize
 * @returns Object with sum/average/min/max for each field
 */
export function summarize<T extends Record<string, unknown>>(
  data: T[],
  fields: (keyof T)[]
): Record<string, number> {
  if (data.length === 0) return {};

  const summary: Record<string, number> = {};

  fields.forEach((field) => {
    const values = data
      .map((item) => Number(item[field]))
      .filter((val) => !isNaN(val));

    if (values.length > 0) {
      const sum = values.reduce((acc, val) => acc + val, 0);
      summary[`${String(field)}_sum`] = Number(sum.toFixed(2));
      summary[`${String(field)}_average`] = Number(
        (sum / values.length).toFixed(2)
      );
      summary[`${String(field)}_min`] = Math.min(...values);
      summary[`${String(field)}_max`] = Math.max(...values);
    }
  });

  return summary;
}

/**
 * Advanced summary with custom aggregation configs
 *
 * @param data - Array of data objects
 * @param configs - Array of summary configurations
 * @returns Object with aggregated values
 */
export function summarizeWithConfig<T extends Record<string, unknown>>(
  data: T[],
  configs: SummaryConfig[]
): Record<string, number> {
  if (data.length === 0) return {};

  const summary: Record<string, number> = {};

  configs.forEach((config) => {
    const { field, aggregationType } = config;
    const values = data
      .map((item) => Number(item[field]))
      .filter((val) => !isNaN(val));

    if (values.length === 0) {
      summary[`${field}_${aggregationType}`] = 0;
      return;
    }

    let result = 0;

    switch (aggregationType) {
      case 'sum':
        result = values.reduce((acc, val) => acc + val, 0);
        break;
      case 'average':
        result = values.reduce((acc, val) => acc + val, 0) / values.length;
        break;
      case 'min':
        result = Math.min(...values);
        break;
      case 'max':
        result = Math.max(...values);
        break;
      case 'count':
        result = values.length;
        break;
    }

    summary[`${field}_${aggregationType}`] = Number(result.toFixed(2));
  });

  return summary;
}

/**
 * Count occurrences of values in a field
 *
 * @param data - Array of data objects
 * @param field - Field name to count
 * @returns Object with value counts
 */
export function countOccurrences<T extends Record<string, unknown>>(
  data: T[],
  field: keyof T
): Record<string, number> {
  const counts: Record<string, number> = {};

  data.forEach((item) => {
    const value = String(item[field] ?? 'undefined');
    counts[value] = (counts[value] || 0) + 1;
  });

  return counts;
}

/**
 * Calculate cumulative sum over time
 *
 * @param data - Array of data objects with numeric value
 * @param valueField - Name of the numeric field
 * @returns Array with cumulative sums
 */
export function calculateCumulativeSum<T extends Record<string, unknown>>(
  data: T[],
  valueField: keyof T
): number[] {
  const cumulativeSums: number[] = [];
  let runningTotal = 0;

  data.forEach((item) => {
    const value = Number(item[valueField]);
    if (!isNaN(value)) {
      runningTotal += value;
      cumulativeSums.push(Number(runningTotal.toFixed(2)));
    }
  });

  return cumulativeSums;
}

/**
 * Pivot data by two dimensions
 *
 * @param data - Array of data objects
 * @param rowField - Field for rows
 * @param columnField - Field for columns
 * @param valueField - Field for values
 * @param aggregation - Aggregation function ('sum' or 'count')
 * @returns Pivoted data structure
 */
export function pivot<T extends Record<string, unknown>>(
  data: T[],
  rowField: keyof T,
  columnField: keyof T,
  valueField: keyof T,
  aggregation: 'sum' | 'count' = 'sum'
): Record<string, Record<string, number>> {
  const pivoted: Record<string, Record<string, number>> = {};

  data.forEach((item) => {
    const rowKey = String(item[rowField] ?? 'undefined');
    const colKey = String(item[columnField] ?? 'undefined');
    const value = Number(item[valueField]);

    if (!pivoted[rowKey]) {
      pivoted[rowKey] = {};
    }

    if (aggregation === 'sum') {
      pivoted[rowKey][colKey] = (pivoted[rowKey][colKey] || 0) + value;
    } else {
      pivoted[rowKey][colKey] = (pivoted[rowKey][colKey] || 0) + 1;
    }
  });

  return pivoted;
}

/**
 * Get top N items by a numeric field
 *
 * @param data - Array of data objects
 * @param field - Field to sort by
 * @param n - Number of top items to return
 * @returns Top N items
 */
export function getTopN<T extends Record<string, unknown>>(
  data: T[],
  field: keyof T,
  n: number
): T[] {
  return [...data]
    .sort((a, b) => {
      const aVal = Number(a[field]);
      const bVal = Number(b[field]);
      return bVal - aVal;
    })
    .slice(0, n);
}

/**
 * Get bottom N items by a numeric field
 *
 * @param data - Array of data objects
 * @param field - Field to sort by
 * @param n - Number of bottom items to return
 * @returns Bottom N items
 */
export function getBottomN<T extends Record<string, unknown>>(
  data: T[],
  field: keyof T,
  n: number
): T[] {
  return [...data]
    .sort((a, b) => {
      const aVal = Number(a[field]);
      const bVal = Number(b[field]);
      return aVal - bVal;
    })
    .slice(0, n);
}

/**
 * Calculate percentage distribution
 *
 * @param data - Array of data objects
 * @param field - Field to calculate percentages for
 * @returns Array with original data plus percentage field
 */
export function calculatePercentageDistribution<
  T extends Record<string, unknown>
>(
  data: T[],
  field: keyof T
): Array<T & { percentage: number }> {
  const total = data.reduce(
    (sum, item) => sum + (Number(item[field]) || 0),
    0
  );

  if (total === 0) {
    return data.map((item) => ({ ...item, percentage: 0 }));
  }

  return data.map((item) => {
    const value = Number(item[field]) || 0;
    const percentage = Number(((value / total) * 100).toFixed(2));
    return { ...item, percentage };
  });
}

/**
 * Filter data by date range
 *
 * @param data - Array of data objects
 * @param dateField - Name of the date field
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Filtered data
 */
export function filterByDateRange<T extends Record<string, unknown>>(
  data: T[],
  dateField: keyof T,
  startDate: Date,
  endDate: Date
): T[] {
  return data.filter((item) => {
    const dateValue = item[dateField];
    if (!dateValue) return false;

    const date =
      dateValue instanceof Date ? dateValue : new Date(String(dateValue));
    if (isNaN(date.getTime())) return false;

    return date >= startDate && date <= endDate;
  });
}

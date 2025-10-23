/**
 * Report Calculations Utility
 *
 * Common calculation functions for reports (margins, growth rates, averages, etc.)
 *
 * STRICT TYPING: Zero `any` types
 */

import type { ProfitMargin, GrowthRate } from '@/interfaces/reports';

/**
 * Calculate profit margin
 *
 * @param revenue - Total revenue
 * @param cost - Total cost
 * @returns Profit margin calculation result
 */
export function calculateProfitMargin(
  revenue: number,
  cost: number
): ProfitMargin {
  const profit = revenue - cost;
  const marginPercentage = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    cost,
    profit,
    marginPercentage: Number(marginPercentage.toFixed(2)),
  };
}

/**
 * Calculate growth rate between two values
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Growth rate calculation result
 */
export function calculateGrowthRate(
  current: number,
  previous: number
): GrowthRate {
  const difference = current - previous;
  const growthPercentage =
    previous > 0 ? (difference / previous) * 100 : current > 0 ? 100 : 0;

  return {
    current,
    previous,
    difference,
    growthPercentage: Number(growthPercentage.toFixed(2)),
    isPositive: difference >= 0,
  };
}

/**
 * Calculate average of an array of numbers
 *
 * @param values - Array of numeric values
 * @returns Average value, or 0 if array is empty
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;

  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = sum / values.length;

  return Number(average.toFixed(2));
}

/**
 * Calculate percentage of a part relative to total
 *
 * @param part - Part value
 * @param total - Total value
 * @returns Percentage (0-100), or 0 if total is 0
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;

  const percentage = (part / total) * 100;
  return Number(percentage.toFixed(2));
}

/**
 * Calculate sum of an array of numbers
 *
 * @param values - Array of numeric values
 * @returns Sum of all values
 */
export function calculateSum(values: number[]): number {
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Number(sum.toFixed(2));
}

/**
 * Calculate median of an array of numbers
 *
 * @param values - Array of numeric values
 * @returns Median value, or 0 if array is empty
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    const median = (sorted[middle - 1] + sorted[middle]) / 2;
    return Number(median.toFixed(2));
  }

  return Number(sorted[middle].toFixed(2));
}

/**
 * Calculate minimum value in an array
 *
 * @param values - Array of numeric values
 * @returns Minimum value, or 0 if array is empty
 */
export function calculateMin(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

/**
 * Calculate maximum value in an array
 *
 * @param values - Array of numeric values
 * @returns Maximum value, or 0 if array is empty
 */
export function calculateMax(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

/**
 * Calculate standard deviation of an array of numbers
 *
 * @param values - Array of numeric values
 * @returns Standard deviation, or 0 if array is empty
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const avg = calculateAverage(values);
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = calculateAverage(squareDiffs);
  const stdDev = Math.sqrt(avgSquareDiff);

  return Number(stdDev.toFixed(2));
}

/**
 * Calculate compound annual growth rate (CAGR)
 *
 * @param beginningValue - Starting value
 * @param endingValue - Ending value
 * @param numberOfPeriods - Number of periods (years)
 * @returns CAGR percentage
 */
export function calculateCAGR(
  beginningValue: number,
  endingValue: number,
  numberOfPeriods: number
): number {
  if (beginningValue <= 0 || numberOfPeriods <= 0) return 0;

  const cagr =
    (Math.pow(endingValue / beginningValue, 1 / numberOfPeriods) - 1) * 100;
  return Number(cagr.toFixed(2));
}

/**
 * Calculate return on investment (ROI)
 *
 * @param gain - Gain from investment
 * @param cost - Cost of investment
 * @returns ROI percentage
 */
export function calculateROI(gain: number, cost: number): number {
  if (cost === 0) return 0;

  const roi = ((gain - cost) / cost) * 100;
  return Number(roi.toFixed(2));
}

/**
 * Calculate gross margin percentage
 *
 * @param revenue - Total revenue
 * @param costOfGoodsSold - Total cost of goods sold
 * @returns Gross margin percentage
 */
export function calculateGrossMargin(
  revenue: number,
  costOfGoodsSold: number
): number {
  if (revenue === 0) return 0;

  const grossMargin = ((revenue - costOfGoodsSold) / revenue) * 100;
  return Number(grossMargin.toFixed(2));
}

/**
 * Calculate net margin percentage
 *
 * @param netProfit - Net profit
 * @param revenue - Total revenue
 * @returns Net margin percentage
 */
export function calculateNetMargin(netProfit: number, revenue: number): number {
  if (revenue === 0) return 0;

  const netMargin = (netProfit / revenue) * 100;
  return Number(netMargin.toFixed(2));
}

/**
 * Calculate moving average
 *
 * @param values - Array of numeric values
 * @param windowSize - Size of the moving window
 * @returns Array of moving averages
 */
export function calculateMovingAverage(
  values: number[],
  windowSize: number
): number[] {
  if (values.length < windowSize || windowSize <= 0) return [];

  const movingAverages: number[] = [];

  for (let i = 0; i <= values.length - windowSize; i++) {
    const window = values.slice(i, i + windowSize);
    const avg = calculateAverage(window);
    movingAverages.push(avg);
  }

  return movingAverages;
}

/**
 * Calculate variance
 *
 * @param values - Array of numeric values
 * @returns Variance value
 */
export function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const avg = calculateAverage(values);
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const variance = calculateAverage(squareDiffs);

  return Number(variance.toFixed(2));
}

/**
 * Calculate percentile
 *
 * @param values - Array of numeric values
 * @param percentile - Percentile to calculate (0-100)
 * @returns Value at the specified percentile
 */
export function calculatePercentile(
  values: number[],
  percentile: number
): number {
  if (values.length === 0) return 0;
  if (percentile < 0 || percentile > 100) {
    throw new Error('Percentile must be between 0 and 100');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sorted[lower];
  }

  const result = sorted[lower] * (1 - weight) + sorted[upper] * weight;
  return Number(result.toFixed(2));
}

/**
 * Calculate weighted average
 *
 * @param values - Array of numeric values
 * @param weights - Array of weights corresponding to values
 * @returns Weighted average
 */
export function calculateWeightedAverage(
  values: number[],
  weights: number[]
): number {
  if (values.length !== weights.length || values.length === 0) return 0;

  const totalWeight = calculateSum(weights);
  if (totalWeight === 0) return 0;

  const weightedSum = values.reduce(
    (acc, val, idx) => acc + val * weights[idx],
    0
  );
  const weightedAvg = weightedSum / totalWeight;

  return Number(weightedAvg.toFixed(2));
}

/**
 * Round to specified decimal places
 *
 * @param value - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export function roundTo(value: number, decimals: number = 2): number {
  return Number(value.toFixed(decimals));
}

/**
 * Format number as currency (numeric only, no symbol)
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number
 */
export function formatCurrency(value: number, decimals: number = 2): number {
  return roundTo(value, decimals);
}

/**
 * Calculate rate per period
 *
 * @param total - Total value
 * @param periods - Number of periods
 * @returns Rate per period
 */
export function calculateRatePerPeriod(
  total: number,
  periods: number
): number {
  if (periods === 0) return 0;
  const rate = total / periods;
  return roundTo(rate, 2);
}

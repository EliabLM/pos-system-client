/**
 * Excel Generator Utility
 *
 * Generates Excel files from data arrays using SheetJS (xlsx).
 * Client-side only - uses dynamic imports for browser compatibility.
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import type {
  ExcelGeneratorOptions,
  ExcelSheetConfig,
} from '@/interfaces/reports';

/**
 * Generate an Excel file from an array of data
 *
 * @param data - Array of objects to export
 * @param options - Excel generation options
 * @throws Error if generation fails
 */
export async function generateExcel<
  T extends Record<string, string | number | boolean | null>
>(data: T[], options: ExcelGeneratorOptions): Promise<void> {
  const {
    filename,
    sheetName = 'Datos',
    includeHeaders = true,
    autoWidth = true,
    includeDate = true,
  } = options;

  try {
    // Dynamic import for client-side only library
    const { utils, writeFile } = await import('xlsx');

    if (data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    // Add metadata row if includeDate is true
    let worksheetData: Array<
      Record<string, string | number | boolean | null>
    > = [];

    if (includeDate) {
      const currentDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Add empty row and date row
      const dateRow: Record<string, string | number | boolean | null> = {};
      const keys = Object.keys(data[0]);
      if (keys.length > 0) {
        dateRow[keys[0]] = `Generado: ${currentDate}`;
      }
      worksheetData = [{}, dateRow, {}];
    }

    // Add data
    worksheetData = [...worksheetData, ...data];

    // Create worksheet
    const worksheet = utils.json_to_sheet(worksheetData, {
      skipHeader: !includeHeaders,
    });

    // Auto-size columns
    if (autoWidth && data.length > 0) {
      const columnWidths = calculateColumnWidths(data);
      worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }));
    }

    // Create workbook
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, sheetName);

    // Save file
    writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw new Error(
      error instanceof Error
        ? `Error al generar Excel: ${error.message}`
        : 'Error desconocido al generar Excel'
    );
  }
}

/**
 * Generate an Excel file with multiple sheets
 *
 * @param sheets - Array of sheet configurations
 * @param filename - Output filename (without extension)
 * @param includeDate - Whether to include generation date
 */
export async function generateMultiSheetExcel(
  sheets: ExcelSheetConfig[],
  filename: string,
  includeDate: boolean = true
): Promise<void> {
  try {
    const { utils, writeFile } = await import('xlsx');

    if (sheets.length === 0) {
      throw new Error('No hay hojas para exportar');
    }

    const workbook = utils.book_new();

    sheets.forEach((sheetConfig) => {
      const { name, data, headers } = sheetConfig;

      if (data.length === 0) {
        console.warn(`La hoja "${name}" no tiene datos`);
        return;
      }

      // Add metadata row if includeDate is true
      let worksheetData: Array<
        Record<string, string | number | boolean | null>
      > = [];

      if (includeDate) {
        const currentDate = new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const dateRow: Record<string, string | number | boolean | null> = {};
        const keys = Object.keys(data[0]);
        if (keys.length > 0) {
          dateRow[keys[0]] = `Generado: ${currentDate}`;
        }
        worksheetData = [{}, dateRow, {}];
      }

      worksheetData = [...worksheetData, ...data];

      const worksheet = utils.json_to_sheet(worksheetData, {
        header: headers,
      });

      // Auto-size columns
      const columnWidths = calculateColumnWidths(data);
      worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }));

      utils.book_append_sheet(workbook, worksheet, name);
    });

    writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error generating multi-sheet Excel:', error);
    throw new Error(
      error instanceof Error
        ? `Error al generar Excel: ${error.message}`
        : 'Error desconocido al generar Excel'
    );
  }
}

/**
 * Calculate optimal column widths based on data content
 *
 * @param data - Array of data objects
 * @returns Array of column widths
 */
function calculateColumnWidths<
  T extends Record<string, string | number | boolean | null>
>(data: T[]): number[] {
  if (data.length === 0) return [];

  const keys = Object.keys(data[0]);
  const widths: number[] = [];

  keys.forEach((key) => {
    // Start with header width
    let maxWidth = key.length;

    // Check each row for this column
    data.forEach((row) => {
      const value = row[key];
      const valueStr = value !== null ? String(value) : '';
      maxWidth = Math.max(maxWidth, valueStr.length);
    });

    // Add padding and set max width
    widths.push(Math.min(maxWidth + 2, 50));
  });

  return widths;
}

/**
 * Convert table data to Excel-friendly format
 *
 * @param tableData - Array of objects with mixed types
 * @returns Array of objects with Excel-safe values
 */
export function prepareDataForExcel<T extends Record<string, unknown>>(
  tableData: T[]
): Array<Record<string, string | number | boolean | null>> {
  return tableData.map((row) => {
    const excelRow: Record<string, string | number | boolean | null> = {};

    Object.entries(row).forEach(([key, value]) => {
      // Handle different value types
      if (value === null || value === undefined) {
        excelRow[key] = null;
      } else if (typeof value === 'boolean') {
        excelRow[key] = value;
      } else if (typeof value === 'number') {
        excelRow[key] = value;
      } else if (typeof value === 'string') {
        excelRow[key] = value;
      } else if (value instanceof Date) {
        excelRow[key] = value.toLocaleDateString('es-ES');
      } else if (typeof value === 'object') {
        // Stringify objects
        excelRow[key] = JSON.stringify(value);
      } else {
        // Fallback to string conversion
        excelRow[key] = String(value);
      }
    });

    return excelRow;
  });
}

/**
 * Check if Excel generation is supported in the current environment
 *
 * @returns true if Excel generation is supported
 */
export function isExcelSupported(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Format numbers for Excel export (ensure proper number type)
 *
 * @param value - Value to format
 * @param decimals - Number of decimal places
 * @returns Formatted number or null
 */
export function formatNumberForExcel(
  value: unknown,
  decimals: number = 2
): number | null {
  if (value === null || value === undefined) return null;

  const num = Number(value);
  if (isNaN(num)) return null;

  return Number(num.toFixed(decimals));
}

/**
 * Format currency for Excel export
 *
 * @param value - Value to format
 * @returns Formatted number or null
 */
export function formatCurrencyForExcel(value: unknown): number | null {
  return formatNumberForExcel(value, 2);
}

/**
 * Format date for Excel export
 *
 * @param date - Date to format
 * @param includeTime - Whether to include time
 * @returns Formatted date string
 */
export function formatDateForExcel(
  date: unknown,
  includeTime: boolean = false
): string | null {
  if (!date) return null;

  try {
    const dateObj = date instanceof Date ? date : new Date(String(date));

    if (isNaN(dateObj.getTime())) return null;

    if (includeTime) {
      return dateObj.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return null;
  }
}

/**
 * useExport Hook
 *
 * Custom hooks for exporting reports to PDF and Excel.
 * Handles loading states, error handling, and user feedback.
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { generatePDF } from '@/lib/export/pdf-generator';
import { generateExcel } from '@/lib/export/excel-generator';
import type {
  PDFGeneratorOptions,
  ExcelGeneratorOptions,
} from '@/interfaces/reports';

/**
 * Hook for exporting to PDF
 *
 * @returns Object with exportToPDF function and isExporting state
 */
export function useExportToPDF(): {
  exportToPDF: (options: PDFGeneratorOptions) => Promise<void>;
  isExporting: boolean;
} {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const exportToPDF = useCallback(
    async (options: PDFGeneratorOptions): Promise<void> => {
      setIsExporting(true);

      try {
        await generatePDF(options);
        toast.success('PDF generado exitosamente');
      } catch (error) {
        console.error('Error exporting to PDF:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Error al generar el archivo PDF'
        );
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return { exportToPDF, isExporting };
}

/**
 * Hook for exporting to Excel
 *
 * @returns Object with exportToExcel function and isExporting state
 */
export function useExportToExcel<
  T extends Record<string, string | number | boolean | null>
>(): {
  exportToExcel: (data: T[], options: ExcelGeneratorOptions) => Promise<void>;
  isExporting: boolean;
} {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const exportToExcel = useCallback(
    async (data: T[], options: ExcelGeneratorOptions): Promise<void> => {
      setIsExporting(true);

      try {
        await generateExcel(data, options);
        toast.success('Archivo Excel generado exitosamente');
      } catch (error) {
        console.error('Error exporting to Excel:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Error al generar el archivo Excel'
        );
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return { exportToExcel, isExporting };
}

/**
 * Combined hook for both PDF and Excel export
 *
 * @returns Object with both export functions and combined loading state
 */
export function useExport<
  T extends Record<string, string | number | boolean | null>
>(): {
  exportToPDF: (options: PDFGeneratorOptions) => Promise<void>;
  exportToExcel: (data: T[], options: ExcelGeneratorOptions) => Promise<void>;
  isExporting: boolean;
} {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const exportToPDF = useCallback(
    async (options: PDFGeneratorOptions): Promise<void> => {
      setIsExporting(true);

      try {
        await generatePDF(options);
        toast.success('PDF generado exitosamente');
      } catch (error) {
        console.error('Error exporting to PDF:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Error al generar el archivo PDF'
        );
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  const exportToExcel = useCallback(
    async (data: T[], options: ExcelGeneratorOptions): Promise<void> => {
      setIsExporting(true);

      try {
        await generateExcel(data, options);
        toast.success('Archivo Excel generado exitosamente');
      } catch (error) {
        console.error('Error exporting to Excel:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Error al generar el archivo Excel'
        );
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return { exportToPDF, exportToExcel, isExporting };
}

/**
 * Hook for exporting with progress tracking
 *
 * @returns Object with export functions, progress state, and progress message
 */
export function useExportWithProgress(): {
  exportToPDF: (options: PDFGeneratorOptions) => Promise<void>;
  isExporting: boolean;
  progress: number;
  progressMessage: string;
} {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');

  const exportToPDF = useCallback(
    async (options: PDFGeneratorOptions): Promise<void> => {
      setIsExporting(true);
      setProgress(0);
      setProgressMessage('Iniciando exportación...');

      try {
        setProgress(25);
        setProgressMessage('Preparando documento...');

        await generatePDF(options);

        setProgress(75);
        setProgressMessage('Generando PDF...');

        // Small delay for UX
        await new Promise((resolve) => setTimeout(resolve, 300));

        setProgress(100);
        setProgressMessage('Completado');

        toast.success('PDF generado exitosamente');
      } catch (error) {
        console.error('Error exporting to PDF:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Error al generar el archivo PDF'
        );
        throw error;
      } finally {
        setIsExporting(false);
        setProgress(0);
        setProgressMessage('');
      }
    },
    []
  );

  return { exportToPDF, isExporting, progress, progressMessage };
}

/**
 * Hook for batch export (multiple formats at once)
 *
 * @returns Object with batchExport function and loading state
 */
export function useBatchExport<
  T extends Record<string, string | number | boolean | null>
>(): {
  batchExport: (
    pdfOptions: PDFGeneratorOptions,
    excelData: T[],
    excelOptions: ExcelGeneratorOptions
  ) => Promise<void>;
  isExporting: boolean;
} {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const batchExport = useCallback(
    async (
      pdfOptions: PDFGeneratorOptions,
      excelData: T[],
      excelOptions: ExcelGeneratorOptions
    ): Promise<void> => {
      setIsExporting(true);

      try {
        // Export both formats in parallel
        await Promise.all([
          generatePDF(pdfOptions),
          generateExcel(excelData, excelOptions),
        ]);

        toast.success('Archivos generados exitosamente (PDF y Excel)');
      } catch (error) {
        console.error('Error in batch export:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Error al generar los archivos'
        );
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return { batchExport, isExporting };
}

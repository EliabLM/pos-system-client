/**
 * Report Header Component
 *
 * Reusable header for all reports with title, description, and export buttons.
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React from 'react';
import { IconFileTypePdf, IconFileTypeXls } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportHeaderProps } from '@/interfaces/reports';

export function ReportHeader({
  title,
  description,
  onExportPDF,
  onExportExcel,
  isExporting = false,
  showExport = true,
  children,
  className = '',
}: ReportHeaderProps): React.ReactElement {
  return (
    <div
      className={`flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between ${className}`}
    >
      <div className="flex-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {showExport && (
        <div className="flex items-center gap-2">
          {children}

          {onExportPDF && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPDF}
              disabled={isExporting}
              className="gap-2"
            >
              <IconFileTypePdf className="size-4" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          )}

          {onExportExcel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              disabled={isExporting}
              className="gap-2"
            >
              <IconFileTypeXls className="size-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
              <span className="sm:hidden">Excel</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Report Header Skeleton
 *
 * Loading state for ReportHeader component
 */
export function ReportHeaderSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

/**
 * Export Menu Component
 *
 * Dropdown menu with PDF and Excel export options.
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React from 'react';
import {
  IconFileTypePdf,
  IconFileTypeXls,
  IconDownload,
} from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { ExportMenuProps } from '@/interfaces/reports';

export function ExportMenu({
  onExportPDF,
  onExportExcel,
  isExporting,
  disabled = false,
  className = '',
}: ExportMenuProps): React.ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting}
          className={`gap-2 ${className}`}
        >
          <IconDownload className="size-4" />
          <span>Exportar</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Formato de exportación</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onExportPDF}
          disabled={isExporting}
          className="gap-2"
        >
          <IconFileTypePdf className="size-4" />
          <span>Exportar como PDF</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onExportExcel}
          disabled={isExporting}
          className="gap-2"
        >
          <IconFileTypeXls className="size-4" />
          <span>Exportar como Excel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

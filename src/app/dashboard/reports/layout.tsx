/**
 * Reports Layout
 *
 * Common layout for all reports pages with breadcrumb navigation.
 *
 * STRICT TYPING: Zero `any` types
 */

import React from 'react';
import Link from 'next/link';
import { IconChevronRight } from '@tabler/icons-react';

interface ReportsLayoutProps {
  children: React.ReactNode;
}

export default function ReportsLayout({
  children,
}: ReportsLayoutProps): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <IconChevronRight className="size-4" />
        <Link
          href="/dashboard/reports"
          className="hover:text-foreground transition-colors"
        >
          Reportes
        </Link>
      </nav>

      {/* Page Content */}
      <main>{children}</main>
    </div>
  );
}

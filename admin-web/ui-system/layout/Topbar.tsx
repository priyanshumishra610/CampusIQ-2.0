'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Topbar - Page header with title and actions
 * 
 * Provides consistent page header structure
 * Supports breadcrumbs and action buttons
 */
export function Topbar({ 
  title, 
  actions, 
  breadcrumbs,
  className,
  children 
}: TopbarProps) {
  return (
    <div className={cn(
      'sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-6',
      className
    )}>
      {breadcrumbs && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {breadcrumbs}
        </div>
      )}
      
      {title && (
        <h1 className="text-lg font-semibold text-gray-900">
          {title}
        </h1>
      )}
      
      {children}
      
      {actions && (
        <div className="ml-auto flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

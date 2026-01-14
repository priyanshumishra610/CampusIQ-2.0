'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  density?: 'comfortable' | 'compact';
  className?: string;
}

/**
 * AppShell - Root layout container
 * 
 * Provides the foundational structure for panel-based layouts
 * Supports dynamic theming and density modes
 */
export function AppShell({ 
  children, 
  sidebar, 
  topbar,
  density = 'comfortable',
  className 
}: AppShellProps) {
  return (
    <div 
      className={cn(
        'min-h-screen flex flex-col bg-gray-50',
        density === 'compact' && 'density-compact',
        className
      )}
    >
      {topbar && (
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
          {topbar}
        </header>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-gray-200">
            {sidebar}
          </aside>
        )}
        
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

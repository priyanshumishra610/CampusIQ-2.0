'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  disabled?: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Sidebar - Dynamic navigation sidebar
 * 
 * Supports panel-based navigation configuration
 * Automatically highlights active routes
 */
export function Sidebar({ items, header, footer, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn('flex flex-col h-full bg-white border-r border-gray-200', className)}>
      {header && (
        <div className="flex h-14 items-center px-4 border-b border-gray-200">
          {header}
        </div>
      )}
      
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const isDisabled = item.disabled;

          return (
            <Link
              key={item.id}
              href={isDisabled ? '#' : item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50',
                isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      
      {footer && (
        <div className="border-t border-gray-200 p-3">
          {footer}
        </div>
      )}
    </div>
  );
}

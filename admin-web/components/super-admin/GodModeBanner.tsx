'use client';

import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GodModeBannerProps {
  className?: string;
}

/**
 * GOD MODE Banner
 * 
 * Persistent indicator when Super Admin is active.
 * Warning tone (not scary, but serious).
 * Visible on all Super Admin pages.
 */
export function GodModeBanner({ className }: GodModeBannerProps) {
  return (
    <div
      className={cn(
        'bg-amber-50 border-b border-amber-200 px-4 py-2.5',
        'flex items-center justify-between',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-amber-700" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-900">
            Super Admin Mode
          </span>
          <span className="text-xs text-amber-700">
            Platform owner controls active
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span className="text-xs text-amber-700">
          All actions are logged
        </span>
      </div>
    </div>
  );
}

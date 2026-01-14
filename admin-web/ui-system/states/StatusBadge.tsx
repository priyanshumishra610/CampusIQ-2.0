'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusType = 'healthy' | 'at-risk' | 'blocked' | 'degraded' | 'info';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  className?: string;
}

/**
 * StatusBadge - Visual status indicator
 * 
 * Communicates state, risk, and health at a glance
 * Used throughout the system for status communication
 */
export function StatusBadge({ 
  status, 
  label, 
  className 
}: StatusBadgeProps) {
  // Detect theme mode from document
  const getMode = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  };

  const config = {
    healthy: {
      icon: CheckCircle2,
      semantic: 'success' as const,
      bgClass: 'bg-success-bg',
      textClass: 'text-green-700 dark:text-green-300',
      iconClass: 'text-green-600 dark:text-green-400',
    },
    'at-risk': {
      icon: AlertTriangle,
      semantic: 'warning' as const,
      bgClass: 'bg-warning-bg',
      textClass: 'text-yellow-700 dark:text-yellow-300',
      iconClass: 'text-yellow-600 dark:text-yellow-400',
    },
    blocked: {
      icon: XCircle,
      semantic: 'danger' as const,
      bgClass: 'bg-danger-bg',
      textClass: 'text-red-700 dark:text-red-300',
      iconClass: 'text-red-600 dark:text-red-400',
    },
    degraded: {
      icon: AlertCircle,
      semantic: 'warning' as const,
      bgClass: 'bg-warning-bg',
      textClass: 'text-yellow-700 dark:text-yellow-300',
      iconClass: 'text-yellow-600 dark:text-yellow-400',
    },
    info: {
      icon: Info,
      semantic: 'info' as const,
      bgClass: 'bg-info-bg',
      textClass: 'text-blue-700 dark:text-blue-300',
      iconClass: 'text-blue-600 dark:text-blue-400',
    },
  };

  const { icon: Icon, bgClass, textClass, iconClass } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        bgClass,
        textClass,
        className
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', iconClass)} />
      {label}
    </span>
  );
}

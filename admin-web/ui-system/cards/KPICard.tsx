'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../layout/Card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    period: string;
  };
  icon?: LucideIcon;
  status?: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
  className?: string;
}

/**
 * KPI Card - Key Performance Indicator card
 * 
 * Displays primary metric with trend indicator
 * Supports drilldown navigation
 */
export function KPICard({
  title,
  value,
  trend,
  icon: Icon,
  status = 'neutral',
  onClick,
  className,
}: KPICardProps) {
  const trendConfig = {
    positive: { icon: TrendingUp, color: 'text-green-600' },
    negative: { icon: TrendingDown, color: 'text-red-600' },
    neutral: { icon: Minus, color: 'text-muted-foreground' },
  };

  const TrendIcon = trendConfig[status].icon;

  return (
    <Card onClick={onClick} hover={!!onClick} className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-label text-muted-foreground mb-1">{title}</p>
          <p className="text-data-medium text-foreground mb-2">{value}</p>
          {trend && (
            <div className={cn('flex items-center gap-1 text-sm', trendConfig[status].color)}>
              <TrendIcon className="h-4 w-4" />
              <span>
                {Math.abs(trend.value)}% {trend.period}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-full bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}

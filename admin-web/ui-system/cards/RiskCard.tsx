'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '../layout/Card';
import { StatusBadge } from '../states/StatusBadge';
import { cn } from '@/lib/utils';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

interface RiskItem {
  id: string;
  label: string;
  severity: RiskSeverity;
  count?: number;
}

interface RiskCardProps {
  title: string;
  items: RiskItem[];
  cta?: {
    label: string;
    onClick: () => void;
  };
  onClick?: () => void;
  className?: string;
}

/**
 * Risk Card - At-risk items with severity indicators
 * 
 * Highlights items requiring attention
 * Supports drilldown to detailed view
 */
export function RiskCard({
  title,
  items,
  cta,
  onClick,
  className,
}: RiskCardProps) {
  const severityConfig: Record<RiskSeverity, { label: string; status: 'healthy' | 'at-risk' | 'blocked' }> = {
    low: { label: 'Low', status: 'healthy' },
    medium: { label: 'Medium', status: 'at-risk' },
    high: { label: 'High', status: 'at-risk' },
    critical: { label: 'Critical', status: 'blocked' },
  };

  return (
    <Card onClick={onClick} hover={!!onClick} className={className}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="text-label text-foreground">{title}</h3>
          </div>
          <span className="text-data-small text-foreground">{items.length}</span>
        </div>
        
        <div className="space-y-2">
          {items.slice(0, 3).map((item) => {
            const config = severityConfig[item.severity];
            return (
              <div key={item.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-foreground">{item.label}</span>
                <div className="flex items-center gap-2">
                  {item.count !== undefined && (
                    <span className="text-meta text-sm">{item.count}</span>
                  )}
                  <StatusBadge status={config.status} label={config.label} />
                </div>
              </div>
            );
          })}
          {items.length > 3 && (
            <p className="text-meta text-sm pt-2">
              +{items.length - 3} more items
            </p>
          )}
        </div>
        
        {cta && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              cta.onClick();
            }}
            className="w-full mt-4 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors"
          >
            {cta.label}
          </button>
        )}
      </div>
    </Card>
  );
}

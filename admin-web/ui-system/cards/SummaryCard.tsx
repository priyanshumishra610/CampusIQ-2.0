'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Card } from '../layout/Card';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  summary: React.ReactNode;
  details?: {
    label: string;
    value: string | number;
  }[];
  cta?: {
    label: string;
    onClick: () => void;
  };
  onClick?: () => void;
  className?: string;
}

/**
 * Summary Card - High-level overview with drilldown
 * 
 * Provides summary → drilldown pattern
 * Click to navigate to detailed view
 */
export function SummaryCard({
  title,
  summary,
  details,
  cta,
  onClick,
  className,
}: SummaryCardProps) {
  return (
    <Card onClick={onClick} hover={!!onClick} className={cn('relative', className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-label text-foreground">{title}</h3>
          {onClick && (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        
        <div className="text-data-medium text-foreground">
          {summary}
        </div>
        
        {details && details.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            {details.map((detail, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-meta text-sm">{detail.label}</span>
                <span className="text-sm font-medium text-foreground">{detail.value}</span>
              </div>
            ))}
          </div>
        )}
        
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

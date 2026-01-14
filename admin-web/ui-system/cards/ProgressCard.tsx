'use client';

import React from 'react';
import { Card } from '../layout/Card';
import { cn } from '@/lib/utils';

interface Milestone {
  label: string;
  completed: boolean;
}

interface ProgressCardProps {
  title: string;
  percentage: number;
  current: number;
  total: number;
  milestones?: Milestone[];
  pendingLabel?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Progress Card - Progress tracking with milestones
 * 
 * Shows completion percentage with milestone indicators
 * Highlights pending items
 */
export function ProgressCard({
  title,
  percentage,
  current,
  total,
  milestones,
  pendingLabel,
  onClick,
  className,
}: ProgressCardProps) {
  return (
    <Card onClick={onClick} hover={!!onClick} className={className}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-label text-foreground">{title}</h3>
          <span className="text-data-small text-foreground">
            {current} / {total}
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-meta text-right">{percentage.toFixed(0)}%</p>
        </div>
        
        {milestones && milestones.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    milestone.completed ? 'bg-primary' : 'bg-muted'
                  )}
                />
                <span className={cn(
                  'text-sm',
                  milestone.completed ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {milestone.label}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {pendingLabel && (
          <p className="text-meta text-sm">{pendingLabel}</p>
        )}
      </div>
    </Card>
  );
}

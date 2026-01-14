'use client';

import React from 'react';
import { format } from 'date-fns';
import { Card } from '../layout/Card';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  actor: string;
  action: string;
  timestamp: Date | string;
  reason?: string;
  metadata?: Record<string, any>;
}

interface TimelineCardProps {
  title: string;
  events: TimelineEvent[];
  maxItems?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Timeline Card - Activity feed with audit context
 * 
 * Shows who did what, when, and why
 * Audit-backed activity tracking
 */
export function TimelineCard({
  title,
  events,
  maxItems = 5,
  onClick,
  className,
}: TimelineCardProps) {
  const displayEvents = events.slice(0, maxItems);

  return (
    <Card onClick={onClick} hover={!!onClick} className={className}>
      <div className="space-y-4">
        <h3 className="text-label text-foreground">{title}</h3>
        
        <div className="space-y-3">
          {displayEvents.map((event, index) => {
            const timestamp = typeof event.timestamp === 'string' 
              ? new Date(event.timestamp) 
              : event.timestamp;
            
            return (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'h-2 w-2 rounded-full',
                    index === 0 ? 'bg-primary' : 'bg-muted'
                  )} />
                  {index < displayEvents.length - 1 && (
                    <div className="w-px h-full bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{event.actor}</span>
                        {' '}
                        <span className="text-muted-foreground">{event.action}</span>
                      </p>
                      {event.reason && (
                        <p className="text-meta text-xs mt-0.5">{event.reason}</p>
                      )}
                    </div>
                    <span className="text-meta text-xs whitespace-nowrap">
                      {format(timestamp, 'MMM d, HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {events.length > maxItems && (
          <p className="text-meta text-sm pt-2 border-t">
            +{events.length - maxItems} more events
          </p>
        )}
      </div>
    </Card>
  );
}

'use client';

import React from 'react';
import { AlertTriangle, Users, Info } from 'lucide-react';
import { Card } from '@/ui-system/layout';
import { StatusBadge } from '@/ui-system/states';
import { cn } from '@/lib/utils';

export interface ImpactAnalysis {
  actionType: string;
  entityId: string;
  impact: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    reversible: boolean;
    affectedUsers: number | 'all' | string;
    message: string;
    warnings?: string[];
    recommendations?: string[];
  };
}

interface ImpactPreviewPanelProps {
  impact: ImpactAnalysis;
  className?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
}

/**
 * Impact Preview Panel
 * 
 * Shows impact analysis before destructive actions.
 * - Affected entities count
 * - Severity indicator
 * - Block action until impact is reviewed
 */
export function ImpactPreviewPanel({
  impact,
  className,
  onConfirm,
  onCancel,
  disabled = false,
}: ImpactPreviewPanelProps) {
  const { severity, reversible, affectedUsers, message, warnings, recommendations } = impact.impact;

  const severityConfig = {
    low: {
      label: 'Low Impact',
      badge: 'info' as const,
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50',
    },
    medium: {
      label: 'Medium Impact',
      badge: 'info' as const,
      borderColor: 'border-amber-200',
      bgColor: 'bg-amber-50',
    },
    high: {
      label: 'High Impact',
      badge: 'at-risk' as const,
      borderColor: 'border-orange-200',
      bgColor: 'bg-orange-50',
    },
    critical: {
      label: 'Critical Impact',
      badge: 'blocked' as const,
      borderColor: 'border-red-200',
      bgColor: 'bg-red-50',
    },
  };

  const config = severityConfig[severity];

  const formatAffectedUsers = () => {
    if (typeof affectedUsers === 'number') {
      return `${affectedUsers} user${affectedUsers !== 1 ? 's' : ''}`;
    }
    if (affectedUsers === 'all') {
      return 'All users';
    }
    return affectedUsers;
  };

  return (
    <Card
      className={cn(
        'border-2',
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className={cn('h-5 w-5 mt-0.5', {
              'text-blue-600': severity === 'low',
              'text-amber-600': severity === 'medium',
              'text-orange-600': severity === 'high',
              'text-red-600': severity === 'critical',
            })} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  Impact Analysis
                </h3>
                <StatusBadge status={config.badge} label={config.label} />
                {!reversible && (
                  <StatusBadge status="blocked" label="Irreversible" />
                )}
              </div>
              <p className="text-sm text-gray-700">{message}</p>
            </div>
          </div>
        </div>

        {/* Affected Users */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">
            <span className="font-medium">Affected:</span> {formatAffectedUsers()}
          </span>
        </div>

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Warnings
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-6">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Info className="h-4 w-4 text-blue-600" />
              Recommendations
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-6">
              {recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {(onConfirm || onCancel) && (
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={disabled}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
            {onConfirm && (
              <button
                onClick={onConfirm}
                disabled={disabled}
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white rounded-md',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  severity === 'critical' || severity === 'high'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                )}
              >
                Review Impact Before Proceeding
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

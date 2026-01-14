'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Shield } from 'lucide-react';
import { ImpactPreviewPanel, ImpactAnalysis } from './ImpactPreviewPanel';
import { cn } from '@/lib/utils';

interface DestructiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  impact: ImpactAnalysis | null;
  actionTitle: string;
  actionDescription: string;
  confirmationText?: string; // Text user must type to confirm
  entityName?: string;
  loading?: boolean;
}

/**
 * Destructive Action Confirmation Modal
 * 
 * Explicit warning for destructive actions.
 * - Require typed confirmation for high-risk actions
 * - Show impact summary inline
 * - Clear WHY, WHAT, WHO
 */
export function DestructiveActionModal({
  isOpen,
  onClose,
  onConfirm,
  impact,
  actionTitle,
  actionDescription,
  confirmationText,
  entityName,
  loading = false,
}: DestructiveActionModalProps) {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const requiresTypedConfirmation = confirmationText && (impact?.impact.severity === 'critical' || impact?.impact.severity === 'high');
  const canConfirm = !requiresTypedConfirmation || typedConfirmation === confirmationText;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    
    setIsConfirming(true);
    try {
      await onConfirm();
      // Reset on success
      setTypedConfirmation('');
      onClose();
    } catch (error) {
      console.error('Action failed:', error);
      // Don't close on error
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    setTypedConfirmation('');
    onClose();
  };

  const severity = impact?.impact.severity || 'medium';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={cn(
          'px-6 py-4 border-b',
          severity === 'critical' || severity === 'high'
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                severity === 'critical' || severity === 'high'
                  ? 'bg-red-100'
                  : 'bg-amber-100'
              )}>
                <AlertTriangle className={cn(
                  'h-5 w-5',
                  severity === 'critical' || severity === 'high'
                    ? 'text-red-600'
                    : 'text-amber-600'
                )} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  {actionTitle}
                </h2>
                <p className="text-sm text-gray-700 mt-1">
                  {actionDescription}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isConfirming || loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Impact Preview */}
          {impact && (
            <ImpactPreviewPanel impact={impact} />
          )}

          {/* WHY - Why this is dangerous */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Why this action is dangerous
                </h3>
                <p className="text-sm text-gray-700">
                  {impact?.impact.message || 'This action cannot be undone and may affect system functionality.'}
                </p>
              </div>
            </div>
          </div>

          {/* WHAT - What will happen */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              What will happen
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {entityName && (
                <li>
                  <strong>{entityName}</strong> will be permanently removed
                </li>
              )}
              {impact?.impact.affectedUsers && (
                <li>
                  {typeof impact.impact.affectedUsers === 'number'
                    ? `${impact.impact.affectedUsers} user${impact.impact.affectedUsers !== 1 ? 's' : ''}`
                    : 'All users'} will be affected
                </li>
              )}
              {!impact?.impact.reversible && (
                <li>This action cannot be reversed</li>
              )}
              <li>All actions will be logged in the audit trail</li>
            </ul>
          </div>

          {/* WHO - Who is responsible */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Who is responsible
                </h3>
                <p className="text-sm text-gray-700">
                  This action will be logged with your Super Admin credentials. All changes are tracked in the audit log.
                </p>
              </div>
            </div>
          </div>

          {/* Typed Confirmation */}
          {requiresTypedConfirmation && (
            <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Type <strong>{confirmationText}</strong> to confirm:
              </label>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                disabled={isConfirming || loading}
                className={cn(
                  'w-full px-3 py-2 border rounded-md',
                  'focus:ring-2 focus:ring-red-500 focus:border-red-500',
                  typedConfirmation === confirmationText
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-300 bg-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                placeholder={confirmationText}
              />
              {typedConfirmation && typedConfirmation !== confirmationText && (
                <p className="text-xs text-red-600 mt-1">
                  Text does not match
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isConfirming || loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isConfirming || loading}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-md',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              severity === 'critical' || severity === 'high'
                ? 'bg-red-600 hover:bg-red-700 disabled:hover:bg-red-600'
                : 'bg-amber-600 hover:bg-amber-700 disabled:hover:bg-amber-600'
            )}
          >
            {isConfirming || loading ? 'Processing...' : 'Confirm Action'}
          </button>
        </div>
      </div>
    </div>
  );
}

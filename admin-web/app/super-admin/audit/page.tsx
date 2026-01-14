'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Shield, AlertTriangle, Clock, User, Search, Filter } from 'lucide-react';
import { Card } from '@/ui-system/layout';
import { StatusBadge } from '@/ui-system/states';
import { format } from 'date-fns';
import { GodModeBanner } from '@/components/super-admin/GodModeBanner';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  details: {
    superAdminAction?: boolean;
    impact?: any;
    method?: string;
    path?: string;
    requestBody?: any;
    [key: string]: any;
  };
  ipAddress: string;
  timestamp: string;
}

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: '',
    entityType: '',
  });

  useEffect(() => {
    loadAuditLogs();
  }, [filter]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.action) params.append('action', filter.action);
      if (filter.entityType) params.append('entityType', filter.entityType);

      const response = await api.get(`/admin/super-admin/audit?${params.toString()}`);
      setLogs(response.data.data?.logs || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdminAction = (action: string) => action.startsWith('SUPER_ADMIN_');

  const getActionDisplayName = (action: string) => {
    return action.replace('SUPER_ADMIN_', '').replace(/_/g, ' ');
  };

  const getSeverity = (log: AuditLog): 'healthy' | 'at-risk' | 'blocked' => {
    if (log.details?.impact?.severity === 'critical') return 'blocked';
    if (log.details?.impact?.severity === 'high') return 'blocked';
    if (log.details?.impact?.severity === 'medium') return 'at-risk';
    return 'healthy';
  };

  if (loading) {
    return (
      <Layout>
        <GodModeBanner />
        <div className="p-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <GodModeBanner />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Audit Trail</h1>
          <p className="text-sm text-gray-600 mt-1">
            Complete history of all Super Admin actions with impact context
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Action
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filter.action}
                  onChange={(e) => setFilter({ ...filter, action: e.target.value })}
                  placeholder="Filter by action..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Entity Type
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filter.entityType}
                  onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
                  placeholder="Filter by entity type..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <div className="space-y-4">
          {logs.length === 0 ? (
            <Card className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
              <p className="text-sm text-gray-600">
                Super Admin actions will appear here once they are performed.
              </p>
            </Card>
          ) : (
            logs.map((log, idx) => (
              <Card key={log.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={idx === 0 ? 'w-2 h-2 bg-primary-600 rounded-full' : 'w-2 h-2 bg-gray-300 rounded-full'} />
                    {idx < logs.length - 1 && (
                      <div className="w-px h-full bg-gray-200 mt-2" style={{ minHeight: '40px' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {getActionDisplayName(log.action)}
                          </h3>
                          {isSuperAdminAction(log.action) && (
                            <StatusBadge status={getSeverity(log)} label="Super Admin" />
                          )}
                          {log.details?.impact && (
                            <StatusBadge
                              status={getSeverity(log)}
                              label={log.details.impact.severity?.toUpperCase() || 'IMPACT'}
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{format(new Date(log.timestamp), 'PPp')}</span>
                          </div>
                          {log.entityType && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Entity:</span>
                              <span>{log.entityType}</span>
                            </div>
                          )}
                          {log.ipAddress && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">IP:</span>
                              <span>{log.ipAddress}</span>
                            </div>
                          )}
                        </div>

                        {/* Impact Details */}
                        {log.details?.impact && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                              <span className="text-xs font-semibold text-gray-900">Impact Analysis</span>
                            </div>
                            <p className="text-xs text-gray-700 mb-2">{log.details.impact.message}</p>
                            {log.details.impact.affectedUsers && (
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Affected:</span>{' '}
                                {typeof log.details.impact.affectedUsers === 'number'
                                  ? `${log.details.impact.affectedUsers} user${log.details.impact.affectedUsers !== 1 ? 's' : ''}`
                                  : log.details.impact.affectedUsers}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Additional Details */}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <details className="mt-3">
                            <summary className="text-xs font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                              View Details
                            </summary>
                            <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

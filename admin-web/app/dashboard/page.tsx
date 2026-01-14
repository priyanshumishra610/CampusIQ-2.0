'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import api from '@/lib/api';
import { 
  Shield, 
  Settings, 
  FileText, 
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { ContentGrid, SectionHeader } from '@/ui-system/layout';
import { KPICard, RiskCard, TimelineCard, SummaryCard } from '@/ui-system/cards';
import { Loading, StatusBadge } from '@/ui-system/states';
import { format } from 'date-fns';

interface DashboardStats {
  rolesCount: number;
  capabilitiesCount: number;
  auditLogsCount: number;
  usersCount: number;
  systemHealth: {
    status: 'healthy' | 'at-risk' | 'degraded';
    issues: number;
  };
  recentActivity: Array<{
    id: string;
    actor: string;
    action: string;
    timestamp: string;
    reason?: string;
  }>;
  atRiskItems: Array<{
    id: string;
    label: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    count?: number;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch stats from various endpoints
      const [rolesRes, capabilitiesRes, auditRes] = await Promise.all([
        api.get('/admin/roles').catch(() => ({ data: { data: { roles: [] } } })),
        api.get('/admin/super-admin/capabilities').catch(() => ({ data: { data: { capabilities: [] } } })),
        api.get('/audit?limit=10').catch(() => ({ data: { data: { logs: [], total: 0 } } })),
      ]);

      const capabilities = capabilitiesRes.data.data?.capabilities || [];
      const degradedCapabilities = capabilities.filter((c: any) => c.status === 'degraded' || c.status === 'disabled');
      
      const auditLogs = auditRes.data.data?.logs || [];
      const recentActivity = auditLogs.slice(0, 5).map((log: any) => ({
        id: log.id || `log-${Math.random()}`,
        actor: log.user_name || log.user_id || 'System',
        action: log.action || 'Unknown action',
        timestamp: log.timestamp || new Date().toISOString(),
        reason: log.reason,
      }));

      const atRiskItems = [
        ...(degradedCapabilities.length > 0 ? [{
          id: 'capabilities',
          label: 'Degraded Capabilities',
          severity: degradedCapabilities.length > 3 ? 'high' : 'medium' as const,
          count: degradedCapabilities.length,
        }] : []),
      ];

      setStats({
        rolesCount: rolesRes.data.data?.roles?.length || 0,
        capabilitiesCount: capabilities.length,
        auditLogsCount: auditRes.data.data?.total || 0,
        usersCount: 0, // Would need a users endpoint
        systemHealth: {
          status: degradedCapabilities.length > 0 ? 'at-risk' : 'healthy',
          issues: degradedCapabilities.length,
        },
        recentActivity,
        atRiskItems,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Loading size="lg" text="Loading dashboard..." />
      </AppLayout>
    );
  }

  if (!stats) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-heading-1 text-foreground mb-2">Super Admin Dashboard</h1>
          <p className="text-meta">
            System health, capabilities, and activity overview
          </p>
        </div>

        {/* System Health Status */}
        <div className="flex items-center gap-4 p-4 rounded-lg border bg-background">
          <div className="flex items-center gap-3">
            <StatusBadge 
              status={stats.systemHealth.status} 
              label={stats.systemHealth.status === 'healthy' ? 'All Systems Operational' : `${stats.systemHealth.issues} Issues Detected`}
            />
          </div>
          {stats.systemHealth.issues > 0 && (
            <button
              onClick={() => router.push('/capabilities')}
              className="ml-auto text-sm text-primary hover:underline"
            >
              View Issues →
            </button>
          )}
        </div>

        {/* KPI Cards */}
        <SectionHeader 
          title="System Overview"
          description="Key metrics and statistics"
        />
        <ContentGrid cols={4}>
          <KPICard
            title="Roles"
            value={stats.rolesCount}
            icon={Shield}
            onClick={() => router.push('/roles')}
          />
          <KPICard
            title="Capabilities"
            value={stats.capabilitiesCount}
            icon={Settings}
            trend={stats.systemHealth.issues > 0 ? {
              value: stats.systemHealth.issues,
              period: 'issues'
            } : undefined}
            status={stats.systemHealth.issues > 0 ? 'negative' : 'neutral'}
            onClick={() => router.push('/capabilities')}
          />
          <KPICard
            title="Audit Logs"
            value={stats.auditLogsCount.toLocaleString()}
            icon={FileText}
            onClick={() => router.push('/audit-logs')}
          />
          <KPICard
            title="Users"
            value={stats.usersCount}
            icon={Users}
          />
        </ContentGrid>

        {/* Risk & Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* At-Risk Items */}
          {stats.atRiskItems.length > 0 ? (
            <RiskCard
              title="Items Requiring Attention"
              items={stats.atRiskItems}
              cta={{
                label: 'View All Issues',
                onClick: () => router.push('/capabilities'),
              }}
              onClick={() => router.push('/capabilities')}
            />
          ) : (
            <SummaryCard
              title="System Status"
              summary={
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <span>All systems operational</span>
                </div>
              }
              details={[
                { label: 'Capabilities', value: 'All stable' },
                { label: 'Last checked', value: format(new Date(), 'MMM d, HH:mm') },
              ]}
            />
          )}

          {/* Recent Activity */}
          <TimelineCard
            title="Recent Activity"
            events={stats.recentActivity.map(event => ({
              ...event,
              timestamp: new Date(event.timestamp),
            }))}
            onClick={() => router.push('/audit-logs')}
          />
        </div>

        {/* Quick Actions */}
        <SectionHeader 
          title="Quick Actions"
          description="Common administrative tasks"
        />
        <ContentGrid cols={3}>
          <SummaryCard
            title="Manage Roles"
            summary="Configure role permissions"
            details={[
              { label: 'Total roles', value: stats.rolesCount },
            ]}
            cta={{
              label: 'Go to Roles',
              onClick: () => router.push('/roles'),
            }}
            onClick={() => router.push('/roles')}
          />
          <SummaryCard
            title="Panel Builder"
            summary="Create and configure panels"
            cta={{
              label: 'Go to Panels',
              onClick: () => router.push('/panels'),
            }}
            onClick={() => router.push('/panels')}
          />
          <SummaryCard
            title="Capability Registry"
            summary="Manage feature toggles"
            details={[
              { label: 'Total capabilities', value: stats.capabilitiesCount },
              { label: 'Issues', value: stats.systemHealth.issues },
            ]}
            cta={{
              label: 'Go to Capabilities',
              onClick: () => router.push('/capabilities'),
            }}
            onClick={() => router.push('/capabilities')}
          />
        </ContentGrid>
      </div>
    </AppLayout>
  );
}

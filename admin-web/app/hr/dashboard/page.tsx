'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/ui-system/layout';
import { 
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface KeyResult {
  id: string;
  label: string;
  owner: string;
  progress: number;
  total: number;
  status: 'on-track' | 'needs-attention' | 'at-risk' | 'not-started' | 'outdated';
  trend?: number;
}

interface Objective {
  id: string;
  title: string;
  owner: string;
  progress: number;
  status: 'on-track' | 'needs-attention' | 'at-risk' | 'not-started';
  keyResults: KeyResult[];
}

export default function HRDashboardPage() {
  const router = useRouter();
  const [objectives] = useState<Objective[]>([
    {
      id: '1',
      title: 'Our onboarding process is smooth and fast',
      owner: 'Alexandra Chen',
      progress: 22,
      status: 'at-risk',
      keyResults: [
        {
          id: 'kr1',
          label: 'Reduce onboarding time to under 2 days',
          owner: 'Sarah Mitchell',
          progress: 0,
          total: 45987,
          status: 'outdated',
        },
        {
          id: 'kr2',
          label: 'Achieve 95% new hire satisfaction score',
          owner: 'Engineering Team',
          progress: 20,
          total: 100,
          status: 'needs-attention',
        },
        {
          id: 'kr3',
          label: 'Complete digital transformation of onboarding',
          owner: 'Product Team',
          progress: 23,
          total: 2400,
          status: 'on-track',
          trend: 12,
        },
      ],
    },
    {
      id: '2',
      title: 'Maintain high customer retention and keep churn below 5%',
      owner: 'Michael Torres',
      progress: 20,
      status: 'at-risk',
      keyResults: [
        {
          id: 'kr4',
          label: 'Reduce customer churn to 3%',
          owner: 'Customer Success',
          progress: 15,
          total: 100,
          status: 'at-risk',
        },
        {
          id: 'kr5',
          label: 'Increase customer satisfaction to 4.5/5',
          owner: 'Support Team',
          progress: 25,
          total: 100,
          status: 'on-track',
        },
      ],
    },
  ]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'on-track':
        return { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, label: 'ON TRACK' };
      case 'needs-attention':
        return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle, label: 'NEEDS ATTENTION' };
      case 'at-risk':
        return { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'AT RISK' };
      case 'outdated':
        return { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Outdated' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock, label: 'NOT STARTED' };
    }
  };

  const overallStats = {
    onTrack: 0,
    needsAttention: 4,
    atRisk: 4,
    notStarted: 4,
    outdated: 2,
    overallProgress: 39,
  };

  const recentActivity = [
    {
      id: '1',
      actor: 'Dashonte Clarke',
      action: 'Updated progress to 5%',
      timestamp: 'yesterday',
      status: 'at-risk' as const,
      context: 'Objective progress - 23%',
    },
    {
      id: '2',
      actor: 'Fakhri Shokoohi',
      action: 'Added a note',
      timestamp: '24 Jan 2024 4:45 PM',
      status: 'needs-attention' as const,
      context: 'Made some decent progress on the development of the new feature.',
    },
    {
      id: '3',
      actor: 'Sarah Mitchell',
      action: 'Edited keyresult details',
      timestamp: '23 Jan 2024 2:30 PM',
      status: 'on-track' as const,
      context: 'Updated target metrics',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Objectives */}
          <div className="lg:col-span-2 space-y-6">
            {objectives.map((objective) => {
              const statusConfig = getStatusConfig(objective.status);
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={objective.id} className="p-6">
                  <div className="space-y-4">
                    {/* Objective Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base font-semibold text-gray-900">{objective.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${statusConfig.color}`}>
                            {objective.progress}% {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">Owner: {objective.owner}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${objective.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Key Results */}
                    <div className="space-y-3 pt-2 border-t border-gray-200">
                      {objective.keyResults.map((kr) => {
                        const krStatus = getStatusConfig(kr.status);
                        const KrIcon = krStatus.icon;
                        const percentage = kr.total > 0 ? (kr.progress / kr.total) * 100 : 0;

                        return (
                          <div key={kr.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{kr.label}</span>
                                <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${krStatus.color}`}>
                                  {krStatus.label}
                                </span>
                              </div>
                              {kr.trend && (
                                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  ↑{kr.trend}%
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>Owner: {kr.owner}</span>
                              <span>{kr.progress}/{kr.total}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  kr.status === 'on-track' ? 'bg-green-500' :
                                  kr.status === 'needs-attention' ? 'bg-amber-500' :
                                  kr.status === 'at-risk' || kr.status === 'outdated' ? 'bg-red-500' :
                                  'bg-gray-300'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Right Column - Overall Progress & Activity */}
          <div className="space-y-6">
            {/* Overall Progress Card */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-900">Overall Progress</h3>
                
                {/* Donut Chart Placeholder */}
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="8"
                        strokeDasharray={`${overallStats.overallProgress * 2.827} 282.7`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900">{overallStats.overallProgress}%</span>
                    </div>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-gray-700">ON TRACK</span>
                    </div>
                    <span className="font-medium text-gray-900">({overallStats.onTrack})</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-gray-700">NEEDS ATTENTION</span>
                    </div>
                    <span className="font-medium text-gray-900">({overallStats.needsAttention})</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-gray-700">AT RISK</span>
                    </div>
                    <span className="font-medium text-gray-900">({overallStats.atRisk})</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-gray-700">NOT STARTED</span>
                    </div>
                    <span className="font-medium text-gray-900">({overallStats.notStarted})</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      <span className="text-gray-700">Outdated</span>
                    </div>
                    <span className="font-medium text-gray-900">({overallStats.outdated})</span>
                  </div>
                </div>

                <button className="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
                  Update Progress
                </button>
              </div>
            </Card>

            {/* Activity Feed */}
            <Card className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Activity</h3>
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const statusConfig = getStatusConfig(activity.status);
                  
                  return (
                    <div key={activity.id} className="space-y-2 pb-4 border-b border-gray-200 last:border-0">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-blue-700">
                            {activity.actor.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{activity.actor}</span>
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{activity.action}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.context}</p>
                          <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

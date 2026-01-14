'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/ui-system/layout';
import { 
  CheckCircle2,
  Calendar,
  Users,
  Lock,
  Calculator,
  FileText,
  User,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

const payrollPeriods = [
  { month: 'Apr 2020', period: 'MAR 26 - APR 25', status: 'completed' },
  { month: 'May 2020', period: 'APR 26 - MAY 25', status: 'completed' },
  { month: 'Jun 2020', period: 'MAY 26 - JUN 25', status: 'completed' },
  { month: 'Jul 2020', period: 'JUN 26 - JUL 25', status: 'completed' },
  { month: 'Aug 2020', period: 'JUL 26 - AUG 25', status: 'current' },
  { month: 'Sep 2020', period: 'AUG 26 - SEP 25', status: 'upcoming' },
  { month: 'Oct 2020', period: 'SEP 26 - OCT 25', status: 'upcoming' },
  { month: 'Nov 2020', period: 'OCT 26 - NOV 25', status: 'upcoming' },
  { month: 'Dec 2020', period: 'NOV 26 - DEC 25', status: 'upcoming' },
];

const payrollModules = [
  {
    id: '1',
    title: 'Leave, attendance & daily wages',
    icon: Calendar,
    lastChange: 'Aug 31 04:28 pm',
    changedBy: 'Vijay Prakash Yalamanchili',
    locked: false,
  },
  {
    id: '2',
    title: 'New joinees & exits',
    icon: User,
    lastChange: 'Aug 31 04:28 pm',
    changedBy: 'Vijay Prakash Yalamanchili',
    locked: false,
  },
  {
    id: '3',
    title: 'Bonus, salary revisions & overtime',
    icon: FileText,
    lastChange: 'Aug 31 04:28 pm',
    changedBy: 'Vijay Prakash Yalamanchili',
    locked: false,
  },
  {
    id: '4',
    title: 'Reimbursement, adhoc payments, deductions',
    icon: FileText,
    lastChange: 'Aug 31 04:28 pm',
    changedBy: 'Vijay Prakash Yalamanchili',
    locked: true,
  },
  {
    id: '5',
    title: 'Arrears & dues',
    icon: Calculator,
    lastChange: 'Aug 31 04:28 pm',
    changedBy: 'Vijay Prakash Yalamanchili',
    locked: true,
  },
  {
    id: '6',
    title: 'Review all employees',
    icon: User,
    lastChange: 'Aug 31 04:28 pm',
    changedBy: 'Vijay Prakash Yalamanchili',
    locked: false,
  },
];

const activityLog = [
  {
    id: '1',
    actor: 'Higashi Mako',
    action: 'Payroll processing for 137 employees',
    status: 'PREVIEW PAYROLL',
    timestamp: 'Aug 31 04:28 pm',
    avatar: '/api/placeholder/32/32',
  },
  {
    id: '2',
    actor: 'Sebastian Westergren',
    action: 'Updated leave and attendance data',
    status: 'UPDATED',
    timestamp: 'Aug 31 03:15 pm',
    avatar: '/api/placeholder/32/32',
  },
  {
    id: '3',
    actor: 'Vijay Prakash Yalamanchili',
    action: 'Finalized payroll for July 2020',
    status: 'FINALIZED',
    timestamp: 'Aug 31 02:45 pm',
    avatar: '/api/placeholder/32/32',
  },
];

export default function PayrollDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('Aug 2020');

  const currentPeriod = payrollPeriods.find(p => p.month === selectedPeriod);
  const payrollCosts = [
    { label: 'Basic Salary', amount: 12500000, delta: 243615 },
    { label: 'Allowances', amount: 2500000, delta: 50000 },
    { label: 'Deductions', amount: -1500000, delta: -30000 },
    { label: 'Net Pay', amount: 13500000, delta: 263615 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {payrollPeriods.map((period) => (
              <button
                key={period.month}
                onClick={() => setSelectedPeriod(period.month)}
                className={`flex-shrink-0 px-4 py-2 rounded text-sm font-medium border ${
                  period.status === 'current'
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : period.status === 'completed'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold">{period.month}</div>
                  <div className="text-xs font-normal mt-0.5">{period.period}</div>
                </div>
                {period.status === 'completed' && (
                  <div className="ml-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-xs">COMPLETED</span>
                  </div>
                )}
                {period.status === 'current' && (
                  <div className="ml-2 text-xs">→ CURRENT</div>
                )}
                {period.status === 'upcoming' && (
                  <div className="ml-2 text-xs">UPCOMING</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Payroll Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">May 2020 Payroll</h1>
              <p className="text-sm text-gray-600">Apr 26 - May 25 (31 days)</p>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-4 gap-4">
              {payrollCosts.map((cost, index) => (
                <Card key={index} className="p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">TOTAL PAYROLL COST</p>
                  <p className="text-xl font-bold text-gray-900 mb-1">
                    ₹{cost.amount.toLocaleString('en-IN')}
                  </p>
                  <p className={`text-xs ${
                    cost.delta >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Jul {cost.delta >= 0 ? '+' : ''}₹{Math.abs(cost.delta).toLocaleString('en-IN')}
                  </p>
                </Card>
              ))}
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <p className="text-sm text-gray-600 mb-1">CALENDAR DAYS</p>
                <p className="text-lg font-semibold text-gray-900">31</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-gray-600 mb-1">EMPLOYEES</p>
                <p className="text-lg font-semibold text-gray-900">240 <span className="text-green-600">+12</span> <span className="text-red-600">-4</span></p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-gray-600 mb-1">PAYROLL PROCESSED</p>
                <p className="text-lg font-semibold text-gray-900">234/240 Employees</p>
              </Card>
            </div>

            {/* Run Payroll Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">&gt; Run Payroll</h2>
                <span className="px-3 py-1 text-sm font-medium rounded bg-green-100 text-green-700 border border-green-200">
                  FINALIZED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {payrollModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Card key={module.id} className={`p-4 ${module.locked ? 'opacity-75' : ''}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Icon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900">{module.title}</p>
                        </div>
                        {module.locked && (
                          <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Last change - {module.lastChange} by {module.changedBy}
                      </p>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Finalization Status */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Payroll finalized on Aug 31, 2020 04:34 PM by Veera prasanna rakesh
              </p>
            </div>
          </div>

          {/* Right Column - Activity */}
          <div>
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Activity</h2>
              <div className="space-y-4">
                {activityLog.map((activity) => (
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
                        </div>
                        <p className="text-sm text-gray-700">{activity.action}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 border border-blue-200">
                          {activity.status}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

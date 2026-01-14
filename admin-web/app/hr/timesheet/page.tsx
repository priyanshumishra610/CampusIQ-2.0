'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/ui-system/layout';
import { 
  ChevronDown,
  Plus,
  Trash2,
  Settings,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const timesheetEntries = [
  {
    id: '1',
    date: 'Jun 27',
    day: 'Monday',
    tasks: 2,
    hours: '8h 41m',
    status: 'pending',
  },
  {
    id: '2',
    date: 'Jun 28',
    day: 'Tuesday',
    tasks: 2,
    hours: '8h 21m',
    status: 'pending',
  },
];

const attachments = [
  { id: '1', name: 'Website page development', size: '200 KB' },
  { id: '2', name: 'App homepage interface', size: '16 MB' },
];

const resources = [
  {
    id: '1',
    name: 'Anna Cruz',
    avatar: '/api/placeholder/40/40',
    projects: 2,
    utilization: 65,
    billable: true,
  },
  {
    id: '2',
    name: 'William Joe',
    avatar: '/api/placeholder/40/40',
    projects: 2,
    utilization: 65,
    billable: true,
  },
  {
    id: '3',
    name: 'Mark Henry',
    avatar: '/api/placeholder/40/40',
    projects: 2,
    utilization: 65,
    billable: true,
  },
];

const timesheetHours = [
  { id: '1', name: 'Jacob Dawson', role: 'Design System Manager', hours: '16:00', subtotal: 'USD 1920.00' },
  { id: '2', name: 'Charles Daniel', role: 'Sr. Product Designer', hours: '16:00', subtotal: 'USD 1920.00' },
  { id: '3', name: 'Saurabh Meena', role: 'Product Manager', hours: '16:00', subtotal: 'USD 1920.00' },
];

export default function TimesheetPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('27 Jun - 3 Jul');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Timesheet */}
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Timesheet</h2>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1">
                    {selectedPeriod}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button className="p-1.5 text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">BILLABLE</p>
                  <p className="text-sm font-semibold text-gray-900">22h 31m</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">NON-BILLABLE</p>
                  <p className="text-sm font-semibold text-gray-900">24h 02m</p>
                </div>
                <div className="bg-gray-100 rounded p-2">
                  <p className="text-xs text-gray-500 mb-1">TOTAL HOURS</p>
                  <p className="text-sm font-semibold text-gray-900">40h 41m</p>
                </div>
              </div>

              {/* Daily Entries */}
              <div className="space-y-3 mb-4">
                {timesheetEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border border-gray-200 rounded hover:border-gray-300 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.date} {entry.day}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">{entry.tasks} Tasks</span>
                        <span className="text-xs text-gray-600">{entry.hours}</span>
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${
                        entry.status === 'pending' 
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {entry.status === 'pending' ? 'Pending' : 'Submitted'}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </div>

              {/* Attachments */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Attachments</p>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-900 truncate">{attachment.name}</p>
                        <p className="text-xs text-gray-500">{attachment.size}</p>
                      </div>
                      <button className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    + Add Attachments
                  </button>
                </div>
              </div>

              <button className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
                Submit Timesheet
              </button>
            </Card>
          </div>

          {/* Center Column - Resource Utilization */}
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Resource Utilization</h2>
                <button className="p-1.5 text-gray-600 hover:bg-gray-50 rounded">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                {resources.map((resource) => (
                  <div key={resource.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">
                        {resource.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{resource.name}</p>
                      <p className="text-xs text-gray-600">{resource.projects} Projects</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">Total Utilization: {resource.utilization}%</p>
                      <p className="text-xs text-gray-600">Billable: {resource.billable ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Non Billable Hours */}
            <Card className="p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Non Billable Hours</h2>
              <div className="flex items-center justify-center mb-4">
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
                      stroke="#10b981"
                      strokeWidth="8"
                      strokeDasharray="200 282.7"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">42</p>
                      <p className="text-xs text-gray-500">Employees</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-gray-700">Business Development</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <span className="text-gray-700">Internal Product</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="text-gray-700">Training</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Resource Usage */}
            <Card className="p-5">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">42 Non Billable Employees</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">128 Billable Employees</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Billing */}
          <div className="space-y-6">
            {/* Timesheet Hours Table */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Timesheet Hours</h2>
                <p className="text-sm text-gray-600">32:00 total hours</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2">
                        <input type="checkbox" className="rounded" />
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700">Description</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700">Billable(Hrs)</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-700">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheetHours.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-2 px-2">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="py-2 px-2">
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.role}</p>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-gray-900">{item.hours} Hrs</td>
                        <td className="py-2 px-2 text-right font-medium text-gray-900">{item.subtotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
                Generate Invoice
              </button>
            </Card>

            {/* Billing Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Feb 26 - Mar 25 2020</p>
                <p className="text-lg font-bold text-gray-900 mb-2">USD 42,342</p>
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700 border border-amber-200">
                  PARTIALLY PAID
                </span>
              </Card>
              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-xs text-gray-600 mb-1">Jan 26 - Feb 25 2020</p>
                <p className="text-lg font-bold text-gray-900 mb-2">USD 42,342</p>
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 border border-green-200">
                  PAID
                </span>
              </Card>
            </div>

            {/* Project Billing */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Project Billing</h2>
                <button className="p-1.5 text-gray-600 hover:bg-gray-50 rounded">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Billing model: Time & Materials</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Billing Rate Unit: Hourly</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Billing period: Monthly</p>
                </div>
                <div>
                  <p className="text-gray-600">Current Period: Aug 26 - Sep 25 2024</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

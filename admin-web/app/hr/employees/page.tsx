'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/ui-system/layout';
import { Users, Search, Plus } from 'lucide-react';

const employees = [
  {
    id: '1',
    name: 'Samanta Sengal',
    email: 'samantha.sengal@campusiq.edu',
    designation: 'Lead Engineer',
    department: 'Engineering',
    employeeNo: 'E4569',
  },
  {
    id: '2',
    name: 'Victor Pacheco',
    email: 'victor.pacheco@campusiq.edu',
    designation: 'Senior Engineer',
    department: 'Engineering',
    employeeNo: 'E4570',
  },
  {
    id: '3',
    name: 'Angela Longoria',
    email: 'angela.longoria@campusiq.edu',
    designation: 'Full Stack Developer',
    department: 'Engineering',
    employeeNo: 'E4571',
  },
];

export default function EmployeesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-600 mt-1">Manage employee profiles and information</p>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </Card>

        {/* Employee List */}
        <div className="grid grid-cols-1 gap-4">
          {employees.map((employee) => (
            <Card
              key={employee.id}
              className="p-4 hover:border-gray-300 cursor-pointer"
              onClick={() => router.push(`/hr/employees/${employee.id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-blue-700">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">{employee.name}</h3>
                  <p className="text-sm text-gray-600">{employee.email}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-500">{employee.designation}</span>
                    <span className="text-xs text-gray-500">{employee.department}</span>
                    <span className="text-xs text-gray-500">#{employee.employeeNo}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

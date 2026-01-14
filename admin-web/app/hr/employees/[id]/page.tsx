'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/ui-system/layout';
import { 
  MapPin,
  Mail,
  Phone,
  ChevronDown,
  ThumbsUp,
  DollarSign,
  Award,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

const tabs = ['About', 'Job', 'Time', 'Finances', 'Docs', 'Goals', 'Reviews', 'Onboarding'];

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;
  const [activeTab, setActiveTab] = useState('About');

  // Mock employee data
  const employee = {
    id: employeeId,
    name: 'Samanta Sengal',
    avatar: '/api/placeholder/120/120',
    location: 'Technovert | Hyderabad, India',
    email: 'samantha.sengal@campusiq.edu',
    phone: '+91 9234125678',
    designation: 'Lead Engineer',
    department: 'Engineering',
    reportingTo: 'Vijay Prakash Yalamanchili',
    employeeNo: 'E4569',
  };

  const timeline = [
    {
      id: '1',
      type: 'anniversary',
      label: 'Work Anniversary - 3rd',
      date: new Date('2020-01-24'),
      icon: ThumbsUp,
    },
    {
      id: '2',
      type: 'pay-increase',
      label: 'Pay Increase',
      date: new Date('2020-01-24'),
      icon: DollarSign,
      link: true,
    },
    {
      id: '3',
      type: 'praise',
      label: 'Praise - Super Star worker',
      date: new Date('2020-01-24'),
      icon: Award,
      from: 'Raj Kumar Srinath',
      fromAvatar: '/api/placeholder/32/32',
    },
  ];

  const reportingTeam = [
    { id: '1', name: 'Victor Pacheco', role: 'Senior Engineer', avatar: '/api/placeholder/40/40' },
    { id: '2', name: 'Angela Longoria', role: 'Full Stack Developer', avatar: '/api/placeholder/40/40' },
    { id: '3', name: 'Tikhon Yaroslavsky', role: 'Web Developer', avatar: '/api/placeholder/40/40' },
  ];

  const praiseBadges = [
    { id: '1', name: 'Money Maker Medal', icon: '💰', count: 2 },
    { id: '2', name: 'Relentless Cogwheel', icon: '⚙️', count: 1 },
    { id: '3', name: 'Problem Solver', icon: '🧩', count: 5 },
    { id: '4', name: 'Torch Bearer', icon: '🔥', count: 1 },
  ];

  const goals = [
    {
      id: '1',
      title: 'Digital transformation of all onboarding processes',
      status: 'on-track',
      progress: 23,
      total: 45,
      trend: 12,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <Card className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-semibold text-blue-700">
                {employee.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">{employee.name}</h1>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{employee.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{employee.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{employee.phone}</span>
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50">
                  Actions
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Designation</p>
                  <p className="text-sm font-medium text-gray-900">{employee.designation}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Department</p>
                  <p className="text-sm font-medium text-gray-900">{employee.department}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Reporting To</p>
                  <p className="text-sm font-medium text-gray-900">{employee.reportingTo}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Employee No</p>
                  <p className="text-sm font-medium text-gray-900">{employee.employeeNo}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            {activeTab === 'About' && (
              <>
                <Card className="p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">About</h2>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">
                    Dynamic and creative software developer with over 5 years of experience in producing robust code for high-volume companies. Eager to support with top-notch coding skills.
                  </p>
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">What I love about my job?</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      I like the support I receive from peers and the management here. The job is challenging enough and pushes my limits and I found myself growing fast.
                    </p>
                  </div>
                </Card>

                {/* Timeline */}
                <Card className="p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Timeline</h2>
                  <div className="space-y-4">
                    {timeline.map((event, index) => {
                      const Icon = event.icon;
                      return (
                        <div key={event.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              index === 0 ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <Icon className={`h-4 w-4 ${
                                index === 0 ? 'text-blue-600' : 'text-gray-600'
                              }`} />
                            </div>
                            {index < timeline.length - 1 && (
                              <div className="w-0.5 h-12 bg-gray-200 mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{event.label}</p>
                                {event.from && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="w-6 h-6 rounded-full bg-gray-200" />
                                    <span className="text-xs text-gray-600">{event.from}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(event.date, 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}

            {activeTab !== 'About' && (
              <Card className="p-6">
                <p className="text-sm text-gray-500">Content for {activeTab} tab coming soon...</p>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Reporting Team */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Reporting Team (12)</h2>
              </div>
              <div className="space-y-3">
                {reportingTeam.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>
                ))}
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2">
                  View all
                </button>
              </div>
            </Card>

            {/* Praise */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Praise</h2>
                <button className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50">
                  + Give Praise
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {praiseBadges.map((badge) => (
                  <div key={badge.id} className="p-3 border border-gray-200 rounded text-center">
                    <div className="text-2xl mb-1">{badge.icon}</div>
                    <p className="text-xs text-gray-600 mb-1">{badge.name}</p>
                    <p className="text-sm font-semibold text-gray-900">{badge.count}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Goals */}
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Goals</h2>
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">{goal.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        On track
                      </span>
                      <span className="text-xs text-gray-600">{goal.progress}/{goal.total}</span>
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1 ml-auto">
                        <TrendingUp className="h-3 w-3" />
                        ↑{goal.trend}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(goal.progress / goal.total) * 100}%` }}
                      />
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

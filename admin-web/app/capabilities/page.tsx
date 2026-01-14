'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Settings, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface Capability {
  id: string;
  name: string;
  status: 'stable' | 'degraded' | 'disabled';
  reason: string | null;
  ownerModule: string;
  lastChecked: string;
  lastError: string | null;
}

export default function CapabilitiesPage() {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCapabilities();
  }, []);

  const loadCapabilities = async () => {
    try {
      const response = await api.get('/admin/super-admin/capabilities');
      setCapabilities(response.data.data?.capabilities || []);
    } catch (error) {
      console.error('Failed to load capabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (capabilityId: string, status: string, reason?: string) => {
    try {
      await api.put(`/admin/super-admin/capabilities/${capabilityId}/status`, {
        status,
        reason,
      });
      loadCapabilities();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to update capability');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'stable':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'disabled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'stable':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'disabled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capabilities</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage system feature availability and health
          </p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capability
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Checked
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {capabilities.map((capability) => (
                <tr key={capability.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Settings className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{capability.name}</div>
                        <div className="text-sm text-gray-500">{capability.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(capability.status)}
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(capability.status)}`}>
                        {capability.status}
                      </span>
                    </div>
                    {capability.reason && (
                      <p className="mt-1 text-xs text-gray-500">{capability.reason}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {capability.ownerModule}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {capability.lastChecked
                      ? new Date(capability.lastChecked).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <select
                      value={capability.status}
                      onChange={(e) => {
                        const reason = prompt('Reason (optional):');
                        updateStatus(capability.id, e.target.value, reason || undefined);
                      }}
                      className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="stable">Stable</option>
                      <option value="degraded">Degraded</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

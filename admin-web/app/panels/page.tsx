'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Copy, Eye, Palette, Layout as LayoutIcon, Settings } from 'lucide-react';
import Link from 'next/link';

interface Panel {
  id: string;
  name: string;
  description: string;
  themeConfig: any;
  navigationConfig: any;
  capabilityOverrides: any;
  permissionSet: string[];
  isSystemPanel: boolean;
  status: 'draft' | 'published' | 'archived';
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function PanelsPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPanels();
  }, []);

  const loadPanels = async () => {
    try {
      const response = await api.get('/admin/panels?includeDraft=true');
      setPanels(response.data.data?.panels || []);
    } catch (error) {
      console.error('Failed to load panels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (panel: Panel) => {
    if (!confirm(`Delete panel "${panel.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/panels/${panel.id}`);
      loadPanels();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to delete panel');
    }
  };

  const handleClone = async (panel: Panel) => {
    const newName = prompt(`Clone panel "${panel.name}" as:`, `${panel.name} (Copy)`);
    if (!newName) return;

    try {
      await api.post(`/admin/panels/${panel.id}/clone`, { name: newName });
      loadPanels();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to clone panel');
    }
  };

  const handlePublish = async (panel: Panel) => {
    if (!confirm(`Publish panel "${panel.name}"?`)) {
      return;
    }

    try {
      await api.post(`/admin/panels/${panel.id}/publish`);
      loadPanels();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to publish panel');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panels</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage workspace configurations (theme, navigation, capabilities)
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Create Panel
          </button>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Panel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {panels.map((panel) => (
                <tr key={panel.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <LayoutIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{panel.name}</div>
                        <div className="text-sm text-gray-500">{panel.description || 'No description'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      panel.status === 'published' 
                        ? 'bg-green-100 text-green-800'
                        : panel.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {panel.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {panel.userCount} user{panel.userCount !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {panel.isSystemPanel ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        System
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/panels/${panel.id}`}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      <Edit className="h-5 w-5 inline" />
                    </Link>
                    <button
                      onClick={() => handleClone(panel)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="Clone"
                    >
                      <Copy className="h-5 w-5 inline" />
                    </button>
                    {panel.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(panel)}
                        className="text-green-600 hover:text-green-900 mr-4"
                        title="Publish"
                      >
                        <Eye className="h-5 w-5 inline" />
                      </button>
                    )}
                    {!panel.isSystemPanel && (
                      <button
                        onClick={() => handleDelete(panel)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showCreateModal && (
          <CreatePanelModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              loadPanels();
              setShowCreateModal(false);
            }}
          />
        )}
      </div>
    </Layout>
  );
}

function CreatePanelModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.post('/admin/panels', {
        name,
        description,
        themeConfig: {
          primaryColor: '#0ea5e9',
          secondaryColor: '#64748b',
          mode: 'light',
        },
        navigationConfig: {
          modules: [],
          order: [],
          hidden: [],
        },
      });
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create panel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Panel</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="My Custom Panel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                rows={3}
                placeholder="Panel description..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

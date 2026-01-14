'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Save, Eye, Palette, Layout as LayoutIcon, Settings, X, CheckCircle } from 'lucide-react';

interface Panel {
  id: string;
  name: string;
  description: string;
  themeConfig: {
    primaryColor: string;
    secondaryColor: string;
    mode: 'light' | 'dark';
    logoUrl?: string;
    faviconUrl?: string;
    customCss?: string;
  };
  navigationConfig: {
    modules: string[];
    order: string[];
    hidden: string[];
  };
  capabilityOverrides: Record<string, any>;
  permissionSet: string[];
  status: string;
}

interface Capability {
  id: string;
  name: string;
  status: string;
  overridden: boolean;
}

const AVAILABLE_MODULES = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
  { id: 'roles', name: 'Roles', icon: '🛡️' },
  { id: 'panels', name: 'Panels', icon: '🎨' },
  { id: 'capabilities', name: 'Capabilities', icon: '⚙️' },
  { id: 'audit-logs', name: 'Audit Logs', icon: '📋' },
  { id: 'users', name: 'Users', icon: '👥' },
  { id: 'settings', name: 'Settings', icon: '🔧' },
];

export default function PanelBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const panelId = params.id as string;
  
  const [panel, setPanel] = useState<Panel | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<'theme' | 'navigation' | 'capabilities' | 'permissions'>('theme');

  useEffect(() => {
    loadPanel();
    loadCapabilities();
    loadPermissions();
  }, [panelId]);

  const loadPanel = async () => {
    try {
      const response = await api.get(`/admin/panels/${panelId}`);
      const data = response.data.data;
      setPanel(data);
      setPreviewMode(data.themeConfig?.mode || 'light');
    } catch (error) {
      console.error('Failed to load panel:', error);
      router.push('/panels');
    } finally {
      setLoading(false);
    }
  };

  const loadCapabilities = async () => {
    try {
      const response = await api.get('/admin/super-admin/capabilities');
      const caps = response.data.data?.capabilities || [];
      setCapabilities(caps.map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        overridden: false,
      })));
    } catch (error) {
      console.error('Failed to load capabilities:', error);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await api.get('/admin/roles/permissions/list');
      setAllPermissions(response.data.data?.permissions || []);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const updatePanel = async (updates: Partial<Panel>) => {
    if (!panel) return;

    try {
      const response = await api.put(`/admin/panels/${panelId}`, updates);
      setPanel({ ...panel, ...updates });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to update panel');
    }
  };

  const handleSave = async () => {
    if (!panel) return;
    
    setSaving(true);
    try {
      await updatePanel({
        name: panel.name,
        description: panel.description,
        themeConfig: panel.themeConfig,
        navigationConfig: panel.navigationConfig,
        capabilityOverrides: panel.capabilityOverrides,
        permissionSet: panel.permissionSet,
      });
      alert('Panel saved successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to save panel');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Publish this panel? It will be available for assignment to users.')) {
      return;
    }

    try {
      await api.post(`/admin/panels/${panelId}/publish`);
      alert('Panel published successfully!');
      loadPanel();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to publish panel');
    }
  };

  if (loading || !panel) {
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{panel.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{panel.description || 'No description'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              panel.status === 'published'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {panel.status}
            </span>
            {panel.status === 'draft' && (
              <button
                onClick={handlePublish}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Eye className="h-4 w-4" />
                Publish
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Builder Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow p-1 flex gap-1">
              {[
                { id: 'theme', label: 'Theme', icon: Palette },
                { id: 'navigation', label: 'Navigation', icon: LayoutIcon },
                { id: 'capabilities', label: 'Capabilities', icon: Settings },
                { id: 'permissions', label: 'Permissions', icon: CheckCircle },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Theme Tab */}
            {activeTab === 'theme' && (
              <ThemeBuilder
                themeConfig={panel.themeConfig}
                onChange={(themeConfig) => setPanel({ ...panel, themeConfig })}
                previewMode={previewMode}
                onPreviewModeChange={setPreviewMode}
              />
            )}

            {/* Navigation Tab */}
            {activeTab === 'navigation' && (
              <NavigationBuilder
                navigationConfig={panel.navigationConfig}
                onChange={(navigationConfig) => setPanel({ ...panel, navigationConfig })}
              />
            )}

            {/* Capabilities Tab */}
            {activeTab === 'capabilities' && (
              <CapabilitiesBuilder
                capabilities={capabilities}
                overrides={panel.capabilityOverrides}
                onChange={(capabilityOverrides) => setPanel({ ...panel, capabilityOverrides })}
              />
            )}

            {/* Permissions Tab */}
            {activeTab === 'permissions' && (
              <PermissionsBuilder
                permissions={allPermissions}
                selected={panel.permissionSet}
                onChange={(permissionSet) => setPanel({ ...panel, permissionSet })}
              />
            )}
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-1">
            <PanelPreview
              panel={panel}
              mode={previewMode}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ThemeBuilder({
  themeConfig,
  onChange,
  previewMode,
  onPreviewModeChange,
}: {
  themeConfig: Panel['themeConfig'];
  onChange: (config: Panel['themeConfig']) => void;
  previewMode: 'light' | 'dark';
  onPreviewModeChange: (mode: 'light' | 'dark') => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onChange({ ...themeConfig, mode: 'light' });
              onPreviewModeChange('light');
            }}
            className={`flex-1 px-4 py-2 rounded-md border ${
              themeConfig.mode === 'light'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => {
              onChange({ ...themeConfig, mode: 'dark' });
              onPreviewModeChange('dark');
            }}
            className={`flex-1 px-4 py-2 rounded-md border ${
              themeConfig.mode === 'dark'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={themeConfig.primaryColor}
            onChange={(e) => onChange({ ...themeConfig, primaryColor: e.target.value })}
            className="h-10 w-20 rounded border border-gray-300"
          />
          <input
            type="text"
            value={themeConfig.primaryColor}
            onChange={(e) => onChange({ ...themeConfig, primaryColor: e.target.value })}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={themeConfig.secondaryColor}
            onChange={(e) => onChange({ ...themeConfig, secondaryColor: e.target.value })}
            className="h-10 w-20 rounded border border-gray-300"
          />
          <input
            type="text"
            value={themeConfig.secondaryColor}
            onChange={(e) => onChange({ ...themeConfig, secondaryColor: e.target.value })}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL (optional)</label>
        <input
          type="url"
          value={themeConfig.logoUrl || ''}
          onChange={(e) => onChange({ ...themeConfig, logoUrl: e.target.value || undefined })}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          placeholder="https://example.com/logo.png"
        />
      </div>
    </div>
  );
}

function NavigationBuilder({
  navigationConfig,
  onChange,
}: {
  navigationConfig: Panel['navigationConfig'];
  onChange: (config: Panel['navigationConfig']) => void;
}) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const availableModules = AVAILABLE_MODULES.filter(
    m => !navigationConfig.modules.includes(m.id)
  );

  const orderedModules = navigationConfig.order.length > 0
    ? navigationConfig.order
        .map(id => AVAILABLE_MODULES.find(m => m.id === id))
        .filter(Boolean)
    : navigationConfig.modules
        .map(id => AVAILABLE_MODULES.find(m => m.id === id))
        .filter(Boolean);

  const addModule = (moduleId: string) => {
    onChange({
      ...navigationConfig,
      modules: [...navigationConfig.modules, moduleId],
      order: navigationConfig.order.length === 0
        ? [...navigationConfig.modules, moduleId]
        : [...navigationConfig.order, moduleId],
    });
  };

  const removeModule = (moduleId: string) => {
    onChange({
      ...navigationConfig,
      modules: navigationConfig.modules.filter(id => id !== moduleId),
      order: navigationConfig.order.filter(id => id !== moduleId),
      hidden: navigationConfig.hidden.filter(id => id !== moduleId),
    });
  };

  const toggleHidden = (moduleId: string) => {
    const isHidden = navigationConfig.hidden.includes(moduleId);
    onChange({
      ...navigationConfig,
      hidden: isHidden
        ? navigationConfig.hidden.filter(id => id !== moduleId)
        : [...navigationConfig.hidden, moduleId],
    });
  };

  const handleDragStart = (moduleId: string) => {
    setDraggedItem(moduleId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedItem || draggedItem === targetId) return;

    const currentOrder = navigationConfig.order.length > 0
      ? navigationConfig.order
      : navigationConfig.modules;

    const fromIndex = currentOrder.indexOf(draggedItem);
    const toIndex = currentOrder.indexOf(targetId);

    const newOrder = [...currentOrder];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedItem);

    onChange({
      ...navigationConfig,
      order: newOrder,
    });

    setDraggedItem(null);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Active Modules</h3>
        <div className="space-y-2">
          {orderedModules.map((module) => {
            if (!module) return null;
            const isHidden = navigationConfig.hidden.includes(module.id);
            return (
              <div
                key={module.id}
                draggable
                onDragStart={() => handleDragStart(module.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(module.id)}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-move"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{module.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{module.name}</span>
                  {isHidden && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">Hidden</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleHidden(module.id)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {isHidden ? 'Show' : 'Hide'}
                  </button>
                  <button
                    onClick={() => removeModule(module.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {orderedModules.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No modules added</p>
          )}
        </div>
      </div>

      {availableModules.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Available Modules</h3>
          <div className="grid grid-cols-2 gap-2">
            {availableModules.map((module) => (
              <button
                key={module.id}
                onClick={() => addModule(module.id)}
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-md hover:bg-gray-50 text-left"
              >
                <span>{module.icon}</span>
                <span className="text-sm text-gray-700">{module.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CapabilitiesBuilder({
  capabilities,
  overrides,
  onChange,
}: {
  capabilities: Capability[];
  overrides: Record<string, any>;
  onChange: (overrides: Record<string, any>) => void;
}) {
  const updateOverride = (capabilityId: string, status: string) => {
    const newOverrides = { ...overrides };
    if (status === 'stable' || !status) {
      delete newOverrides[capabilityId];
    } else {
      newOverrides[capabilityId] = { status, reason: newOverrides[capabilityId]?.reason || null };
    }
    onChange(newOverrides);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <p className="text-sm text-gray-600">
        Override capability status for this panel. Changes apply only to users assigned this panel.
      </p>
      <div className="space-y-2">
        {capabilities.map((cap) => {
          const override = overrides[cap.id];
          const currentStatus = override?.status || cap.status;
          return (
            <div key={cap.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
              <div>
                <div className="text-sm font-medium text-gray-900">{cap.name}</div>
                <div className="text-xs text-gray-500">{cap.id}</div>
              </div>
              <select
                value={currentStatus}
                onChange={(e) => updateOverride(cap.id, e.target.value)}
                className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="stable">Stable</option>
                <option value="degraded">Degraded</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PermissionsBuilder({
  permissions,
  selected,
  onChange,
}: {
  permissions: string[];
  selected: string[];
  onChange: (permissions: string[]) => void;
}) {
  const togglePermission = (permission: string) => {
    if (selected.includes(permission)) {
      onChange(selected.filter(p => p !== permission));
    } else {
      onChange([...selected, permission]);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const [category] = perm.split(':');
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <p className="text-sm text-gray-600">
        Select permissions granted by this panel. Users assigned this panel will have these permissions.
      </p>
      <div className="max-h-96 overflow-y-auto space-y-4">
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">{category}</h4>
            <div className="space-y-1">
              {perms.map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{perm}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelPreview({
  panel,
  mode,
}: {
  panel: Panel;
  mode: 'light' | 'dark';
}) {
  const bgColor = mode === 'dark' ? '#1f2937' : '#f9fafb';
  const textColor = mode === 'dark' ? '#f9fafb' : '#111827';
  const sidebarBg = mode === 'dark' ? '#111827' : '#ffffff';
  const borderColor = mode === 'dark' ? '#374151' : '#e5e7eb';

  const visibleModules = panel.navigationConfig.modules.filter(
    id => !panel.navigationConfig.hidden.includes(id)
  );

  const orderedModules = panel.navigationConfig.order.length > 0
    ? panel.navigationConfig.order.filter(id => visibleModules.includes(id))
    : visibleModules;

  return (
    <div className="bg-white rounded-lg shadow p-4 sticky top-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Live Preview</h3>
      <div
        className="rounded-lg border-2 overflow-hidden"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          minHeight: '500px',
        }}
      >
        {/* Sidebar Preview */}
        <div className="flex">
          <div
            className="w-64 p-4 border-r"
            style={{
              backgroundColor: sidebarBg,
              borderColor: borderColor,
              color: textColor,
            }}
          >
            <div className="mb-4">
              <div
                className="h-8 rounded"
                style={{ backgroundColor: panel.themeConfig.primaryColor }}
              />
            </div>
            <div className="space-y-1">
              {orderedModules.map((moduleId) => {
                const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
                if (!module) return null;
                return (
                  <div
                    key={moduleId}
                    className="flex items-center gap-2 px-3 py-2 rounded text-sm"
                    style={{
                      backgroundColor: moduleId === 'dashboard' ? panel.themeConfig.primaryColor + '20' : 'transparent',
                      color: textColor,
                    }}
                  >
                    <span>{module.icon}</span>
                    <span>{module.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content Preview */}
          <div className="flex-1 p-4" style={{ color: textColor }}>
            <div
              className="h-12 rounded mb-4"
              style={{ backgroundColor: panel.themeConfig.primaryColor }}
            />
            <div className="space-y-3">
              <div className="h-4 rounded w-3/4" style={{ backgroundColor: borderColor }} />
              <div className="h-4 rounded w-1/2" style={{ backgroundColor: borderColor }} />
              <div className="h-32 rounded mt-4" style={{ backgroundColor: borderColor }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

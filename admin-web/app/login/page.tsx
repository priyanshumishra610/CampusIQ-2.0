'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, isDevMode, Panel } from '@/lib/auth';
import { usePanel } from '@/lib/panelContext';
import { AlertCircle, Loader2, Code } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAvailablePanels, setCurrentPanel } = usePanel();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPanelSelection, setShowPanelSelection] = useState(false);
  const [availablePanels, setAvailablePanelsState] = useState<Panel[]>([]);

  // Auto-redirect in dev mode
  useEffect(() => {
    if (isDevMode()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      
      if (response.success) {
        // Check if user is super admin
        if (response.data.user.isSuperAdmin) {
          // Initialize panels
          const panels = response.data.user.panels || [];
          setAvailablePanels(panels);
          setAvailablePanelsState(panels);
          
          // If user has panels, show selection
          if (panels.length > 1) {
            setShowPanelSelection(true);
          } else if (panels.length === 1) {
            // Single panel - use it
            setCurrentPanel(panels[0]);
            router.push('/dashboard');
          } else if (response.data.user.defaultPanel) {
            // Use default panel
            setCurrentPanel(response.data.user.defaultPanel);
            router.push('/dashboard');
          } else {
            // No panels - proceed to dashboard
            router.push('/dashboard');
          }
        } else {
          setError('Super admin access required');
          // Clear token if not super admin
          const { logout } = await import('@/lib/auth');
          logout();
        }
      } else {
        setError(response.error?.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            CampusIQ Admin Console
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Super Admin Login
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {isDevMode() && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-yellow-300 text-sm font-medium rounded-md text-yellow-800 bg-yellow-50 hover:bg-yellow-100"
              >
                <Code className="h-4 w-4" />
                Dev Mode: Skip Login
              </button>
              <p className="mt-2 text-xs text-center text-gray-500">
                Development mode active - authentication bypassed
              </p>
            </div>
          )}
        </form>

        {showPanelSelection && (
          <PanelSelectionModal
            panels={availablePanels}
            onSelect={(panel) => {
              setCurrentPanel(panel);
              setShowPanelSelection(false);
              router.push('/dashboard');
            }}
            onClose={() => {
              // Use default or first panel
              const defaultPanel = availablePanels.find(p => p.isDefault) || availablePanels[0];
              if (defaultPanel) {
                setCurrentPanel(defaultPanel);
              }
              setShowPanelSelection(false);
              router.push('/dashboard');
            }}
          />
        )}
      </div>
    </div>
  );
}

function PanelSelectionModal({
  panels,
  onSelect,
  onClose,
}: {
  panels: Panel[];
  onSelect: (panel: Panel) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Select Panel</h2>
          <p className="text-sm text-gray-600 mb-4">
            Choose a workspace panel to use:
          </p>
          <div className="space-y-2">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => onSelect(panel)}
                className="w-full text-left p-4 border border-gray-200 rounded-md hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{panel.name}</div>
                    {panel.description && (
                      <div className="text-sm text-gray-500 mt-1">{panel.description}</div>
                    )}
                  </div>
                  {panel.isDefault && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Default</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Use Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

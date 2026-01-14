'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isDevMode } from '@/lib/auth';
import { usePanel } from '@/lib/panelContext';
import api from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const { setAvailablePanels, setCurrentPanel } = usePanel();

  useEffect(() => {
    const initializePanels = async () => {
      // In dev mode, use mock panel
      if (isDevMode()) {
        const mockPanel = {
          id: 'dev-panel',
          name: 'Dev Panel',
          themeConfig: {
            primaryColor: '#0ea5e9',
            secondaryColor: '#64748b',
            mode: 'light' as const,
          },
          navigationConfig: {
            modules: ['dashboard', 'roles', 'panels', 'capabilities', 'audit-logs'],
            order: ['dashboard', 'roles', 'panels', 'capabilities', 'audit-logs'],
            hidden: [],
          },
          isDefault: true,
        };
        setAvailablePanels([mockPanel]);
        setCurrentPanel(mockPanel);
        router.push('/dashboard');
        return;
      }

      // If authenticated, try to load user panels
      if (isAuthenticated()) {
        try {
          // Get user info (which includes panels)
          const response = await api.get('/auth/me');
          const user = response.data.data;
          
          if (user.panels && user.panels.length > 0) {
            setAvailablePanels(user.panels);
            if (user.defaultPanel) {
              setCurrentPanel(user.defaultPanel);
            } else if (user.panels.length === 1) {
              setCurrentPanel(user.panels[0]);
            }
          }
        } catch (error) {
          console.error('Failed to load panels:', error);
        }
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    };

    initializePanels();
  }, [router, setAvailablePanels, setCurrentPanel]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

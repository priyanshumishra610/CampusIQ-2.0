'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { logout, isAuthenticated, isDevMode } from '@/lib/auth';
import { usePanel } from '@/lib/panelContext';
import { 
  LayoutDashboard, 
  Shield, 
  Settings, 
  FileText, 
  LogOut,
  Menu,
  X,
  Layout as LayoutIcon
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentPanel } = usePanel();

  useEffect(() => {
    const { isDevMode } = require('@/lib/auth');
    if (!isAuthenticated() && !isDevMode()) {
      router.push('/login');
    }
  }, [router]);

  // Get navigation from panel or use default
  const getNavigation = () => {
    if (currentPanel?.navigationConfig) {
      const config = currentPanel.navigationConfig;
      const allNavItems = [
        { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { id: 'roles', name: 'Roles', href: '/roles', icon: Shield },
        { id: 'panels', name: 'Panels', href: '/panels', icon: LayoutIcon },
        { id: 'capabilities', name: 'Capabilities', href: '/capabilities', icon: Settings },
        { id: 'audit-logs', name: 'Audit Logs', href: '/audit-logs', icon: FileText },
      ];

      // Filter by panel's modules and order
      const visibleModules = config.modules.filter(id => !config.hidden.includes(id));
      const ordered = config.order.length > 0
        ? config.order.filter(id => visibleModules.includes(id))
        : visibleModules;

      return ordered
        .map(id => allNavItems.find(item => item.id === id))
        .filter(Boolean) as typeof allNavItems;
    }

    // Default navigation
    return [
      { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { id: 'roles', name: 'Roles', href: '/roles', icon: Shield },
      { id: 'panels', name: 'Panels', href: '/panels', icon: LayoutIcon },
      { id: 'capabilities', name: 'Capabilities', href: '/capabilities', icon: Settings },
      { id: 'audit-logs', name: 'Audit Logs', href: '/audit-logs', icon: FileText },
    ];
  };

  const navigation = getNavigation();
  
  // Get theme from panel
  const theme = currentPanel?.themeConfig || {
    primaryColor: '#0ea5e9',
    secondaryColor: '#64748b',
    mode: 'light' as const,
  };

  const handleLogout = () => {
    logout();
  };

  if (!isAuthenticated() && !isDevMode()) {
    return null;
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundColor: theme.mode === 'dark' ? '#111827' : '#f9fafb',
      }}
    >
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div 
          className="fixed inset-y-0 left-0 flex w-64 flex-col"
          style={{
            backgroundColor: theme.mode === 'dark' ? '#1f2937' : '#ffffff',
          }}
        >
          <div 
            className="flex h-16 items-center justify-between px-4 border-b"
            style={{
              borderColor: theme.mode === 'dark' ? '#374151' : '#e5e7eb',
            }}
          >
            <h1 
              className="text-xl font-bold"
              style={{ color: theme.mode === 'dark' ? '#f9fafb' : '#111827' }}
            >
              CampusIQ Admin
            </h1>
            <button 
              onClick={() => setSidebarOpen(false)}
              style={{ color: theme.mode === 'dark' ? '#9ca3af' : '#6b7280' }}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium"
                  style={{
                    backgroundColor: isActive ? theme.primaryColor + '20' : 'transparent',
                    color: isActive ? theme.primaryColor : (theme.mode === 'dark' ? '#d1d5db' : '#374151'),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = theme.mode === 'dark' ? '#374151' : '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t p-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div 
          className="flex flex-col flex-grow border-r"
          style={{
            backgroundColor: theme.mode === 'dark' ? '#1f2937' : '#ffffff',
            borderColor: theme.mode === 'dark' ? '#374151' : '#e5e7eb',
          }}
        >
          <div 
            className="flex h-16 items-center px-4 border-b"
            style={{
              borderColor: theme.mode === 'dark' ? '#374151' : '#e5e7eb',
            }}
          >
            <h1 
              className="text-xl font-bold"
              style={{ color: theme.mode === 'dark' ? '#f9fafb' : '#111827' }}
            >
              CampusIQ Admin
            </h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t p-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div 
          className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-4 lg:px-8"
          style={{
            backgroundColor: theme.mode === 'dark' ? '#1f2937' : '#ffffff',
            borderColor: theme.mode === 'dark' ? '#374151' : '#e5e7eb',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
          <h2 
            className="text-lg font-semibold"
            style={{ color: theme.mode === 'dark' ? '#f9fafb' : '#111827' }}
          >
            {navigation.find(n => n.href === pathname)?.name || 'Admin Console'}
          </h2>
            {isDevMode() && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                DEV MODE
              </span>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

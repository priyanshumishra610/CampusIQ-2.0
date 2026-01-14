'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Shield, 
  Settings, 
  FileText, 
  LogOut,
  Layout as LayoutIcon,
  Menu,
  X,
  Users,
  Building2,
  Calendar,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { isAuthenticated, isDevMode, logout } from '@/lib/auth';
import { usePanel } from '@/lib/panelContext';
import { resolvePanelNavigation } from '@/lib/panelResolver';
import { AppShell, Sidebar, Topbar, type SidebarItem } from '@/ui-system/layout';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentPanel } = usePanel();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  useEffect(() => {
    if (!isAuthenticated() && !isDevMode()) {
      router.push('/login');
    }
  }, [router]);

  // Map icon strings to Lucide icons
  const iconMap: Record<string, any> = {
    LayoutDashboard,
    Shield,
    Settings,
    FileText,
    Layout: LayoutIcon,
    Users,
    Building2,
    Calendar,
    DollarSign,
    BarChart3,
    Clock: Calendar, // Use Calendar for Clock icon
  };

  // Get navigation items
  const panelNav = resolvePanelNavigation(currentPanel);
  const sidebarItems: SidebarItem[] = panelNav.map(item => ({
    id: item.id,
    name: item.name,
    href: item.href,
    icon: iconMap[item.icon] || LayoutDashboard,
    badge: item.badge,
    disabled: item.disabled,
  }));

  const handleLogout = () => {
    logout();
  };

  if (!isAuthenticated() && !isDevMode()) {
    return null;
  }

  // Don't show layout on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <AppShell
      sidebar={
        <>
          {/* Mobile sidebar */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div 
                className="fixed inset-0 bg-black/50" 
                onClick={() => setSidebarOpen(false)} 
              />
              <div className="fixed inset-y-0 left-0 w-64 bg-background border-r">
                <Sidebar
                  items={sidebarItems}
                  header={
                    <div className="flex items-center justify-between w-full">
                      <h1 className="text-xl font-bold">CampusIQ</h1>
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-1 rounded-md hover:bg-muted"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  }
                  footer={
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <LogOut className="h-5 w-5" />
                      Logout
                    </button>
                  }
                />
              </div>
            </div>
          )}

          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <Sidebar
              items={sidebarItems}
              header={
                <h1 className="text-xl font-bold">CampusIQ</h1>
              }
              footer={
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              }
            />
          </div>
        </>
      }
      topbar={
        <Topbar
          title={sidebarItems.find(item => item.href === pathname)?.name || 'Dashboard'}
          actions={
            <>
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-muted"
              >
                <Menu className="h-5 w-5" />
              </button>
              {isDevMode() && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700">
                  DEV MODE
                </span>
              )}
            </>
          }
        />
      }
    >
      <div className="p-6">
        {children}
      </div>
    </AppShell>
  );
}

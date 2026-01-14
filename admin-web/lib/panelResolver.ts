/**
 * PanelResolver - Panel configuration and theme management
 * 
 * Handles panel loading, theme application, and capability checks
 */

import { Panel } from './auth';

export interface PanelNavigationItem {
  id: string;
  name: string;
  href: string;
  icon: string;
  badge?: number;
  disabled?: boolean;
}

export interface PanelTheme {
  primaryColor: string;
  secondaryColor: string;
  mode: 'light' | 'dark';
  logoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
}

/**
 * Resolve panel navigation from panel config
 */
export function resolvePanelNavigation(panel: Panel | null): PanelNavigationItem[] {
  if (!panel?.navigationConfig) {
    return getDefaultNavigation();
  }

  const config = panel.navigationConfig;
  const allNavItems = getDefaultNavigation();

  // Filter by panel's modules and order
  const visibleModules = config.modules.filter(id => !config.hidden.includes(id));
  const ordered = config.order.length > 0
    ? config.order.filter(id => visibleModules.includes(id))
    : visibleModules;

  return ordered
    .map(id => allNavItems.find(item => item.id === id))
    .filter(Boolean) as PanelNavigationItem[];
}

/**
 * Get default navigation items
 * Supports both Super Admin and HR panel navigation
 */
function getDefaultNavigation(): PanelNavigationItem[] {
  // Super Admin navigation
  const superAdminNav = [
    { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { id: 'roles', name: 'Roles', href: '/roles', icon: 'Shield' },
    { id: 'panels', name: 'Panels', href: '/panels', icon: 'Layout' },
    { id: 'capabilities', name: 'Capabilities', href: '/capabilities', icon: 'Settings' },
    { id: 'audit-logs', name: 'Audit Logs', href: '/audit-logs', icon: 'FileText' },
  ];

  // HR navigation
  const hrNav = [
    { id: 'hr-dashboard', name: 'Dashboard', href: '/hr/dashboard', icon: 'LayoutDashboard' },
    { id: 'hr-employees', name: 'Employees', href: '/hr/employees', icon: 'Users' },
    { id: 'hr-attendance', name: 'Attendance', href: '/hr/attendance', icon: 'Calendar' },
    { id: 'hr-payroll', name: 'Payroll', href: '/hr/payroll', icon: 'DollarSign' },
    { id: 'hr-timesheet', name: 'Timesheet', href: '/hr/timesheet', icon: 'Clock' },
    { id: 'hr-reports', name: 'Reports', href: '/hr/reports', icon: 'BarChart3' },
  ];

  // Return super admin by default, but panel config will filter
  return [...superAdminNav, ...hrNav];
}

/**
 * Apply panel theme to document
 */
export function applyPanelTheme(panel: Panel | null) {
  if (!panel?.themeConfig) {
    resetTheme();
    return;
  }

  const theme = panel.themeConfig;
  
  // Apply theme mode
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.mode);
  
  // Apply primary color
  if (theme.primaryColor) {
    const rgb = hexToRgb(theme.primaryColor);
    if (rgb) {
      root.style.setProperty('--panel-primary', `${rgb.r} ${rgb.g} ${rgb.b}`);
    }
  }
  
  // Apply secondary color
  if (theme.secondaryColor) {
    const rgb = hexToRgb(theme.secondaryColor);
    if (rgb) {
      root.style.setProperty('--panel-secondary', `${rgb.r} ${rgb.g} ${rgb.b}`);
    }
  }
  
  // Apply custom CSS
  if (theme.customCss) {
    let styleElement = document.getElementById('panel-custom-css');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'panel-custom-css';
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = theme.customCss;
  }
  
  // Apply favicon
  if (theme.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = theme.faviconUrl;
  }
}

/**
 * Reset theme to defaults
 */
export function resetTheme() {
  const root = document.documentElement;
  root.setAttribute('data-theme', 'light');
  root.style.removeProperty('--panel-primary');
  root.style.removeProperty('--panel-secondary');
  
  const styleElement = document.getElementById('panel-custom-css');
  if (styleElement) {
    styleElement.remove();
  }
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Check if capability is available for panel
 */
export function isCapabilityAvailable(
  panel: Panel | null,
  capabilityId: string
): boolean {
  if (!panel?.capabilityOverrides) {
    return true; // Default to available if no overrides
  }
  
  const override = panel.capabilityOverrides[capabilityId];
  return override !== 'disabled';
}

/**
 * Get capability status for panel
 */
export function getCapabilityStatus(
  panel: Panel | null,
  capabilityId: string
): 'stable' | 'degraded' | 'disabled' {
  if (!panel?.capabilityOverrides) {
    return 'stable';
  }
  
  const override = panel.capabilityOverrides[capabilityId];
  return override || 'stable';
}

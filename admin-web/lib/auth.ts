/**
 * Authentication utilities
 */

import Cookies from 'js-cookie';
import api from './api';

export interface Panel {
  id: string;
  name: string;
  description?: string;
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
  capabilityOverrides?: Record<string, 'stable' | 'degraded' | 'disabled'>;
  isDefault: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  panels?: Panel[];
  defaultPanel?: Panel | null;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post('/auth/login', { email, password });
  const data = response.data;
  
  if (data.success && data.data.token) {
    // Store token in cookie (httpOnly would be better but requires server-side)
    Cookies.set('auth_token', data.data.token, { expires: 7 }); // 7 days
  }
  
  return data;
}

export function logout() {
  Cookies.remove('auth_token');
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export function getToken(): string | undefined {
  return Cookies.get('auth_token');
}

export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development' || 
         (typeof window !== 'undefined' && window.location.search.includes('dev=true'));
}

export function isAuthenticated(): boolean {
  // In dev mode, always return true to bypass auth
  if (isDevMode()) {
    return true;
  }
  return !!getToken();
}

export function getDevUser(): User {
  // Mock user for dev mode
  return {
    id: 'dev-user-123',
    email: 'dev@campusiq.edu',
    name: 'Dev User',
    role: 'ADMIN',
    isSuperAdmin: true,
  };
}

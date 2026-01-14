/**
 * CampusIQ Color Semantics
 * 
 * Semantic color tokens for state communication
 * - success: Positive outcomes, completed states
 * - warning: Attention needed, caution
 * - danger: Errors, critical issues, destructive actions
 * - info: Informational, neutral guidance
 * - muted: Secondary, disabled, subtle
 */

export const colorSemantics = {
  success: {
    light: {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#166534',
      icon: '#22c55e',
    },
    dark: {
      bg: '#14532d',
      border: '#22c55e',
      text: '#86efac',
      icon: '#4ade80',
    },
  },
  warning: {
    light: {
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#92400e',
      icon: '#f59e0b',
    },
    dark: {
      bg: '#78350f',
      border: '#f59e0b',
      text: '#fcd34d',
      icon: '#fbbf24',
    },
  },
  danger: {
    light: {
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#991b1b',
      icon: '#ef4444',
    },
    dark: {
      bg: '#7f1d1d',
      border: '#ef4444',
      text: '#fca5a5',
      icon: '#f87171',
    },
  },
  info: {
    light: {
      bg: '#eff6ff',
      border: '#bfdbfe',
      text: '#1e40af',
      icon: '#3b82f6',
    },
    dark: {
      bg: '#1e3a8a',
      border: '#3b82f6',
      text: '#93c5fd',
      icon: '#60a5fa',
    },
  },
  muted: {
    light: {
      bg: '#f9fafb',
      border: '#e5e7eb',
      text: '#6b7280',
      icon: '#9ca3af',
    },
    dark: {
      bg: '#1f2937',
      border: '#374151',
      text: '#9ca3af',
      icon: '#6b7280',
    },
  },
} as const;

/**
 * Get semantic color for current theme mode
 */
export const getSemanticColor = (
  semantic: keyof typeof colorSemantics,
  mode: 'light' | 'dark',
  variant: 'bg' | 'border' | 'text' | 'icon'
) => {
  return colorSemantics[semantic][mode][variant];
};

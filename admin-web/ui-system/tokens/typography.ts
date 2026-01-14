/**
 * CampusIQ Typography Scale
 * 
 * Semantic typography tokens for clear information hierarchy
 * - Heading: Section titles, page headers
 * - Label: Form labels, field names
 * - Meta: Timestamps, secondary info
 * - Data: Numbers, metrics, KPIs
 */

export const typography = {
  // Headings
  heading: {
    h1: {
      fontSize: '2rem',      // 32px
      lineHeight: '2.5rem',  // 40px
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.5rem',    // 24px
      lineHeight: '2rem',    // 32px
      fontWeight: '600',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.25rem',   // 20px
      lineHeight: '1.75rem', // 28px
      fontWeight: '600',
    },
    h4: {
      fontSize: '1.125rem',  // 18px
      lineHeight: '1.5rem',  // 24px
      fontWeight: '600',
    },
  },
  
  // Labels
  label: {
    default: {
      fontSize: '0.875rem',  // 14px
      lineHeight: '1.25rem', // 20px
      fontWeight: '500',
    },
    small: {
      fontSize: '0.75rem',   // 12px
      lineHeight: '1rem',    // 16px
      fontWeight: '500',
    },
  },
  
  // Meta (secondary information)
  meta: {
    default: {
      fontSize: '0.875rem',  // 14px
      lineHeight: '1.25rem', // 20px
      fontWeight: '400',
      color: 'var(--color-muted-foreground)',
    },
    small: {
      fontSize: '0.75rem',   // 12px
      lineHeight: '1rem',    // 16px
      fontWeight: '400',
      color: 'var(--color-muted-foreground)',
    },
  },
  
  // Data (numbers, metrics)
  data: {
    large: {
      fontSize: '2.5rem',    // 40px
      lineHeight: '3rem',     // 48px
      fontWeight: '700',
      fontVariantNumeric: 'tabular-nums',
    },
    medium: {
      fontSize: '1.5rem',    // 24px
      lineHeight: '2rem',     // 32px
      fontWeight: '600',
      fontVariantNumeric: 'tabular-nums',
    },
    small: {
      fontSize: '1.125rem',  // 18px
      lineHeight: '1.5rem',   // 24px
      fontWeight: '600',
      fontVariantNumeric: 'tabular-nums',
    },
  },
  
  // Body text
  body: {
    default: {
      fontSize: '1rem',      // 16px
      lineHeight: '1.5rem',  // 24px
      fontWeight: '400',
    },
    small: {
      fontSize: '0.875rem',  // 14px
      lineHeight: '1.25rem', // 20px
      fontWeight: '400',
    },
  },
} as const;

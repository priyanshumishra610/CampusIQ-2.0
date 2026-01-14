# CampusIQ UI System

Enterprise-grade UX system for panel-based administration.

## Philosophy

1. **Build a UX SYSTEM first, not isolated screens**
2. **UI must communicate**: State, Risk, Progress, Ownership
3. **Every panel must feel like a PRODUCT, not a menu**
4. **Information hierarchy > colors > animations**

## Structure

```
ui-system/
├── tokens/          # Design tokens (spacing, typography, colors)
├── layout/          # Layout primitives (AppShell, Sidebar, Topbar, etc.)
├── cards/           # Dashboard card patterns (KPI, Progress, Risk, etc.)
├── states/          # UX state components (Empty, Loading, StatusBadge)
└── index.ts         # Public API
```

## Design Tokens

### Spacing Scale
- `xs` → `4xl` (4px → 64px)
- Density-aware: `comfortable` (default) and `compact` (25% reduction)

### Typography
- **Headings**: `h1` → `h4` (32px → 18px)
- **Labels**: Form labels, field names
- **Meta**: Timestamps, secondary info
- **Data**: Numbers, metrics, KPIs (tabular-nums)

### Color Semantics
- `success`: Positive outcomes
- `warning`: Attention needed
- `danger`: Errors, critical issues
- `info`: Informational
- `muted`: Secondary, disabled

## Layout Primitives

### AppShell
Root layout container with sidebar and topbar support.

```tsx
<AppShell
  sidebar={<Sidebar items={navItems} />}
  topbar={<Topbar title="Dashboard" />}
>
  {children}
</AppShell>
```

### Sidebar
Dynamic navigation sidebar with active state highlighting.

### Topbar
Page header with title, breadcrumbs, and actions.

### ContentGrid
Responsive grid layout (1-4 columns, auto-responsive).

### Card
Base card component with hover states.

### SectionHeader
Section title with optional description and actions.

## Dashboard Cards

### KPICard
Key Performance Indicator with trend and status.

```tsx
<KPICard
  title="Total Users"
  value={1234}
  trend={{ value: 5.2, period: 'vs last month' }}
  status="positive"
  icon={Users}
/>
```

### ProgressCard
Progress tracking with milestones.

### RiskCard
At-risk items with severity indicators.

### TimelineCard
Activity feed with audit context.

### SummaryCard
High-level overview with drilldown pattern.

## UX States

### Empty
Empty state with actionable guidance.

### Loading
Loading indicators with optional text.

### StatusBadge
Visual status indicator (healthy, at-risk, blocked, degraded, info).

## Panel-Based Architecture

### PanelResolver
- Resolves panel navigation from config
- Applies panel themes dynamically
- Checks capability availability

### Theme System
- CSS variables for panel-based theming
- Light/dark mode support
- Custom CSS injection per panel

## Usage Example

```tsx
import { 
  AppShell, 
  Sidebar, 
  Topbar, 
  ContentGrid,
  KPICard,
  StatusBadge 
} from '@/ui-system';

export default function Dashboard() {
  return (
    <AppShell
      sidebar={<Sidebar items={navItems} />}
      topbar={<Topbar title="Dashboard" />}
    >
      <ContentGrid cols={3}>
        <KPICard title="Users" value={1234} />
        <KPICard title="Revenue" value="$50k" />
      </ContentGrid>
    </AppShell>
  );
}
```

## Best Practices

1. **Always use semantic components** - Don't build custom cards when KPI/Progress/Risk cards exist
2. **Communicate state clearly** - Use StatusBadge for health indicators
3. **Support drilldown** - Summary cards should navigate to detailed views
4. **Respect density modes** - Use `density-compact` class for admin-heavy views
5. **Panel-aware** - Components automatically adapt to panel theme

## Quality Bar

- Match KEKA-level clarity, not visual noise
- Calm, professional, enterprise look
- Intentional white space
- Icons only when meaningful
- Every screen answers: What is the current state? What needs attention? What can I act on?

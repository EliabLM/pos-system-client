# DashboardHeader Visual Reference

This document provides visual layout references for the DashboardHeader component across different screen sizes.

## Desktop Layout (≥1024px)

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ┌──────┐                                                            │
│  │  📊  │  Dashboard                                                 │
│  └──────┘                                                            │
│                                                                        │
│  Inicio / Dashboard                                                   │
│                                                                        │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                        │
│  Tienda: [Tienda Principal ▼]  🔄  Actualizado hace 2 minutos        │
│                                                           [+ Nueva Venta] [📊 Ver Reportes]
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Layout Structure:**
- **Row 1**: Icon + Title (large)
- **Row 2**: Breadcrumb navigation
- **Row 3**: Horizontal line separator
- **Row 4**: Left (Filters) | Right (Quick Actions)

## Tablet Layout (640px - 1023px)

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌──────┐                                  │
│  │  📊  │  Dashboard                       │
│  └──────┘                                  │
│                                             │
│  Inicio / Dashboard                        │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Tienda: [Tienda Principal ▼]  🔄          │
│  Actualizado hace 2 minutos                │
│                                             │
│  [+ Nueva Venta]  [📊 Ver Reportes]       │
│                                             │
└─────────────────────────────────────────────┘
```

**Layout Changes:**
- Filters and actions wrap to separate rows
- Full button labels visible
- Timestamp on separate line

## Mobile Layout (<640px)

```
┌─────────────────────────────┐
│                             │
│  ┌──────┐                  │
│  │  📊  │  Dashboard       │
│  └──────┘                  │
│                             │
│  Inicio / Dashboard         │
│                             │
│  ───────────────────────────│
│                             │
│  Tienda: [Tienda Princ... ▼]│
│                             │
│  🔄                         │
│                             │
│  Actualizado hace 2 min     │
│                             │
│  [+ Venta]                  │
│  [📊 Reportes]              │
│                             │
└─────────────────────────────┘
```

**Layout Changes:**
- Stacked vertical layout
- Shortened button labels ("Venta", "Reportes")
- Full-width elements
- Refresh button separate
- Timestamp abbreviated

## Component Anatomy

### 1. Title Section

```
┌──────┐
│  📊  │  Dashboard
└──────┘
```

- **Icon Container**: 48x48px, rounded-lg, primary/10 background
- **Icon**: IconDashboard, 24x24px, primary color
- **Title**: text-3xl (mobile) to text-4xl (desktop), font-bold

### 2. Breadcrumb

```
Inicio / Dashboard
```

- Uses shadcn/ui Breadcrumb component
- Links: hover:text-foreground transition
- Current page: text-foreground font-normal
- Separator: ChevronRight icon

### 3. Store Selector

```
Tienda: [Tienda Principal ▼]
```

- **Label**: text-sm, font-medium, text-muted-foreground
- **Select**: w-[200px], shadcn/ui Select component
- **States**:
  - Loading: Skeleton (h-9 w-[200px])
  - Hidden: When user has only one store
  - Visible: When user has multiple stores

### 4. Refresh Button

```
🔄
```

- **Variant**: outline
- **Size**: icon (36x36px)
- **States**:
  - Default: Static IconRefresh
  - Loading: Spinning IconRefresh with `animate-spin`
  - Disabled: opacity-50, cursor-not-allowed

### 5. Last Updated Timestamp

```
Actualizado hace 2 minutos
```

- **Text**: text-sm, text-muted-foreground
- **Format**: "Actualizado {relativeTime}" in Spanish
- **Updates**: Every 60 seconds via setInterval
- **Library**: date-fns with Spanish locale

### 6. Quick Action Buttons

#### New Sale (Primary)

```
[+ Nueva Venta]
```

- **Variant**: default (primary)
- **Icon**: IconPlus (16x16px)
- **Link**: /dashboard/sales/new
- **Responsive Text**:
  - Mobile: "Venta"
  - Desktop: "Nueva Venta"

#### View Reports (Secondary)

```
[📊 Ver Reportes]
```

- **Variant**: outline
- **Icon**: IconFileAnalytics (16x16px)
- **Link**: /dashboard/reports
- **Responsive Text**:
  - Mobile: "Reportes"
  - Desktop: "Ver Reportes"

## Color Scheme

### Light Mode

- **Icon Background**: primary/10 (light blue-ish)
- **Icon Color**: primary
- **Title**: foreground
- **Breadcrumb Links**: muted-foreground → foreground (hover)
- **Buttons**:
  - Primary: bg-primary, text-primary-foreground
  - Outline: border, bg-background, hover:bg-accent

### Dark Mode

- **Icon Background**: primary/10 (darker)
- **Icon Color**: primary
- **Title**: foreground (lighter)
- **All colors**: Automatically adjusted via CSS variables

## Spacing

```
Component Spacing (Tailwind units):

├─ Container padding-bottom: 4 (1rem)
├─ Container margin-bottom: 6 (1.5rem)
├─ Title section gap: 2 (0.5rem)
│  ├─ Icon-Title gap: 3 (0.75rem)
│  └─ Title-Breadcrumb gap: 2 (0.5rem)
├─ Filters/Actions section gap: 4 (1rem)
│  ├─ Filter items gap: 3 (0.75rem)
│  └─ Action buttons gap: 2 (0.5rem)
└─ Border-bottom: 1px solid border
```

## Accessibility Features

### ARIA Labels

```tsx
// Refresh button
aria-label="Actualizar datos del dashboard"

// Store selector
aria-label="Seleccionar tienda"

// Buttons (automatically from Link children)
// - "Nueva Venta"
// - "Ver Reportes"
```

### Keyboard Navigation

```
Tab Order:
1. Breadcrumb "Inicio" link
2. Store selector (if visible)
3. Refresh button
4. Nueva Venta button
5. Ver Reportes button

Enter/Space:
- Activates buttons and links
- Opens store selector dropdown

Escape:
- Closes store selector dropdown
```

### Screen Reader Announcements

```
"Dashboard, heading level 1"
"Navigation, breadcrumb"
"Inicio, link"
"Dashboard, current page"
"Seleccionar tienda, combo box"
"Actualizar datos del dashboard, button"
"Actualizado hace 2 minutos"
"Nueva Venta, link"
"Ver Reportes, link"
```

## State Variations

### 1. Loading State (Stores)

```
Tienda: [░░░░░░░░░░░░░░]  🔄  Actualizado hace 2 minutos
        (Skeleton loader)
```

### 2. Refreshing State

```
Tienda: [Tienda Principal ▼]  ⟳  Actualizado hace 2 minutos
                              (Spinning icon)
```

### 3. Single Store (Hidden Selector)

```
🔄  Actualizado hace 2 minutos
(No store selector shown)
```

### 4. Multiple Stores (Visible Selector)

```
Tienda: [Tienda Principal ▼]  🔄  Actualizado hace 2 minutos
```

### 5. No Timestamp

```
Tienda: [Tienda Principal ▼]  🔄
```

### 6. No Refresh Callback

```
Tienda: [Tienda Principal ▼]  Actualizado hace 2 minutos
(No refresh button shown)
```

## Integration Examples

### With Dashboard Page

```tsx
// src/app/dashboard/page.tsx

import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function DashboardPage() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <DashboardHeader
        onRefresh={async () => {
          // Refresh logic
          setLastUpdated(new Date());
        }}
        lastUpdated={lastUpdated}
      />

      {/* Dashboard content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI Cards */}
      </div>
    </div>
  );
}
```

### With React Query

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['dashboard']
    });
    setLastUpdated(new Date());
  };

  return (
    <DashboardHeader
      onRefresh={handleRefresh}
      lastUpdated={lastUpdated}
    />
  );
}
```

## Browser Compatibility

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
✅ Mobile Safari (iOS 14+)
✅ Chrome Mobile (Android 90+)

## Performance Considerations

- **Timestamp updates**: Uses setInterval with cleanup
- **Store fetching**: Cached by React Query (5 min stale time)
- **Refresh animation**: CSS-based, hardware accelerated
- **Responsive classes**: No JavaScript, pure CSS
- **Component re-renders**: Optimized with proper dependencies

## Future Enhancements

### Phase 1: Store Persistence
```
┌─ Zustand Store Extension
│  ├─ Add storeId state
│  ├─ Add setStoreId action
│  └─ Persist in sessionStorage
└─ Update header to use store action
```

### Phase 2: Advanced Filters
```
┌─ Date Range Picker
│  ├─ Predefined ranges
│  ├─ Custom date selection
│  └─ Period comparison
└─ Additional filters
   ├─ Payment method
   ├─ Customer type
   └─ Product category
```

### Phase 3: Notifications
```
┌─ Notification Badge
│  ├─ Pending tasks count
│  ├─ Low stock alerts
│  └─ System messages
└─ Popover with details
```

## Testing Scenarios

### Manual Testing

1. **Responsive Testing**:
   - [ ] View on 320px (small mobile)
   - [ ] View on 375px (iPhone)
   - [ ] View on 768px (tablet)
   - [ ] View on 1024px (laptop)
   - [ ] View on 1920px (desktop)

2. **Store Selector**:
   - [ ] Single store: selector hidden
   - [ ] Multiple stores: selector visible
   - [ ] Loading state: skeleton shown
   - [ ] Selection: updates local state

3. **Refresh Button**:
   - [ ] Click: triggers onRefresh
   - [ ] Loading: shows spin animation
   - [ ] Disabled during refresh
   - [ ] Tooltip appears on hover

4. **Timestamp**:
   - [ ] Updates every minute
   - [ ] Shows correct relative time
   - [ ] Spanish locale format
   - [ ] Handles missing prop

5. **Quick Actions**:
   - [ ] New Sale: navigates to /dashboard/sales/new
   - [ ] Reports: navigates to /dashboard/reports
   - [ ] Mobile: shortened labels
   - [ ] Desktop: full labels

6. **Accessibility**:
   - [ ] Tab through all elements
   - [ ] Screen reader announces correctly
   - [ ] ARIA labels present
   - [ ] Focus visible
   - [ ] Color contrast passes

### Automated Testing (Future)

```tsx
describe('DashboardHeader', () => {
  it('renders title and breadcrumb', () => {});
  it('shows store selector for multiple stores', () => {});
  it('hides store selector for single store', () => {});
  it('calls onRefresh when refresh clicked', () => {});
  it('updates timestamp every minute', () => {});
  it('navigates to correct routes', () => {});
  it('is keyboard accessible', () => {});
});
```

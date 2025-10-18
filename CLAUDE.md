# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses **pnpm** as the package manager (version 10.7.1+):

```bash
# Development
pnpm dev          # Start Next.js dev server with Turbopack

# Build & Production
pnpm build        # Build for production (runs prisma generate first)
pnpm start        # Start production server

# Code Quality
pnpm lint         # Run ESLint

# Database Operations
npx prisma generate       # Generate Prisma client (outputs to src/generated/prisma)
npx prisma migrate dev    # Run migrations in development
npx prisma studio         # Open Prisma Studio database GUI
npx prisma db push        # Push schema changes without migration

# Deployment
pnpm vercel-build # Vercel build script (generate + migrate + build)
```

## Architecture Overview

This is a **multi-tenant Point of Sale (POS) system** with the following stack:

- **Framework**: Next.js 15.4.6 (App Router) with React 19.1.0
- **Authentication**: JWT-based custom authentication (migrated from Clerk)
- **Database**: PostgreSQL (via Supabase) with Prisma ORM 6.14.0
- **UI Components**: shadcn/ui (New York style) + Radix UI primitives
- **State Management**: Zustand 5.0.7 with sessionStorage persistence
- **Data Fetching**: TanStack Query (React Query) 5.85.6
- **Forms**: React Hook Form 7.62.0 + Yup 1.7.0 / Zod 4.0.17 validation
- **Styling**: Tailwind CSS v4 with tw-animate-css
- **Icons**: Tabler Icons React 3.34.1 (not Lucide)
- **File Uploads**: UploadThing 7.7.4
- **Notifications**: Sonner 2.0.7 & SweetAlert2 11.22.4
- **Tables**: TanStack Table 8.21.3
- **Charts**: Recharts 2.15.4
- **Drag & Drop**: @dnd-kit/core 6.3.1 with sortable, modifiers, and utilities
- **Additional**:
  - date-fns 4.1.0 (date utilities)
  - react-number-format 5.4.4 (number formatting)
  - next-themes 0.4.6 (theme management)
  - vaul 1.1.2 (drawer component)
  - bcrypt 6.0.0 (password hashing)
  - jose 6.1.0 (JWT handling for Edge Runtime)
  - jsonwebtoken 9.0.2 (JWT token generation)

## Project Structure

### Important Path Mappings

TypeScript path aliases defined in `tsconfig.json`:
- `@/*` maps to `./src/*`

shadcn/ui configuration (`components.json`):
- Components: `@/components`
- UI components: `@/components/ui`
- Utils: `@/lib/utils`
- Hooks: `@/hooks`

### Key Directories

```
src/
├── actions/           # Server actions (grouped by entity)
│   ├── auth/          # Authentication actions
│   ├── brand/         # Brand CRUD actions
│   ├── category/      # Category CRUD actions
│   ├── customer/      # Customer CRUD actions
│   ├── dashboard/     # Dashboard analytics actions
│   ├── organization/  # Organization management actions
│   ├── payment-methods/ # Payment methods actions
│   ├── product/       # Product CRUD actions
│   ├── sale/          # Sales transaction actions
│   ├── sale-item/     # Sale line items actions
│   ├── sale-payment/  # Sale payment records actions
│   ├── stock-movement/ # Inventory tracking actions
│   ├── store/         # Store management actions
│   ├── user/          # User management actions
│   └── utils.ts       # Shared Prisma instance and helper utilities
├── app/              # Next.js App Router pages
│   ├── api/          # API routes (uploadthing)
│   ├── auth/         # Authentication pages (login, register, etc.)
│   ├── dashboard/    # Main app (protected routes)
│   │   ├── brands/
│   │   ├── categories/
│   │   ├── movements/  # Stock movements
│   │   ├── payment-methods/
│   │   ├── products/
│   │   ├── sales/
│   │   │   └── new/   # New sale form
│   │   ├── stores/
│   │   ├── users/
│   │   └── page.tsx   # Dashboard home
│   ├── onboarding/   # User onboarding flow
│   └── providers/    # React context providers
├── components/       # React components
│   ├── dashboard/    # Dashboard-specific components
│   │   ├── dashboard-header.tsx
│   │   ├── kpi-card.tsx
│   │   └── period-selector.tsx
│   ├── products/     # Product-specific components
│   │   └── stock-adjustment-dialog.tsx
│   ├── ui/           # shadcn/ui components
│   ├── app-sidebar.tsx  # Main navigation sidebar
│   ├── site-header.tsx  # Top header bar
│   ├── data-table.tsx   # Reusable TanStack Table component
│   └── product-filter-combobox.tsx
├── generated/        # Generated code (Prisma client)
│   └── prisma/       # Custom output location for Prisma
├── hooks/            # Custom React hooks
│   ├── auth/         # Authentication hooks
│   └── (entity hooks)  # useBrands, useCategories, etc.
├── interfaces/       # TypeScript interfaces
├── lib/              # Utility functions
│   ├── auth/         # Authentication utilities
│   │   ├── crypto.ts       # Encryption/hashing
│   │   ├── jwt.ts          # JWT generation/verification
│   │   ├── session.ts      # Session management
│   │   ├── authorization.ts # RBAC helpers
│   │   ├── validation.ts   # Input validation
│   │   └── server.ts       # Server-side auth utilities
│   ├── rbac.ts       # Role-based access control
│   ├── date-utils.ts # Date formatting utilities
│   └── utils.ts      # General utilities (cn, etc.)
├── store/            # Zustand store slices
│   ├── slices/       # Feature-based state slices
│   ├── types.ts      # Store type definitions
│   └── index.ts      # Store creation with middleware
└── utils/            # Helper utilities
    └── uploadthings.ts
```

## Database & Prisma

### Custom Prisma Client Location

**CRITICAL**: The Prisma client is generated to `src/generated/prisma` (not the default `node_modules/.prisma/client`).

Always import from:
```typescript
import { PrismaClient } from '@/generated/prisma'
```

### Soft Delete Pattern

All entities use soft deletes with these fields:
- `isDeleted: Boolean` - Soft delete flag
- `isActive: Boolean` - Active/inactive status
- `deletedAt: DateTime?` - Deletion timestamp

Unique constraints include `deletedAt` to allow name reuse after deletion:
```prisma
@@unique([organizationId, name, deletedAt], name: "unique_category_name_per_org")
```

### Multi-Tenant Organization Model

Most entities are scoped to an `organizationId`:
- Organization → Stores → Products, Categories, Brands, etc.
- Users belong to Organizations and optionally to Stores
- Sales are scoped to both Organization and Store

### Authentication Models (New JWT-based)

The system includes comprehensive authentication tables:

- **Session** - JWT session management with:
  - Token storage (hashed)
  - Expiration tracking
  - Device metadata (IP address, user agent, device ID)
  - Session revocation support
  - Last activity tracking

- **PasswordReset** - Secure password reset flow:
  - Unique tokens with expiration
  - Usage tracking (used/unused)
  - IP and user agent logging
  - One-time use enforcement

- **EmailVerification** - Email verification system:
  - Verification tokens with expiration
  - Support for email change verification
  - IP and user agent tracking
  - Verification status tracking

- **AuditLog** - Comprehensive audit trail:
  - Authentication events (login, logout, failed attempts, etc.)
  - CRUD operations (create, read, update, delete, restore)
  - User role and organization changes
  - Session management events
  - Before/after state tracking (oldValues, newValues)
  - Entity-based filtering
  - IP address and user agent logging

## Authentication & Authorization

### JWT-based Authentication

**IMPORTANT**: The project has migrated from Clerk to custom JWT authentication.

- Middleware at `src/middleware.ts` protects all routes except `/auth/*`
- Public routes: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`
- Protected routes: `/dashboard/*`, `/onboarding/*`
- Uses `jose` library for JWT verification (Edge Runtime compatible)
- Auth token stored in `auth-token` HTTP-only cookie
- JWT secret stored in `JWT_SECRET` environment variable

### Middleware Flow

1. Public routes bypass authentication
2. Protected routes verify JWT token from cookie
3. Token payload includes: `userId`, `email`, `role`, `organizationId`, `storeId`
4. User info added to request headers (`x-user-id`, `x-user-email`, `x-user-role`, `x-organization-id`, `x-store-id`)
5. Role-based redirects:
   - Users without organization → redirect to `/onboarding`
   - Users with organization trying to access onboarding → redirect to `/dashboard`

### User Roles

Defined in Prisma schema (`UserRole` enum):
- `ADMIN` - Full access to organization settings and parametrization
- `SELLER` - Limited to sales operations

### User Security Features

- Password hashing with bcrypt
- Login attempt tracking and account lockout (`loginAttempts`, `lockedUntil`)
- Password change tracking (`passwordChangedAt`)
- Email verification flow (`emailVerified`)
- Last login tracking (`lastLoginAt`)
- Soft delete support with unique constraints on `deletedAt`

### Role Checking Pattern

Server actions use helper utilities from `src/actions/utils.ts`:

```typescript
import { checkAdminRole, unauthorizedResponse, emptyOrgIdResponse, checkOrgId } from '@/actions/utils'

// Check admin role
const isAdmin = await checkAdminRole(userId)
if (!isAdmin) return unauthorizedResponse()

// Check organization ID
if (checkOrgId(orgId)) return emptyOrgIdResponse()
```

## Server Actions Pattern

All server actions follow this structure:

1. Located in `src/actions/{entity}/*.ts`
2. Exported from `src/actions/{entity}/index.ts`
3. Return type: `ActionResponse` from `@/interfaces`

```typescript
interface ActionResponse<T = any> {
  status: number      // HTTP status code
  message: string     // User-friendly message
  data: T | null      // Response data (typed)
}
```

### Available Action Modules

The following server action modules are available:
- `auth` - Login, register, logout, password reset, email verification, token refresh, get current user
- `user` - User CRUD operations
- `organization` - Organization management (create, get, update)
- `store` - Store CRUD operations
- `category` - Category management (create, update, delete, get by org/id)
- `brand` - Brand management
- `product` - Product CRUD with stock tracking
- `payment-methods` - Payment method configuration
- `customer` - Customer management
- `sale` - Sales transactions
- `sale-item` - Sale line items
- `sale-payment` - Sale payment records
- `stock-movement` - Inventory movement tracking
- `dashboard` - Dashboard analytics (KPIs, sales by period, cash status, top products, stock alerts)

### Shared Prisma Instance

Import the shared Prisma client from `src/actions/utils.ts`:
```typescript
import { prisma } from '@/actions/utils'
```

Do NOT create new `PrismaClient` instances in actions.

### Helper Utilities

Available in `src/actions/utils.ts`:
- `checkAdminRole(userId)` - Verify if user has ADMIN role
- `unauthorizedResponse()` - Return 403 response
- `checkOrgId(orgId)` - Validate organization ID is not empty
- `emptyOrgIdResponse()` - Return 400 response for missing org ID

## State Management

### Zustand Store

Global state managed by Zustand in `src/store/`:
- `index.ts` - Store creation with devtools and persist middleware
- `slices/` - Feature slices (auth, login, etc.)
- `types.ts` - TypeScript types

**Storage**: Uses `sessionStorage` (not localStorage)

Usage:
```typescript
import { useStore } from '@/store'

const user = useStore((state) => state.user)
const setUser = useStore((state) => state.setUser)
```

## Custom Hooks Pattern

Located in `src/hooks/`, named by entity (e.g., `useCategories.ts`, `useBrands.ts`).

### Available Custom Hooks

All hooks use TanStack Query (React Query) for data fetching and mutations:
- `useCategories` - Category CRUD operations
- `useBrands` - Brand management
- `usePaymentMethods` - Payment method operations
- `useStores` - Store management
- `useProducts` - Product CRUD with stock
- `useCustomers` - Customer management
- `useUsers` - User administration
- `useSales` - Sales transactions
- `useSaleItems` - Sale line items
- `useSalePayments` - Payment records
- `useStockMovement` - Inventory tracking
- `useOrganizations` - Organization settings
- `useDashboard` - Dashboard analytics (KPIs, sales data, top products, stock alerts)
- `use-mobile` - Responsive breakpoint detection
- `auth/useRegister` - User registration hook

Pattern:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Query for fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['entity', filters],
  queryFn: () => fetchAction(params)
})

// Mutation for creating/updating/deleting
const mutation = useMutation({
  mutationFn: (data) => createAction(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['entity'] })
  }
})
```

## Dashboard Layout

The dashboard uses a persistent sidebar layout (`src/app/dashboard/layout.tsx`):
- `AppSidebar` - Main navigation (from `@/components/app-sidebar.tsx`)
- `SiteHeader` - Top header bar
- Client-side layout that fetches user data on mount
- Displays organization name in sidebar header

Navigation sections:
1. **Main Nav**: Dashboard, Sales, Products, Movements, Users
2. **Parametrization**: Categories, Brands, Payment Methods, Stores
3. **Secondary**: Settings, Help, Search

## Form Components Pattern

Forms typically live in `features/` subdirectories within page routes:

Example structure for `/dashboard/categories`:
```
categories/
├── page.tsx                    # Main page component
└── features/
    ├── categories-list.tsx     # List view
    ├── new-category.tsx        # Create form (Sheet/Dialog)
    ├── action-component.tsx    # Edit/Delete actions
    └── data-table.tsx          # TanStack Table integration
```

## Image Uploads

Uses UploadThing with custom configuration:
- Core config: `src/app/api/uploadthing/core.ts`
- Route handler: `src/app/api/uploadthing/route.ts`
- Utilities: `src/utils/uploadthings.ts`
- Server utilities: `src/server/uploadThing.ts`

Remote pattern configured in `next.config.ts` for UploadThing CDN.

## UI Component Library

### shadcn/ui Configuration

Style: **New York**
Icon library: **Lucide** (configured, but **Tabler Icons** is used throughout the project)

Add components using:
```bash
npx shadcn@latest add [component-name]
```

### Available shadcn/ui Components

The project includes these shadcn/ui components:
- Layout: `sidebar`, `sheet`, `dialog`, `drawer`, `separator`, `scroll-area`
- Forms: `input`, `textarea`, `label`, `select`, `checkbox`, `switch`, `form`
- Display: `card`, `table`, `avatar`, `badge`, `tabs`, `chart`, `progress`, `alert`
- Interactive: `button`, `dropdown-menu`, `toggle`, `toggle-group`, `tooltip`
- Feedback: `sonner` (toast), `skeleton`
- Navigation: `breadcrumb`

### Custom UI Components

- `image-picker.tsx` - Image upload with UploadThing integration
- `sonner.tsx` - Toast notifications configured from 'sonner' library
- `data-table.tsx` - Reusable TanStack Table wrapper component
- `product-filter-combobox.tsx` - Product search/filter dropdown
- `dashboard/kpi-card.tsx` - KPI metric display card
- `dashboard/period-selector.tsx` - Date period selection component
- `dashboard/dashboard-header.tsx` - Dashboard page header with filters
- `products/stock-adjustment-dialog.tsx` - Stock adjustment dialog
- `app-sidebar.tsx` - Main application sidebar navigation
- `site-header.tsx` - Top application header
- `nav-main.tsx`, `nav-parametrization.tsx`, `nav-secondary.tsx`, `nav-user.tsx` - Navigation components
- `theme-provider.tsx` - Next.js theme provider wrapper
- `chart-area-interactive.tsx` - Interactive area chart component
- `section-cards.tsx` - Dashboard section card layouts

### Icon Usage

**IMPORTANT**: Always use **Tabler Icons** (`@tabler/icons-react`), not Lucide React:

```typescript
import { IconUser, IconHome, IconSettings } from '@tabler/icons-react'
```

### Styling with Tailwind CSS v4

- Custom theme variables defined in `globals.css` using oklch color space
- Dark mode support via `next-themes`
- Animation utilities via `tw-animate-css`
- Supports both `@layer` directives and inline `@theme`
- Border radius customization: `--radius` (default: 0.65rem)

## Drag and Drop

The project includes **@dnd-kit** for drag-and-drop functionality:
- `@dnd-kit/core` - Core drag and drop library
- `@dnd-kit/sortable` - Sortable lists and grids
- `@dnd-kit/modifiers` - Drag modifiers (restrict to axis, etc.)
- `@dnd-kit/utilities` - Utility functions

Use for reorderable lists, sortable tables, or drag-and-drop interfaces.

## Sales Flow

Key pages:
- `/dashboard/sales` - Sales list with data table
- `/dashboard/sales/new` - New sale form

Sales workflow:
1. Sale items (products with quantities and prices)
2. Sale payments (multiple payment methods per sale)
3. Stock movement tracking (automatic on sale creation)
4. Sale number auto-generation per store (`saleNumberPrefix` + `lastSaleNumber`)

## Stock Movement Tracking

The system tracks all inventory changes through the `StockMovement` model:
- **Types**: IN (additions), OUT (sales/removals), ADJUSTMENT (manual corrections)
- **Automatic tracking**: Stock movements are created automatically on sales
- **Audit trail**: Includes previous stock, new stock, reason, user, and reference
- **Page**: `/dashboard/movements` - View all stock movements

## Available Dashboard Pages

- `/dashboard` - Dashboard home with charts, KPIs, and analytics
- `/dashboard/sales` - Sales list with data table
- `/dashboard/sales/new` - New sale form
- `/dashboard/products` - Product catalog management
- `/dashboard/movements` - Stock movements tracking
- `/dashboard/users` - User administration (Admin only)
- `/dashboard/categories` - Category parametrization (Admin only)
- `/dashboard/brands` - Brand management (Admin only)
- `/dashboard/payment-methods` - Payment methods configuration (Admin only)
- `/dashboard/stores` - Store management (Admin only)

## Dashboard Features

### Dashboard Analytics (`/dashboard`)

The main dashboard page includes:
- **KPI Cards**: Total sales, active products, pending sales, low stock items
- **Sales Chart**: Interactive area chart showing sales trends by period (week/month/year)
- **Top Products**: Best-selling products table
- **Stock Alerts**: Products below minimum stock levels
- **Cash Status**: Current cash position
- **Period Selector**: Filter data by week, month, or year

Dashboard actions available in `src/actions/dashboard/`:
- `getKpis` - Fetch key performance indicators
- `getSalesByPeriod` - Get sales data filtered by period
- `getTopProducts` - Retrieve best-selling products
- `getStockAlerts` - Get low stock warnings
- `getCashStatus` - Current cash position

## Data Models Overview

### Core Entities
- **Organization** - Top-level tenant entity
- **Store** - Physical locations per organization
- **User** - System users with role-based access
- **Product** - Items for sale with stock tracking
- **Customer** - Customer database

### Parametrization
- **Category** - Product categorization
- **Brand** - Product brands with logo support
- **UnitMeasure** - Units of measurement (kg, L, unit, etc.)
- **PaymentMethod** - Payment types (Cash, Card, Transfer, etc.)
- **SystemConfig** - Flexible key-value configuration per organization

### Transactions
- **Sale** - Sales header with customer, totals, and status
- **SaleItem** - Individual line items in a sale
- **SalePayment** - Payment records (supports split payments)
- **Purchase** - Purchase orders from suppliers
- **PurchaseItem** - Purchase order line items
- **StockMovement** - Inventory audit trail (IN, OUT, ADJUSTMENT)

### Authentication & Security
- **Session** - Active JWT sessions with metadata
- **PasswordReset** - Password reset token management
- **EmailVerification** - Email verification tokens
- **AuditLog** - Comprehensive audit trail

### Enums
- `UserRole`: ADMIN, SELLER
- `StockMovementType`: IN, OUT, ADJUSTMENT
- `PaymentType`: CASH, CARD, TRANSFER, CREDIT, CHECK, OTHER
- `SaleStatus`: PAID, PENDING, OVERDUE, CANCELLED
- `PurchaseStatus`: PENDING, RECEIVED, CANCELLED
- `AuditAction`: LOGIN, LOGOUT, CREATE, UPDATE, DELETE, etc.

## Utility Libraries

### Date Utilities (`src/lib/date-utils.ts`)

Helper functions for date formatting and manipulation using date-fns.

### Authentication Library (`src/lib/auth/`)

Comprehensive authentication utilities:
- `crypto.ts` - Password hashing with bcrypt, token generation
- `jwt.ts` - JWT token generation and verification (using jose for Edge Runtime)
- `session.ts` - Session management (create, validate, revoke)
- `authorization.ts` - RBAC helpers and permission checks
- `validation.ts` - Input validation for auth forms
- `server.ts` - Server-side auth utilities (get user from request, etc.)

### RBAC (`src/lib/rbac.ts`)

Role-based access control utilities for checking user permissions.

### Logout Cleanup (`src/lib/logout-cleanup.ts`)

Utility for cleaning up user session data on logout.

## Testing & Type Safety

- TypeScript 5 with strict mode enabled
- ESLint 9 configured with flat config
- No test framework currently configured
- Prisma generates full TypeScript types for database models

### CRITICAL: Strict TypeScript Typing Rules

**ABSOLUTELY FORBIDDEN - NO EXCEPTIONS:**

1. **NEVER use `any` type** - This is strictly prohibited in all circumstances
2. **NEVER bypass type checking** with:
   - `as any`
   - `@ts-ignore`
   - `@ts-expect-error`
   - `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
   - Any other method to circumvent TypeScript type checking

3. **ALL code must be explicitly typed:**
   - Function parameters must have explicit types
   - Function return types must be declared
   - Variables must have inferred or explicit types
   - Object properties must be typed
   - Array elements must have specific types

4. **Proper type casting:**
   - Use `unknown` for truly unknown types, then narrow with type guards
   - Use proper type assertions: `as unknown as TargetType` (double assertion pattern)
   - Import and use proper types from React Hook Form, Prisma, etc.

**Correct patterns:**

```typescript
// ✅ CORRECT - Proper typing with Resolver
import { useForm, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

const form = useForm<FormData>({
  resolver: yupResolver(schema) as unknown as Resolver<FormData>,
});

// ✅ CORRECT - Using unknown for Prisma relations
type EntityWithIncludes = Entity & {
  relations?: unknown[];
  _count?: {
    relations: number;
  };
};

// ✅ CORRECT - Proper type narrowing
const items = (data as Record<string, unknown>[]).map((item) => ({
  id: String(item.id ?? ''),
  name: String(item.name ?? ''),
}));

// ✅ CORRECT - Explicit function typing
export async function createEntity(
  data: EntityData
): Promise<ActionResponse<Entity>> {
  // implementation
}
```

**Incorrect patterns:**

```typescript
// ❌ FORBIDDEN - Using any
const data: any = fetchData();

// ❌ FORBIDDEN - Bypassing type checking
const form = useForm({
  resolver: yupResolver(schema) as any, // NEVER DO THIS
});

// ❌ FORBIDDEN - ts-ignore
// @ts-ignore
const value = someFunction();

// ❌ FORBIDDEN - Disabling ESLint rule
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const result: any = compute();
```

**Consequences of violating these rules:**
- Code will not pass production build
- Pull requests will be rejected
- Runtime type errors are unacceptable
- Type safety is non-negotiable for system reliability

**If you encounter a typing challenge:**
1. Use `unknown` and narrow the type with type guards
2. Create proper interface/type definitions
3. Use generics when appropriate
4. Import proper types from libraries (React Hook Form, TanStack Query, etc.)
5. Use the double assertion pattern: `as unknown as TargetType`

This is a **ZERO TOLERANCE** policy. Type safety is critical for the reliability and maintainability of this production POS system.

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Postgres connection pooling URL (Supabase)
- `DIRECT_URL` - Direct Postgres connection for migrations
- `JWT_SECRET` - Secret key for JWT token signing
- `UPLOADTHING_TOKEN` - UploadThing API token

**Deprecated** (Clerk migration - remove these if still present):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`

## Common Patterns & Best Practices

### Page Structure Pattern

Most feature pages follow this structure:
```
feature-name/
├── page.tsx                    # Main page component
└── features/                   # Feature-specific components
    ├── feature-list.tsx        # List/table view
    ├── new-feature.tsx         # Create form (Sheet/Dialog)
    ├── edit-feature.tsx        # Edit form
    ├── action-component.tsx    # Row actions (edit/delete)
    └── data-table.tsx          # TanStack Table integration
```

### Server Action Pattern

1. Always use `"use server"` directive
2. Import shared Prisma instance from `@/actions/utils`
3. Validate authentication and authorization
4. Return `ActionResponse<T>` type
5. Handle errors with try-catch and return appropriate status codes

Example:
```typescript
"use server"

import { ActionResponse } from "@/interfaces"
import { prisma, checkAdminRole, unauthorizedResponse } from "@/actions/utils"

export async function createEntity(data: EntityData): Promise<ActionResponse<Entity>> {
  try {
    const isAdmin = await checkAdminRole(userId)
    if (!isAdmin) return unauthorizedResponse()

    const entity = await prisma.entity.create({ data })

    return {
      status: 201,
      message: "Entity created successfully",
      data: entity
    }
  } catch (error) {
    return {
      status: 500,
      message: "Failed to create entity",
      data: null
    }
  }
}
```

### TanStack Query Hook Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useEntities(orgId: string) {
  const queryClient = useQueryClient()

  // Fetch query
  const { data, isLoading, error } = useQuery({
    queryKey: ['entities', orgId],
    queryFn: () => getEntities(orgId),
    enabled: !!orgId
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
      toast.success('Entity created')
    },
    onError: (error) => {
      toast.error('Failed to create entity')
    }
  })

  return { data, isLoading, error, createMutation }
}
```

### Form Validation Pattern

Use React Hook Form with Yup or Zod:

```typescript
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const schema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required')
})

function MyForm() {
  const form = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: '', email: '' }
  })

  const onSubmit = (data) => {
    // Handle form submission
  }

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

### Soft Delete Pattern

Always use soft deletes for data integrity:

```typescript
// Delete operation
await prisma.entity.update({
  where: { id },
  data: {
    isDeleted: true,
    deletedAt: new Date()
  }
})

// Query active entities
const entities = await prisma.entity.findMany({
  where: {
    organizationId,
    isDeleted: false,
    isActive: true
  }
})
```

### Multi-tenant Query Pattern

Always filter by `organizationId` and soft delete flags:

```typescript
const entities = await prisma.entity.findMany({
  where: {
    organizationId: user.organizationId,
    isDeleted: false
  },
  include: {
    relatedEntity: true
  }
})
```

## Development Workflow

1. **Database Changes**:
   - Edit `prisma/schema.prisma`
   - Run `npx prisma migrate dev --name description_of_change`
   - Prisma client auto-regenerates to `src/generated/prisma`

2. **Adding New Features**:
   - Create server actions in `src/actions/entity-name/`
   - Create custom hook in `src/hooks/useEntityName.ts`
   - Create page components in `src/app/dashboard/entity-name/`
   - Add navigation link in `src/components/app-sidebar.tsx`

3. **Adding shadcn/ui Components**:
   - Run `npx shadcn@latest add component-name`
   - Component added to `src/components/ui/`
   - Import and use: `import { Component } from '@/components/ui/component'`

4. **Building for Production**:
   - Run `pnpm build` (automatically runs `prisma generate`)
   - For Vercel: Use `pnpm vercel-build` (includes migrations)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses **pnpm** as the package manager (version 10.7.1+):

```bash
# Development
pnpm dev          # Start Next.js dev server with Turbopack

# Build & Production
pnpm build        # Build for production
pnpm start        # Start production server

# Code Quality
pnpm lint         # Run ESLint

# Database Operations
npx prisma generate       # Generate Prisma client (outputs to src/generated/prisma)
npx prisma migrate dev    # Run migrations in development
npx prisma studio         # Open Prisma Studio database GUI
npx prisma db push        # Push schema changes without migration
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
- **Additional**: date-fns 4.1.0, react-number-format 5.4.4, next-themes 0.4.6

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
├── app/              # Next.js App Router pages
│   ├── api/          # API routes (uploadthing)
│   ├── auth/         # Authentication pages
│   ├── dashboard/    # Main app (protected)
│   ├── onboarding/   # User onboarding flow
│   └── providers/    # React context providers
├── components/       # React components
│   └── ui/           # shadcn/ui components
├── generated/        # Generated code (Prisma client)
├── hooks/            # Custom React hooks
├── interfaces/       # TypeScript interfaces
├── lib/              # Utility functions
├── store/            # Zustand store slices
└── utils/            # Helper utilities
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
- **Session** - JWT session management with device tracking, IP address, user agent, and revocation support
- **PasswordReset** - Secure password reset tokens with expiration
- **EmailVerification** - Email verification tokens for new accounts and email changes
- **AuditLog** - Comprehensive audit trail for all authentication events and CRUD operations

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
- `auth` - Login, register, logout, password reset, email verification
- `user` - User CRUD operations
- `organization` - Organization management
- `store` - Store CRUD operations
- `category` - Category management
- `brand` - Brand management
- `product` - Product CRUD with stock tracking
- `payment-methods` - Payment method configuration
- `customer` - Customer management
- `sale` - Sales transactions
- `sale-item` - Sale line items
- `sale-payment` - Sale payment records
- `stock-movement` - Inventory movement tracking

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
- `use-mobile` - Responsive breakpoint detection

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
- Display: `card`, `table`, `avatar`, `badge`, `tabs`, `chart`
- Interactive: `button`, `dropdown-menu`, `toggle`, `toggle-group`, `tooltip`
- Feedback: `sonner` (toast), `skeleton`
- Navigation: `breadcrumb`

### Custom UI Components

- `image-picker.tsx` - Image upload with UploadThing integration
- `sonner.tsx` - Toast notifications configured from 'sonner' library

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

## Sales Flow

Key pages:
- `/dashboard/sales` - Sales list with data table
- `/dashboard/sales/new` - New sale form

Sales workflow:
1. Sale items (products with quantities and prices)
2. Sale payments (multiple payment methods per sale)
3. Stock movement tracking (automatic on sale creation)
4. Sale number auto-generation per store (`saleNumberPrefix` + `lastSaleNumber`)

## Available Dashboard Pages

- `/dashboard` - Dashboard home with charts and metrics
- `/dashboard/sales` - Sales management
- `/dashboard/products` - Product catalog
- `/dashboard/users` - User administration (Admin only)
- `/dashboard/categories` - Category parametrization (Admin only)
- `/dashboard/brands` - Brand management (Admin only)
- `/dashboard/payment-methods` - Payment methods (Admin only)
- `/dashboard/stores` - Store management (Admin only)

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

## Testing & Type Safety

- TypeScript 5 with strict mode enabled
- ESLint 9 configured with flat config
- No test framework currently configured

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

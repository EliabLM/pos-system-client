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

- **Framework**: Next.js 15.4.6 (App Router) with React 19
- **Authentication**: Clerk (with custom middleware)
- **Database**: PostgreSQL (via Supabase) with Prisma ORM
- **UI Components**: shadcn/ui (New York style) + Radix UI primitives
- **State Management**: Zustand with session storage persistence
- **Forms**: React Hook Form + Yup/Zod validation
- **Styling**: Tailwind CSS v4
- **Icons**: Tabler Icons React (not Lucide)
- **File Uploads**: UploadThing

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

## Authentication & Authorization

### Clerk Integration

- Middleware at `src/middleware.ts` protects all routes except `/auth/*`
- Public routes: `/auth/login`, `/auth/register`
- Sign-in redirect configured to `/auth/login`

### User Roles

Defined in Prisma schema (`UserRole` enum):
- `ADMIN` - Full access to organization settings and parametrization
- `SELLER` - Limited to sales operations

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
interface ActionResponse {
  status: number      // HTTP status code
  message: string     // User-friendly message
  data: any | null    // Response data
}
```

### Shared Prisma Instance

Import the shared Prisma client from `src/actions/utils.ts`:
```typescript
import { prisma } from '@/actions/utils'
```

Do NOT create new `PrismaClient` instances in actions.

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

Typically use TanStack Query (React Query) for data fetching:
```typescript
import { useQuery, useMutation } from '@tanstack/react-query'
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
Icon library: **Lucide** (configured, but project uses Tabler Icons)

Add components using:
```bash
npx shadcn@latest add [component-name]
```

### Custom UI Components

- `image-picker.tsx` - Image upload with UploadThing integration
- `data-table.tsx` - Reusable TanStack Table wrapper
- `sonner.tsx` - Toast notifications (imported from 'sonner')

## Sales Flow

Key pages:
- `/dashboard/sales` - Sales list
- `/dashboard/sales/new` - New sale form

Sales include:
- Sale items (products with quantities and prices)
- Sale payments (multiple payment methods per sale)
- Stock movement tracking (automatic on sale creation)

## Testing & Type Safety

- TypeScript strict mode enabled
- ESLint configured (ESLint 9 with flat config)
- No test framework currently configured

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Postgres connection pooling URL
- `DIRECT_URL` - Direct Postgres connection for migrations
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `UPLOADTHING_TOKEN`

Clerk redirect URLs configured via env vars.

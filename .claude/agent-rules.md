# AI Agent Rules - POS System

## 🎯 Core Directives for All Agents

These rules apply to **ALL** AI agents (pos-fullstack-dev, ui-ux-designer, database-architect, etc.) working on this codebase.

---

## 🚨 MANDATORY: TypeScript Strict Typing

### Rule #1: ZERO TOLERANCE for `any` Type

**NEVER, under any circumstances, use the `any` type.**

```typescript
// ❌ ABSOLUTELY FORBIDDEN
const data: any = fetchData();
resolver: yupResolver(schema) as any
control: form.control as any
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-explicit-any
```

```typescript
// ✅ ALWAYS USE PROPER TYPES
const data: unknown = fetchData();
resolver: yupResolver(schema) as unknown as Resolver<FormData>
control: form.control as unknown as Control<FormData>
```

### Rule #2: ALL Code Must Be Explicitly Typed

Every variable, parameter, function return, and object property MUST have a proper type.

**Required:**
- Function parameters: `function process(data: EntityData): void`
- Return types: `async function fetch(): Promise<User>`
- Generic constraints: `<T extends Record<string, unknown>>`
- Interface definitions for all data structures
- Type guards for `unknown` values

### Rule #3: Use `unknown` for Unknown Types

When you truly don't know the type, use `unknown` (not `any`), then narrow it:

```typescript
// ✅ CORRECT
const data: unknown = JSON.parse(str);
if (typeof data === 'object' && data !== null && 'id' in data) {
  const id = (data as { id: string }).id;
}

// ✅ CORRECT - For Prisma relations
type EntityWithIncludes = Entity & {
  relations?: unknown[];  // NOT any[]
};
```

### Rule #4: Double Assertion Pattern for Complex Types

```typescript
// ✅ CORRECT - React Hook Form
import { Resolver } from 'react-hook-form';
resolver: yupResolver(schema) as unknown as Resolver<FormData>

// ✅ CORRECT - TanStack Table
import { Control } from 'react-hook-form';
control: form.control as unknown as Control<FormData>

// ✅ CORRECT - Casting arrays
(data as Record<string, unknown>[]).map((item) => ...)
```

---

## ⛔ MANDATORY: PRISMA SCHEMA FIELDS ONLY

### Rule #5: NEVER Invent Database Fields

**YOU MUST NEVER, UNDER ANY CIRCUMSTANCES, CREATE OR USE FIELDS THAT DO NOT EXIST IN THE PRISMA SCHEMA.**

This is a **ZERO TOLERANCE** policy that applies to:
- ✅ ALL agents (pos-fullstack-dev, ui-ux-designer, database-architect, etc.)
- ✅ ALL code generation
- ✅ ALL database operations
- ✅ ALL TypeScript interfaces for database models
- ✅ ALL server actions
- ✅ ALL component implementations

### Why This Is Critical

Invented fields cause:
- ❌ Runtime errors in production
- ❌ TypeScript type safety compromise
- ❌ Database operations fail silently
- ❌ Data integrity violations
- ❌ Impossible migrations
- ❌ Pull request rejections
- ❌ Critical bugs

### The Rules

1. **ALWAYS** check `prisma/schema.prisma` before working with ANY database model
2. **ONLY** use fields that are explicitly defined in the Prisma schema
3. **NEVER** assume a field exists - verify it in the schema FIRST
4. **NEVER** create "helpful" or "logical" fields that seem to make sense
5. **NEVER** add fields based on business logic assumptions

### How to Verify Fields

```bash
# Step 1: Open prisma/schema.prisma
# Step 2: Find the model (e.g., "model Product")
# Step 3: Check ONLY the fields listed in that model
# Step 4: If a field is not there, you CANNOT use it
```

### Examples of FORBIDDEN Behavior

```typescript
// ❌ ABSOLUTELY FORBIDDEN - "presentation" field does NOT exist in Product schema
const productData = {
  name: "Cerveza Corona",
  presentation: "Botella de vidrio",  // THIS FIELD DOESN'T EXIST!
};

// ❌ ABSOLUTELY FORBIDDEN - "maxStock" field does NOT exist in Product schema
const productData = {
  name: "Nike Air Max",
  maxStock: 1000,  // THIS FIELD DOESN'T EXIST!
};

// ❌ FORBIDDEN - Creating interface with non-existent fields
interface ProductFormData {
  name: string;
  presentation?: string;  // DOESN'T EXIST IN SCHEMA!
  maxStock?: number;      // DOESN'T EXIST IN SCHEMA!
}
```

### Correct Approach

```typescript
// ✅ CORRECT - First, check prisma/schema.prisma:
// model Product {
//   id            String
//   name          String
//   categoryId    String
//   brandId       String
//   unitMeasureId String
//   costPrice     Float
//   salePrice     Float
//   minStock      Int
//   currentStock  Int
//   alcoholGrade  Float?    // For liquor stores
//   volume        Float?    // For liquor stores
//   size          String?   // For footwear/clothing
//   color         String?   // For footwear/clothing
//   model         String?   // For footwear/clothing
//   // ... other ACTUAL fields
// }

// ✅ CORRECT - Only use fields that exist
const productData = {
  name: "Cerveza Corona",
  volume: 355,           // ✅ EXISTS in schema
  alcoholGrade: 4.5,     // ✅ EXISTS in schema
  categoryId: "...",     // ✅ EXISTS in schema
  brandId: "...",        // ✅ EXISTS in schema
  unitMeasureId: "...",  // ✅ EXISTS in schema
  costPrice: 5000,       // ✅ EXISTS in schema
  salePrice: 7000,       // ✅ EXISTS in schema
  minStock: 10,          // ✅ EXISTS in schema (NOT maxStock!)
  currentStock: 100,     // ✅ EXISTS in schema
  // NO "presentation" field - it doesn't exist!
  // NO "maxStock" field - only "minStock" exists!
};

// ✅ CORRECT - Interface matches schema exactly
interface ProductFormData {
  name: string;
  categoryId: string;
  brandId: string;
  unitMeasureId: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  currentStock: number;
  alcoholGrade?: number | null;  // Exists in schema
  volume?: number | null;        // Exists in schema
  size?: string | null;          // Exists in schema
  color?: string | null;         // Exists in schema
  model?: string | null;         // Exists in schema
}
```

### Common Models to Verify

Before working with these models, CHECK THE SCHEMA:
- `Product` - Most commonly violated
- `Customer`
- `Sale`
- `Purchase`
- `Category`
- `Brand`
- `User`
- `Organization`
- `StockMovement`

### If You Need a New Field

**DO NOT** add it to your code. Instead:

1. ❌ Do NOT create it in TypeScript interfaces
2. ❌ Do NOT use it in server actions
3. ❌ Do NOT add it to forms
4. ✅ ASK the user: "Do you want to add this field to the Prisma schema?"
5. ✅ WAIT for schema update and migration
6. ✅ THEN use the field in code

### Consequences of Violation

If you invent fields:
1. ❌ Code will fail in production
2. ❌ Pull request REJECTED immediately
3. ❌ Critical bugs introduced
4. ❌ Data corruption possible
5. ❌ Complete re-implementation required
6. ❌ Loss of user trust

### Pre-Implementation Checklist Addition

Before writing database-related code:
- [ ] I have opened `prisma/schema.prisma`
- [ ] I have verified EVERY field exists in the schema
- [ ] I am NOT assuming any fields exist
- [ ] I am NOT creating "helpful" fields
- [ ] My interfaces EXACTLY match the Prisma model
- [ ] I will use ONLY fields from the schema

---

## 📋 Agent-Specific Rules

### For `pos-fullstack-dev` Agent

When implementing features:

1. **Prisma Schema Verification** (FIRST STEP):
   - ✅ ALWAYS open `prisma/schema.prisma` BEFORE writing code
   - ✅ Verify EVERY field exists in the schema
   - ✅ NEVER invent fields that don't exist
   - ✅ ASK user if new field is needed

2. **Server Actions**:
   - Import types: `ActionResponse`, `Resolver`, etc.
   - Explicit return types: `Promise<ActionResponse<Entity>>`
   - Type all Prisma queries explicitly
   - Use `unknown` for includes, never `any`
   - **ONLY use fields from Prisma schema**

3. **Custom Hooks**:
   - Type all TanStack Query hooks properly
   - Explicit return types for all hooks
   - Generic constraints when needed
   - Import `UseMutationResult`, `UseQueryResult` types
   - **Ensure data types match Prisma models exactly**

4. **React Components**:
   - Type all props interfaces
   - Type all event handlers
   - Type all state variables
   - Import React types: `React.MouseEvent<HTMLButtonElement>`
   - **Component props for entities must match Prisma schema**

5. **Form Handling**:
   - Always import `Resolver` from `react-hook-form`
   - Use double assertion for resolvers
   - Type form data explicitly
   - Import `Control` type when needed
   - **Form data interfaces must match Prisma schema fields**

### For `ui-ux-designer` Agent

When creating UI components:

1. **Prisma Schema Verification** (FIRST STEP):
   - ✅ ALWAYS check `prisma/schema.prisma` when working with database entities
   - ✅ Verify fields exist before using in forms or interfaces
   - ✅ NEVER create form fields for non-existent database fields
   - ✅ ASK user if new field is needed

2. **Component Props**:
   ```typescript
   // ✅ Entity types must match Prisma schema
   interface ComponentProps {
     data: Entity[];  // Must be from Prisma-generated types
     onSelect: (item: Entity) => void;
     loading?: boolean;
   }

   export function Component({ data, onSelect, loading }: ComponentProps) {
     // ...
   }
   ```

3. **Event Handlers**:
   ```typescript
   const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
     // ...
   };
   ```

4. **State Variables**:
   ```typescript
   const [selected, setSelected] = useState<Entity | null>(null);
   const [items, setItems] = useState<Entity[]>([]);
   ```

5. **Form Fields**:
   - ✅ Form inputs must correspond to actual Prisma schema fields
   - ❌ NEVER create form fields for non-existent database fields
   - ✅ Verify each field in `prisma/schema.prisma` before adding to form

### For `database-architect` Agent

When working with Prisma:

1. **Schema First Approach**:
   - ✅ ALWAYS work directly with `prisma/schema.prisma`
   - ✅ ONLY add fields that are explicitly requested
   - ✅ NEVER add "helpful" fields without user approval
   - ✅ Verify all field names, types, and constraints

2. **Type Definitions**:
   ```typescript
   // ✅ CORRECT - Import from generated Prisma
   import { Customer } from '@/generated/prisma';

   type CustomerWithIncludes = Customer & {
     sales?: unknown[];
     _count?: { sales: number };
   };
   ```

3. **Query Results**:
   ```typescript
   // ✅ CORRECT - Explicit return type
   async function getCustomers(): Promise<Customer[]> {
     return await prisma.customer.findMany({
       where: { isDeleted: false },
     });
   }
   ```

4. **Schema Modifications**:
   - ✅ Confirm field names match exactly what user requested
   - ✅ Do NOT add extra fields "for convenience"
   - ✅ Update migrations to reflect schema changes precisely

---

## ✅ Pre-Implementation Checklist

Before writing ANY code, verify:

**TypeScript:**
- [ ] I will NOT use `any` anywhere
- [ ] I will NOT use `@ts-ignore` or `@ts-expect-error`
- [ ] I will NOT disable ESLint type rules
- [ ] All functions will have explicit return types
- [ ] All parameters will have explicit types
- [ ] I will use `unknown` for unknown types, then narrow
- [ ] I will import necessary types (`Resolver`, `Control`, etc.)
- [ ] I will use double assertion pattern when needed
- [ ] All interfaces will be properly defined
- [ ] Code will pass TypeScript strict mode

**Prisma Schema:**
- [ ] I have opened `prisma/schema.prisma` and reviewed the model
- [ ] I have verified EVERY field exists in the Prisma schema
- [ ] I will NOT invent or assume any fields exist
- [ ] I will NOT create "helpful" fields that don't exist
- [ ] My interfaces EXACTLY match the Prisma model definition
- [ ] I will use ONLY fields from the schema

---

## 🔍 Code Review Checklist

After writing code, verify:

**TypeScript:**
- [ ] Zero `any` types in the entire codebase
- [ ] No `@ts-ignore` or `@ts-expect-error` comments
- [ ] No ESLint disable comments for type rules
- [ ] All functions have explicit types
- [ ] All event handlers are properly typed
- [ ] All React components have typed props
- [ ] All Prisma queries use proper types
- [ ] All TanStack Query hooks are typed
- [ ] All form resolvers use proper pattern
- [ ] Code builds without type errors: `pnpm build`

**Prisma Schema:**
- [ ] NO invented fields in TypeScript interfaces
- [ ] NO invented fields in server actions
- [ ] NO invented fields in component props
- [ ] NO invented fields in form data types
- [ ] ALL fields used exist in `prisma/schema.prisma`
- [ ] Database operations will work in production
- [ ] No runtime errors from missing fields

---

## 🚫 What Happens If You Violate These Rules

1. **Immediate Build Failure**: Code will not compile
2. **Automatic Rejection**: Changes will be rejected
3. **No Exceptions**: These rules have ZERO tolerance
4. **Re-implementation Required**: You must fix ALL type violations

---

## 💡 Common Patterns to Remember

### Pattern 1: React Hook Form + Yup

```typescript
import { useForm, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

const form = useForm<FormData>({
  resolver: yupResolver(schema) as unknown as Resolver<FormData>,
  defaultValues: { /* ... */ },
});
```

### Pattern 2: FormField with Control

```typescript
import { Control } from 'react-hook-form';

<FormField
  control={form.control as unknown as Control<FormData>}
  name="fieldName"
  render={({ field }) => <Input {...field} />}
/>
```

### Pattern 3: Server Actions

```typescript
'use server';

export async function createEntity(
  data: CreateEntityData
): Promise<ActionResponse<Entity>> {
  try {
    const entity = await prisma.entity.create({ data });
    return { status: 201, message: 'Success', data: entity };
  } catch (error) {
    return {
      status: 500,
      message: error instanceof Error ? error.message : 'Error',
      data: null,
    };
  }
}
```

### Pattern 4: Custom Hooks

```typescript
export function useEntities(orgId: string) {
  return useQuery({
    queryKey: ['entities', orgId] as const,
    queryFn: async (): Promise<Entity[]> => {
      const result = await getEntities(orgId);
      return result.entities;
    },
    enabled: Boolean(orgId),
  });
}
```

### Pattern 5: Prisma Relations

```typescript
type EntityWithIncludes = Entity & {
  relations?: unknown[];
  _count?: { relations: number };
};

// When using:
const items = (entity.relations as Record<string, unknown>[])
  .map((item) => ({
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
  }));
```

---

## 📚 Required Reading

Before implementing ANY feature, read:

1. `.claude/typescript-strict-rules.md` - Complete TypeScript rules
2. `CLAUDE.md` - Project guidelines and patterns
3. Existing implementation examples (customers, suppliers modules)

---

## 🎯 Success Criteria

Your implementation is successful ONLY if:

1. ✅ Zero `any` types
2. ✅ Zero type bypasses (`@ts-ignore`, etc.)
3. ✅ All code explicitly typed
4. ✅ Zero invented Prisma schema fields
5. ✅ ALL database fields verified in `prisma/schema.prisma`
6. ✅ Builds successfully: `pnpm build` passes
7. ✅ No type-related ESLint warnings
8. ✅ Follows project patterns exactly
9. ✅ Passes manual code review

---

**Remember:** Type safety and schema integrity are NOT negotiable. They are core requirements for production code.

**These rules exist to ensure:**
- Runtime reliability
- Maintainability
- Developer experience
- Production stability
- Code quality
- Data integrity
- Schema consistency

**NO EXCEPTIONS. NO COMPROMISES. ZERO TOLERANCE.**

---

## 🔒 Final Reminders

### NEVER Invent Fields
- ❌ Do NOT create fields that don't exist in Prisma schema
- ✅ ALWAYS verify fields in `prisma/schema.prisma` first
- ✅ ASK the user if you need a new field

### NEVER Use `any` Type
- ❌ Do NOT use `any` type anywhere
- ✅ ALWAYS use proper types or `unknown` with type guards

### ALWAYS Be Explicit
- ✅ All functions must have return types
- ✅ All parameters must have types
- ✅ All interfaces must match schema exactly

**Your code is production code. It affects real businesses and real users. Take these rules seriously.**

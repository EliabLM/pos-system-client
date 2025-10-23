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

## 📋 Agent-Specific Rules

### For `pos-fullstack-dev` Agent

When implementing features:

1. **Server Actions**:
   - Import types: `ActionResponse`, `Resolver`, etc.
   - Explicit return types: `Promise<ActionResponse<Entity>>`
   - Type all Prisma queries explicitly
   - Use `unknown` for includes, never `any`

2. **Custom Hooks**:
   - Type all TanStack Query hooks properly
   - Explicit return types for all hooks
   - Generic constraints when needed
   - Import `UseMutationResult`, `UseQueryResult` types

3. **React Components**:
   - Type all props interfaces
   - Type all event handlers
   - Type all state variables
   - Import React types: `React.MouseEvent<HTMLButtonElement>`

4. **Form Handling**:
   - Always import `Resolver` from `react-hook-form`
   - Use double assertion for resolvers
   - Type form data explicitly
   - Import `Control` type when needed

### For `ui-ux-designer` Agent

When creating UI components:

1. **Component Props**:
   ```typescript
   interface ComponentProps {
     data: Entity[];
     onSelect: (item: Entity) => void;
     loading?: boolean;
   }

   export function Component({ data, onSelect, loading }: ComponentProps) {
     // ...
   }
   ```

2. **Event Handlers**:
   ```typescript
   const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
     // ...
   };
   ```

3. **State Variables**:
   ```typescript
   const [selected, setSelected] = useState<Entity | null>(null);
   const [items, setItems] = useState<Entity[]>([]);
   ```

### For `database-architect` Agent

When working with Prisma:

1. **Type Definitions**:
   ```typescript
   // ✅ CORRECT
   import { Customer } from '@/generated/prisma';

   type CustomerWithIncludes = Customer & {
     sales?: unknown[];
     _count?: { sales: number };
   };
   ```

2. **Query Results**:
   ```typescript
   // ✅ CORRECT - Explicit return type
   async function getCustomers(): Promise<Customer[]> {
     return await prisma.customer.findMany({
       where: { isDeleted: false },
     });
   }
   ```

---

## ✅ Pre-Implementation Checklist

Before writing ANY code, verify:

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

---

## 🔍 Code Review Checklist

After writing code, verify:

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
4. ✅ Builds successfully: `pnpm build` passes
5. ✅ No type-related ESLint warnings
6. ✅ Follows project patterns exactly
7. ✅ Passes manual code review

---

**Remember:** Type safety is NOT negotiable. It's a core requirement for production code.

**These rules exist to ensure:**
- Runtime reliability
- Maintainability
- Developer experience
- Production stability
- Code quality

**NO EXCEPTIONS. NO COMPROMISES. ZERO TOLERANCE.**

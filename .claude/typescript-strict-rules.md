# TypeScript Strict Typing Rules - MANDATORY

## 🚨 CRITICAL: Zero Tolerance Policy for Type Safety

This document contains **MANDATORY** rules that MUST be followed by all developers and AI agents working on this codebase.

---

## ❌ ABSOLUTELY FORBIDDEN - NO EXCEPTIONS

### 1. NEVER Use `any` Type

```typescript
// ❌ FORBIDDEN
const data: any = fetchData();
const result: any = compute();
let value: any;

// ❌ FORBIDDEN - In function parameters
function processData(data: any) { }

// ❌ FORBIDDEN - In return types
function getData(): any { }

// ❌ FORBIDDEN - In interfaces
interface User {
  data: any;  // NEVER
}
```

### 2. NEVER Bypass Type Checking

```typescript
// ❌ FORBIDDEN - Using as any
const form = useForm({
  resolver: yupResolver(schema) as any,
});

// ❌ FORBIDDEN - @ts-ignore
// @ts-ignore
const value = someFunction();

// ❌ FORBIDDEN - @ts-expect-error
// @ts-expect-error
const result = compute();

// ❌ FORBIDDEN - Disabling ESLint
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = fetch();

// ❌ FORBIDDEN - ts-nocheck
// @ts-nocheck
```

### 3. NEVER Leave Implicit Any

```typescript
// ❌ FORBIDDEN - Implicit any in parameters
function process(data) { }  // Missing type

// ❌ FORBIDDEN - Implicit any in variables
const result = JSON.parse(str);  // Returns any

// ❌ FORBIDDEN - Implicit any in callbacks
array.map((item) => item.name);  // item is any
```

---

## ✅ REQUIRED: Proper TypeScript Patterns

### 1. Explicit Function Typing

```typescript
// ✅ CORRECT - All parameters and return types explicitly typed
export async function createEntity(
  data: EntityData
): Promise<ActionResponse<Entity>> {
  const entity = await prisma.entity.create({ data });
  return {
    status: 201,
    message: 'Entity created',
    data: entity,
  };
}

// ✅ CORRECT - Arrow functions with types
const handleSubmit = (values: FormData): void => {
  console.log(values);
};

// ✅ CORRECT - Async arrow functions
const fetchData = async (id: string): Promise<User> => {
  return await api.getUser(id);
};
```

### 2. Using `unknown` Instead of `any`

```typescript
// ✅ CORRECT - Use unknown for truly unknown types
const parseJson = (str: string): unknown => {
  return JSON.parse(str);
};

// ✅ CORRECT - Then narrow the type
const data = parseJson(jsonString);
if (typeof data === 'object' && data !== null && 'name' in data) {
  console.log((data as { name: string }).name);
}

// ✅ CORRECT - For Prisma relations
type CustomerWithIncludes = Customer & {
  sales?: unknown[];  // Not any[]
  _count?: {
    sales: number;
  };
};
```

### 3. Proper Type Assertions (Double Assertion Pattern)

```typescript
// ✅ CORRECT - React Hook Form resolver typing
import { useForm, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

const form = useForm<FormData>({
  resolver: yupResolver(schema) as unknown as Resolver<FormData>,
});

// ✅ CORRECT - TanStack Table Control typing
import { Control } from 'react-hook-form';

<FormField
  control={form.control as unknown as Control<FormData>}
  name="fieldName"
  // ...
/>

// ✅ CORRECT - Array type casting
const items = (data as Record<string, unknown>[]).map((item) => ({
  id: String(item.id ?? ''),
  name: String(item.name ?? ''),
}));
```

### 4. Proper Interface Definitions

```typescript
// ✅ CORRECT - Complete interface definition
interface ActionResponse<T> {
  status: number;
  message: string;
  data: T | null;
}

// ✅ CORRECT - Union types instead of any
type InputValue = string | number | boolean | null;

// ✅ CORRECT - Generic constraints
interface DataTable<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
}

// ✅ CORRECT - Utility types
type PartialUser = Partial<User>;
type ReadonlyUser = Readonly<User>;
type PickedUser = Pick<User, 'id' | 'name'>;
```

### 5. Type Guards and Narrowing

```typescript
// ✅ CORRECT - Type guard function
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}

// ✅ CORRECT - Using type guards
const data: unknown = fetchData();
if (isUser(data)) {
  console.log(data.name);  // TypeScript knows it's a User
}

// ✅ CORRECT - instanceof checks
if (error instanceof Error) {
  console.log(error.message);
}

// ✅ CORRECT - typeof checks
if (typeof value === 'string') {
  console.log(value.toUpperCase());
}
```

### 6. Generic Functions

```typescript
// ✅ CORRECT - Generic function with constraints
function mapArray<T, U>(
  array: T[],
  mapper: (item: T) => U
): U[] {
  return array.map(mapper);
}

// ✅ CORRECT - Generic with default
function createStore<T = Record<string, unknown>>(
  initialState: T
): Store<T> {
  return new Store(initialState);
}
```

### 7. Proper Event Handlers

```typescript
// ✅ CORRECT - React event handlers
const handleClick = (
  event: React.MouseEvent<HTMLButtonElement>
): void => {
  event.preventDefault();
};

const handleChange = (
  event: React.ChangeEvent<HTMLInputElement>
): void => {
  console.log(event.target.value);
};

// ✅ CORRECT - Form submission
const handleSubmit = (
  event: React.FormEvent<HTMLFormElement>
): void => {
  event.preventDefault();
};
```

### 8. Async/Promise Types

```typescript
// ✅ CORRECT - Promise return types
async function fetchUser(id: string): Promise<User> {
  const response = await api.get(`/users/${id}`);
  return response.data;
}

// ✅ CORRECT - Multiple async operations
async function processData(
  id: string
): Promise<{ user: User; stats: Stats }> {
  const [user, stats] = await Promise.all([
    fetchUser(id),
    fetchStats(id),
  ]);
  return { user, stats };
}
```

---

## 🎯 Common Scenarios and Solutions

### Scenario 1: React Hook Form with Yup

```typescript
// ✅ CORRECT
import { useForm, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  name: yup.string().required(),
  email: yup.string().email().required(),
});

type FormData = {
  name: string;
  email: string;
};

const form = useForm<FormData>({
  resolver: yupResolver(schema) as unknown as Resolver<FormData>,
  defaultValues: {
    name: '',
    email: '',
  },
});
```

### Scenario 2: TanStack Query Hooks

```typescript
// ✅ CORRECT
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useUsers(orgId: string) {
  return useQuery({
    queryKey: ['users', orgId] as const,
    queryFn: async (): Promise<User[]> => {
      const result = await getUsers(orgId);
      return result.users;
    },
    enabled: Boolean(orgId),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserData): Promise<User> => {
      return await createUser(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

### Scenario 3: Server Actions

```typescript
// ✅ CORRECT
'use server';

import { ActionResponse } from '@/interfaces';
import { prisma } from '@/actions/utils';
import { Customer } from '@/generated/prisma';

export async function createCustomer(
  customerData: CreateCustomerData
): Promise<ActionResponse<Customer>> {
  try {
    const customer = await prisma.customer.create({
      data: customerData,
    });

    return {
      status: 201,
      message: 'Customer created successfully',
      data: customer,
    };
  } catch (error) {
    return {
      status: 500,
      message: error instanceof Error ? error.message : 'Unknown error',
      data: null,
    };
  }
}
```

### Scenario 4: Prisma Relations with Includes

```typescript
// ✅ CORRECT - Define type with unknown for relations
type CustomerWithIncludes = Customer & {
  sales?: unknown[];
  _count?: {
    sales: number;
  };
};

// ✅ CORRECT - When mapping over relations, cast properly
const salesData = (customer.sales as Record<string, unknown>[])
  .map((sale) => ({
    id: String(sale.id ?? ''),
    total: Number(sale.total ?? 0),
    date: new Date(sale.saleDate as string),
  }));
```

---

## 🚫 Consequences of Violations

1. **Build Failure**: Code with `any` will fail `pnpm build`
2. **PR Rejection**: Pull requests with type violations will be automatically rejected
3. **Runtime Errors**: Lack of type safety leads to production bugs
4. **Code Review**: Manual code reviews will reject any type safety violations
5. **CI/CD Failure**: Automated pipelines will fail on type errors

---

## 📝 Checklist Before Committing Code

- [ ] No `any` type anywhere in the code
- [ ] No `@ts-ignore` or `@ts-expect-error` comments
- [ ] No ESLint disable comments for type rules
- [ ] All function parameters have explicit types
- [ ] All function return types are declared
- [ ] All variables have proper types (inferred or explicit)
- [ ] Used `unknown` for truly unknown types, then narrowed
- [ ] Proper type assertions using double assertion pattern
- [ ] All imports include necessary type imports
- [ ] Code passes `pnpm build` without type errors
- [ ] ESLint passes without type-related warnings

---

## 🆘 If You're Stuck with a Type Error

**DO:**
1. Use `unknown` and create a type guard
2. Define a proper interface or type
3. Use generics with proper constraints
4. Import types from the library (`Resolver`, `Control`, etc.)
5. Use the double assertion: `as unknown as TargetType`
6. Ask for help from senior developers

**DON'T:**
1. Use `any` "just to make it work"
2. Use `@ts-ignore` to skip the error
3. Disable ESLint rules
4. Assume type safety doesn't matter
5. Ship code with type errors

---

## 💡 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [TanStack Query TypeScript Guide](https://tanstack.com/query/latest/docs/react/typescript)

---

**Remember: Type safety is not optional. It's a core requirement for production-quality code.**

This is a **ZERO TOLERANCE** policy. Every line of code must be properly typed.

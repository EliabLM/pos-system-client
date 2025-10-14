import { Prisma, Product } from "@/generated/prisma";

export interface TempUser {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  clerkId: string;
  id: string;
  organizationId: string;
}

export interface User {
  id: string;
  organizationId: string;
  storeId: string | null;
  clerkId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  organization: Organization | null;
  store: Store | null;
}

export interface Store {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  address: string;
  city: string | null;
  department: string | null;
  phone: string | null;
  saleNumberPrefix: string;
  lastSaleNumber: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Organization {
  id: string;
  clerkOrgId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  taxId: null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
}

export interface ActionResponse<T = unknown> {
  status: number;
  message: string;
  data: T | null;
}

export type CreateProductInput = Omit<
  Product,
  'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'costPrice' | 'salePrice'
> & {
  costPrice: number | string;
  salePrice: number | string;
};

const productInclude: Prisma.ProductInclude = {
  organization: true,
  brand: true,
  category: true,
  unitMeasure: true,
  saleItems: {
    take: 5,
    orderBy: { createdAt: 'desc' },
  },
  purchaseItems: {
    take: 5,
    orderBy: { createdAt: 'desc' },
  },
  stockMovements: {
    take: 5,
    orderBy: { createdAt: 'desc' },
  },
  _count: {
    select: {
      saleItems: true,
      purchaseItems: true,
      stockMovements: true,
    },
  },
};

export type ProductWithIncludes = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

export type ProductWithIncludesNumberPrice = Omit<
  ProductWithIncludes,
  'salePrice' | 'costPrice'
> & {
  salePrice: number;
  costPrice: number;
};

export type Metadata = {
  onboardingComplete: boolean
}

// Export dashboard interfaces
export * from './dashboard';

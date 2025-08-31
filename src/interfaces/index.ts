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
    storeId: null;
    clerkId: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: null;
    organization: Organization | null;
    store: null;
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

export interface ActionResponse<T = null> {
    status: number;
    message: string;
    data: T | null;
}

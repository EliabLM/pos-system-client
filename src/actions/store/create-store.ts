'use server'

import { PrismaClient } from "@/generated/prisma";

interface StoreRequest {
    organizationId: string;
    name: string;
    description?: string;
    address: string;
    city?: string;
    department?: string;
    phone: string;
    saleNumberPrefix: string;
}

const prisma = new PrismaClient();

export const createStoreAction = async (storeInfo: StoreRequest) => {
    try {

        const result = await prisma.store.create({
            data: {
                name: storeInfo.name,
                organizationId: storeInfo.organizationId,
                description: storeInfo.description,
                address: storeInfo.address,
                city: storeInfo.city,
                department: storeInfo.department,
                phone: storeInfo.phone,
                saleNumberPrefix: storeInfo.saleNumberPrefix
            }
        })
        console.log("🚀 ~ createStoreAction ~ result:", result)

        return {
            status: 'SUCCESS',
            data: result
        }
    } catch (error) {
        console.error("🚀 ~ createStoreAction ~ error:", error);

        return {
            status: 'ERROR',
            data: null
        }
    }
}
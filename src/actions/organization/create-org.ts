'use server'

import { PrismaClient } from "@/generated/prisma";



interface OrgRequest {
    clerkOrgId: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    department?: string;
}

const prisma = new PrismaClient();

export const createOrgAction = async (org: OrgRequest) => {
    try {
        const result = await prisma.organization.create({
            data: {
                name: org.name,
                clerkOrgId: org.clerkOrgId,
                email: org.email,
                phone: org.phone,
                address: org.address,
                city: 'Cartagena',
                department: 'Bolívar'
            }
        })
        console.log("🚀 ~ createOrgAction ~ result:", result)

        return {
            status: 'SUCCESS',
            data: result
        }
    } catch (error) {
        console.error("🚀 ~ createOrgAction ~ error:", error)
        return {
            status: 'ERROR',
            data: null
        }
    }
}
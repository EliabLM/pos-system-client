'use server'

import { PrismaClient, UserRole } from "@/generated/prisma";

type ActionResponse = "SUCCESS" | "ERROR"

interface UserRequest {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    clerkId: string;
    role: UserRole;
}

const prisma = new PrismaClient();

export const createUserAction = async (user: UserRequest): Promise<ActionResponse> => {
    try {
        const result = await prisma.user.create({
            data: {
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                organizationId: 'test-001',
                clerkId: user.clerkId,
                email: user.email,
                role: user.role,
            }
        })
        console.log("🚀 ~ createUserAction ~ result:", result)


        return "SUCCESS"
    } catch (error) {
        console.error("🚀 ~ createUserAction ~ error:", error)
        return 'ERROR'
    }
}
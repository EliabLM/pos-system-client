'use server'

import { PrismaClient, UserRole } from "@/generated/prisma";

interface UserRequest {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    clerkId: string;
    role: UserRole;
}

const prisma = new PrismaClient();

export const createUserAction = async (user: UserRequest) => {
    try {
        const result = await prisma.user.create({
            data: {
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                clerkId: user.clerkId,
                email: user.email,
                role: user.role,
            }
        })
        console.log("🚀 ~ createUserAction ~ result:", result)


        return {
            status: 'SUCCESS',
            data: result
        }
    } catch (error) {
        console.error("🚀 ~ createUserAction ~ error:", error)
        return {
            status: 'ERROR',
            data: null
        }
    }
}
'use server'

import { PrismaClient } from "@/generated/prisma";


const prisma = new PrismaClient();

export async function getUserByClerkId(clerkId: string) {

    try {

        const user = await prisma.user.findUnique({
            where: {
                clerkId: clerkId
            },
            include: {
                organization: true,
                store: true
            }
        })

        if (!user) {
            return {
                state: 'ERROR',
                data: null
            }
        }

        return {
            state: 'SUCCESS',
            data: user
        }

    } catch (error) {
        console.error("🚀 ~ getUserByClerkId ~ error:", error);

        return {
            state: 'ERROR',
            data: null
        }
    }
}



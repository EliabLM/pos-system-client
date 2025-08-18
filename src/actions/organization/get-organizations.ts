'use server'

import { PrismaClient } from "@/generated/prisma";

type ActionResponse = "SUCCESS" | "ERROR"

const prisma = new PrismaClient();

export const getOrganizations = async () => {
    try {
        const result = prisma.organization.findMany()
        return result
    } catch (error) {
        console.error("🚀 ~ getOrganizations ~ error:", error)
        return "ERROR"
    }
}
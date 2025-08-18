'use server'

import { PrismaClient } from "@/generated/prisma"

const prisma = new PrismaClient();

export const updateUserOrgAction = async (userId: string, orgId: string) => {
    try {
        const result = await prisma.user.update(
            {
                where: {
                    id: userId
                },
                data: {
                    organizationId: orgId
                }
            }
        );

        return 'SUCCESS';
    } catch (error) {
        console.log("🚀 ~ updateUserOrg ~ error:", error);
        return 'ERROR';
    }
}
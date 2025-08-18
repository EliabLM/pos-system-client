"use server";

import { clerkClient } from "@clerk/nextjs/server";

export async function deleteOrgByClerkId(clerkId: string) {
    try {
        const client = await clerkClient()
        await client.organizations.deleteOrganization(clerkId);
        return { success: true, message: "Organización eliminada correctamente" };
    } catch (error: any) {
        console.error("Error eliminando organización:", error);
        return { success: false, message: error.message || "Error eliminando organización" };
    }
}
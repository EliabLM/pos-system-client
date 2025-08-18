"use server";

import { clerkClient } from "@clerk/nextjs/server";

export async function deleteUserByClerkId(clerkId: string) {
    try {
        const client = await clerkClient()
        await client.users.deleteUser(clerkId);
        return { success: true, message: "Usuario eliminado correctamente" };
    } catch (error: any) {
        console.error("Error eliminando usuario:", error);
        return { success: false, message: error.message || "Error eliminando usuario" };
    }
}

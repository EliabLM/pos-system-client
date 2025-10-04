import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

const f = createUploadthing();

// Crear instancia de utapi
export const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN,
});

// Definir el router de archivos
export const ourFileRouter = {
  // Ruta para imágenes de productos
  productImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      // Verificar autenticación con JWT
      const cookieStore = await cookies();
      const token = cookieStore.get('auth-token')?.value;

      if (!token) throw new Error("Unauthorized");

      const payload = verifyToken(token);

      if (!payload || !payload.userId) throw new Error("Unauthorized");

      return { userId: payload.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Se ejecuta cuando la subida se completa
      // Aquí podrías guardar la referencia en tu base de datos
      // await saveFileReference(file.url, metadata.userId);

      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

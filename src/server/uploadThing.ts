import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";
import { auth } from '@clerk/nextjs/server';

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
      // Aquí puedes agregar autenticación/autorización
      // Por ejemplo, verificar que el usuario esté logueado
      const { userId } = await auth();

      if (!userId) throw new Error("Unauthorized");

      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Se ejecuta cuando la subida se completa
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.ufsUrl);

      // Aquí podrías guardar la referencia en tu base de datos
      // await saveFileReference(file.url, metadata.userId);

      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

'use server';

import { utapi } from '@/server/uploadThing';
import { Product, Prisma } from '@/generated/prisma';
import { ActionResponse, ProductWithIncludesNumberPrice } from '@/interfaces';
import {
  prisma,
  checkAdminRole,
  unauthorizedResponse,
  checkOrgId,
  emptyOrgIdResponse,
} from '../utils';

const extractFileKeyFromUrl = (url: string): string | null => {
  try {
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    return fileName || null;
  } catch {
    return null;
  }
};

// Función auxiliar para eliminar imagen de UploadThing
export const deleteImageFromUploadThing = async (imageUrl: string): Promise<void> => {
  try {
    const fileKey = extractFileKeyFromUrl(imageUrl);
    if (fileKey) {
      await utapi.deleteFiles(fileKey);
    }
  } catch (error) {
    console.error('Error deleting image from UploadThing:', error);
    // No lanzamos el error para no bloquear la operación principal
  }
};

export const uploadImage = async (file: File) => {
  try {
    const response = await utapi.uploadFiles(file);
    return response.data;
  } catch (error) {
    console.error("🚀 ~ uploadImage ~ error:", error)
  }
}

const productInclude: Prisma.ProductInclude = {
  organization: true,
  brand: true,
  category: true,
  unitMeasure: true,
  saleItems: {
    take: 5,
    orderBy: { createdAt: 'desc' },
  },
  purchaseItems: {
    take: 5,
    orderBy: { createdAt: 'desc' },
  },
  stockMovements: {
    take: 5,
    orderBy: { createdAt: 'desc' },
  },
  _count: {
    select: {
      saleItems: true,
      purchaseItems: true,
      stockMovements: true,
    },
  },
};

// CREATE
export const createProduct = async (
  orgId: string,
  userId: string,
  productData: Omit<
    Product,
    'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >
): Promise<ActionResponse<Product | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    // Verificar unicidad de barcode si se proporciona
    if (productData.barcode) {
      const existingProductByBarcode = await prisma.product.findFirst({
        where: {
          organizationId: orgId,
          barcode: productData.barcode,
          isDeleted: false,
        },
      });

      if (existingProductByBarcode) {
        return {
          status: 409,
          message: 'Ya existe un producto con ese código de barras en la organización',
          data: null,
        };
      }
    }

    // Verificar unicidad de SKU si se proporciona
    if (productData.sku) {
      const existingProductBySku = await prisma.product.findFirst({
        where: {
          organizationId: orgId,
          sku: productData.sku,
          isDeleted: false,
        },
      });

      if (existingProductBySku) {
        return {
          status: 409,
          message: 'Ya existe un producto con ese SKU en la organización',
          data: null,
        };
      }
    }

    // Verificar que unitMeasureId existe
    // if (productData.unitMeasureId) {
    //   const unitMeasure = await prisma.unitMeasure.findUnique({
    //     where: { id: productData.unitMeasureId },
    //   });

    //   if (!unitMeasure) {
    //     return {
    //       status: 400,
    //       message: 'La unidad de medida especificada no existe',
    //       data: null,
    //     };
    //   }
    // }

    // Verificar que categoryId existe si se proporciona
    if (productData.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: productData.categoryId,
          organizationId: orgId,
          isDeleted: false,
        },
      });

      if (!category) {
        return {
          status: 400,
          message: 'La categoría especificada no existe',
          data: null,
        };
      }
    }

    // Verificar que brandId existe si se proporciona
    if (productData.brandId) {
      const brand = await prisma.brand.findFirst({
        where: {
          id: productData.brandId,
          organizationId: orgId,
          isDeleted: false,
        },
      });

      if (!brand) {
        return {
          status: 400,
          message: 'La marca especificada no existe',
          data: null,
        };
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        ...productData,
        organizationId: orgId,
      },
      include: productInclude,
    });

    return {
      status: 201,
      message: 'Producto creado exitosamente',
      data: newProduct,
    };
  } catch (error) {
    console.error('Error creating product:', error);

    if (productData.image) {
      await deleteImageFromUploadThing(productData.image);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target?.includes('barcode')) {
          return {
            status: 409,
            message: 'Ya existe un producto con ese código de barras',
            data: null,
          };
        }
        if (target?.includes('sku')) {
          return {
            status: 409,
            message: 'Ya existe un producto con ese SKU',
            data: null,
          };
        }
      }
      if (error.code === 'P2003') {
        return {
          status: 400,
          message: 'Una de las referencias especificadas no existe',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET MANY
export const getProductsByOrgId = async (
  orgId: string,
  filters?: {
    isActive?: boolean;
    categoryId?: string;
    brandId?: string;
    lowStock?: boolean;
    search?: string;
  },
  includeDeleted: boolean = false
): Promise<ActionResponse<ProductWithIncludesNumberPrice[] | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.ProductWhereInput = {
      organizationId: orgId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters?.categoryId) {
      whereClause.categoryId = filters.categoryId;
    }

    if (filters?.brandId) {
      whereClause.brandId = filters.brandId;
    }

    if (filters?.lowStock) {
      whereClause.currentStock = {
        lte: prisma.product.fields.minStock,
      };
    }

    if (filters?.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 200,
      message: 'Productos obtenidos exitosamente',
      data: products.map(item => ({ ...item, salePrice: Number(item.salePrice), costPrice: Number(item.costPrice) })),
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ONE
export const getProductById = async (
  productId: string
): Promise<ActionResponse<Product | null>> => {
  try {
    if (!productId)
      return {
        status: 400,
        message: 'ID del producto es requerido',
        data: null,
      };

    const product = await prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
      include: productInclude,
    });

    if (!product)
      return { status: 404, message: 'Producto no encontrado', data: null };

    return {
      status: 200,
      message: 'Producto obtenido exitosamente',
      data: product,
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET BY BARCODE
export const getProductByBarcode = async (
  orgId: string,
  barcode: string
): Promise<ActionResponse<Product | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    if (!barcode)
      return {
        status: 400,
        message: 'Código de barras es requerido',
        data: null,
      };

    const product = await prisma.product.findFirst({
      where: {
        organizationId: orgId,
        barcode,
        isDeleted: false,
        isActive: true,
      },
      include: productInclude,
    });

    if (!product)
      return { status: 404, message: 'Producto no encontrado', data: null };

    return {
      status: 200,
      message: 'Producto obtenido exitosamente',
      data: product,
    };
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET BY SKU
export const getProductBySku = async (
  orgId: string,
  sku: string
): Promise<ActionResponse<Product | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    if (!sku)
      return {
        status: 400,
        message: 'SKU es requerido',
        data: null,
      };

    const product = await prisma.product.findFirst({
      where: {
        organizationId: orgId,
        sku,
        isDeleted: false,
        isActive: true,
      },
      include: productInclude,
    });

    if (!product)
      return { status: 404, message: 'Producto no encontrado', data: null };

    return {
      status: 200,
      message: 'Producto obtenido exitosamente',
      data: product,
    };
  } catch (error) {
    console.error('Error fetching product by SKU:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE
export const updateProduct = async (
  productId: string,
  userId: string,
  updateData: Partial<
    Omit<
      Product,
      'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
    >
  >
): Promise<ActionResponse<Product | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!productId)
      return {
        status: 400,
        message: 'ID del producto es requerido',
        data: null,
      };

    // Verificar que el producto exista y no esté eliminado
    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
    });

    if (!existingProduct) {
      return { status: 404, message: 'Producto no encontrado', data: null };
    }

    // Verificar unicidad de barcode si se está actualizando
    if (updateData.barcode && updateData.barcode !== existingProduct.barcode) {
      const duplicateProductByBarcode = await prisma.product.findFirst({
        where: {
          organizationId: existingProduct.organizationId,
          barcode: updateData.barcode,
          isDeleted: false,
          id: { not: productId },
        },
      });

      if (duplicateProductByBarcode) {
        return {
          status: 409,
          message: 'Ya existe un producto con ese código de barras',
          data: null,
        };
      }
    }

    // Verificar unicidad de SKU si se está actualizando
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const duplicateProductBySku = await prisma.product.findFirst({
        where: {
          organizationId: existingProduct.organizationId,
          sku: updateData.sku,
          isDeleted: false,
          id: { not: productId },
        },
      });

      if (duplicateProductBySku) {
        return {
          status: 409,
          message: 'Ya existe un producto con ese SKU',
          data: null,
        };
      }
    }

    // Verificar referencias si se están actualizando
    if (updateData.categoryId && updateData.categoryId !== existingProduct.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: updateData.categoryId,
          organizationId: existingProduct.organizationId,
          isDeleted: false,
        },
      });

      if (!category) {
        return {
          status: 400,
          message: 'La categoría especificada no existe',
          data: null,
        };
      }
    }

    if (updateData.brandId && updateData.brandId !== existingProduct.brandId) {
      const brand = await prisma.brand.findFirst({
        where: {
          id: updateData.brandId,
          organizationId: existingProduct.organizationId,
          isDeleted: false,
        },
      });

      if (!brand) {
        return {
          status: 400,
          message: 'La marca especificada no existe',
          data: null,
        };
      }
    }

    // if (updateData.unitMeasureId && updateData.unitMeasureId !== existingProduct.unitMeasureId) {
    //   const unitMeasure = await prisma.unitMeasure.findUnique({
    //     where: { id: updateData.unitMeasureId },
    //   });

    //   if (!unitMeasure) {
    //     return {
    //       status: 400,
    //       message: 'La unidad de medida especificada no existe',
    //       data: null,
    //     };
    //   }
    // }

    // *** NUEVO BLOQUE: Gestionar cambio de imagen ***
    const oldImageUrl = existingProduct.image;
    const newImageUrl = updateData.image;

    // Si se está cambiando la imagen y había una imagen anterior, eliminarla
    if (newImageUrl && oldImageUrl && newImageUrl !== oldImageUrl) {
      await deleteImageFromUploadThing(oldImageUrl);
    }

    // Si se está eliminando la imagen (se pasa null o undefined)
    if ((updateData.image === null || updateData.image === undefined) && oldImageUrl) {
      await deleteImageFromUploadThing(oldImageUrl);
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: productInclude,
    });

    return {
      status: 200,
      message: 'Producto actualizado exitosamente',
      data: updatedProduct,
    };
  } catch (error) {
    console.error('Error updating product:', error);

    if (updateData.image) {
      await deleteImageFromUploadThing(updateData.image);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target?.includes('barcode')) {
          return {
            status: 409,
            message: 'Ya existe un producto con ese código de barras',
            data: null,
          };
        }
        if (target?.includes('sku')) {
          return {
            status: 409,
            message: 'Ya existe un producto con ese SKU',
            data: null,
          };
        }
      }
      if (error.code === 'P2025') {
        return { status: 404, message: 'Producto no encontrado', data: null };
      }
      if (error.code === 'P2003') {
        return {
          status: 400,
          message: 'Una de las referencias especificadas no existe',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE STOCK
export const updateStock = async (
  productId: string,
  userId: string,
  stockChange: number,
  type: 'SET' | 'INCREMENT' | 'DECREMENT'
): Promise<ActionResponse<Product | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!productId)
      return {
        status: 400,
        message: 'ID del producto es requerido',
        data: null,
      };

    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
    });

    if (!existingProduct) {
      return { status: 404, message: 'Producto no encontrado', data: null };
    }

    let newStock: number;
    switch (type) {
      case 'SET':
        newStock = stockChange;
        break;
      case 'INCREMENT':
        newStock = existingProduct.currentStock + stockChange;
        break;
      case 'DECREMENT':
        newStock = existingProduct.currentStock - stockChange;
        break;
      default:
        return {
          status: 400,
          message: 'Tipo de operación de stock inválido',
          data: null,
        };
    }

    if (newStock < 0) {
      return {
        status: 400,
        message: 'El stock no puede ser negativo',
        data: null,
      };
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        currentStock: newStock,
        updatedAt: new Date(),
      },
      include: productInclude,
    });

    return {
      status: 200,
      message: 'Stock actualizado exitosamente',
      data: updatedProduct,
    };
  } catch (error) {
    console.error('Error updating stock:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Producto no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET LOW STOCK PRODUCTS
export const getLowStockProducts = async (
  orgId: string
): Promise<ActionResponse<Product[] | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const products = await prisma.product.findMany({
      where: {
        organizationId: orgId,
        isDeleted: false,
        isActive: true,
        currentStock: {
          lte: prisma.product.fields.minStock,
        },
      },
      include: productInclude,
      orderBy: { currentStock: 'asc' },
    });

    return {
      status: 200,
      message: 'Productos con stock bajo obtenidos exitosamente',
      data: products,
    };
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// SOFT DELETE
export const softDeleteProduct = async (
  productId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!productId)
      return {
        status: 400,
        message: 'ID del producto es requerido',
        data: null,
      };

    // Verificar si hay items de venta asociados
    const saleItemsCount = await prisma.saleItem.count({
      where: { productId },
    });

    // Verificar si hay items de compra asociados
    const purchaseItemsCount = await prisma.purchaseItem.count({
      where: { productId },
    });

    if (saleItemsCount > 0 || purchaseItemsCount > 0) {
      return {
        status: 409,
        message: `No se puede eliminar el producto. Tiene ${saleItemsCount + purchaseItemsCount} transacción(es) asociada(s)`,
        data: null,
      };
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Producto eliminado (soft) exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error soft deleting product:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Producto no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// RESTORE
export const restoreProduct = async (
  productId: string,
  userId: string
): Promise<ActionResponse<Product | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!productId)
      return {
        status: 400,
        message: 'ID del producto es requerido',
        data: null,
      };

    const restoredProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      },
      include: productInclude,
    });

    return {
      status: 200,
      message: 'Producto restaurado exitosamente',
      data: restoredProduct,
    };
  } catch (error) {
    console.error('Error restoring product:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Producto no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// HARD DELETE
export const deleteProduct = async (
  productId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!productId)
      return {
        status: 400,
        message: 'ID del producto es requerido',
        data: null,
      };

    // Verificar si hay transacciones asociadas
    const saleItemsCount = await prisma.saleItem.count({
      where: { productId },
    });

    const purchaseItemsCount = await prisma.purchaseItem.count({
      where: { productId },
    });

    const stockMovementsCount = await prisma.stockMovement.count({
      where: { productId },
    });

    if (saleItemsCount > 0 || purchaseItemsCount > 0 || stockMovementsCount > 0) {
      return {
        status: 409,
        message: `No se puede eliminar permanentemente el producto. Tiene transacciones o movimientos asociados. Use eliminación suave en su lugar.`,
        data: null,
      };
    }

    const productToDelete = await prisma.product.findUnique({
      where: { id: productId },
    });

    await prisma.product.delete({ where: { id: productId } });

    if (productToDelete?.image) {
      await deleteImageFromUploadThing(productToDelete.image);
    }

    return {
      status: 200,
      message: 'Producto eliminado permanentemente',
      data: null,
    };
  } catch (error) {
    console.error('Error hard deleting product:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Producto no encontrado', data: null };
      }
      if (error.code === 'P2003') {
        return {
          status: 409,
          message: 'No se puede eliminar el producto debido a relaciones existentes',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

export const deleteProductImage = async (
  productId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!productId)
      return {
        status: 400,
        message: 'ID del producto es requerido',
        data: null,
      };

    const product = await prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
    });

    if (!product) {
      return { status: 404, message: 'Producto no encontrado', data: null };
    }

    if (!product.image) {
      return {
        status: 400,
        message: 'El producto no tiene imagen para eliminar',
        data: null,
      };
    }

    // Eliminar imagen de UploadThing
    await deleteImageFromUploadThing(product.image);

    // Actualizar producto removiendo la referencia a la imagen
    await prisma.product.update({
      where: { id: productId },
      data: {
        image: null,
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Imagen del producto eliminada exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error deleting product image:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

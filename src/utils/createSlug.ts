export const createSlug = (name: string): string => {
    return name
        .toLowerCase()
        .normalize('NFD') // Normalizar caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
        .replace(/\s+/g, '-') // Reemplazar espacios con guiones
        .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
        .replace(/^-|-$/g, '') // Remover guiones al inicio y final
        .substring(0, 30); // Limitar longitud
};
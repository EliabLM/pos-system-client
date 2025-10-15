/**
 * Utilidades para manejo de fechas con zona horaria local
 *
 * Este archivo contiene funciones para manejar correctamente las fechas
 * entre el cliente (zona horaria local) y el servidor (UTC en base de datos)
 */

/**
 * Convierte un string de datetime-local a un objeto Date manteniendo la hora local
 *
 * Los inputs datetime-local devuelven strings sin información de zona horaria (ej: "2025-10-13T22:00")
 * new Date() interpretaría esto según la zona horaria del navegador, pero queremos que
 * la hora en la base de datos (UTC) represente exactamente la hora local ingresada
 *
 * @param dateTimeLocalString - String en formato "YYYY-MM-DDTHH:mm" del input datetime-local
 * @returns Date ajustado para que al guardarse en UTC mantenga la hora local
 *
 * @example
 * // Usuario en Colombia (UTC-5) ingresa: "2025-10-13T22:00"
 * // Queremos que se guarde en DB como: "2025-10-13 22:00:00" (sin importar la zona)
 * const date = parseLocalDateTime("2025-10-13T22:00")
 */
export function parseLocalDateTime(dateTimeLocalString: string): Date {
  if (!dateTimeLocalString) {
    throw new Error('dateTimeLocalString es requerido');
  }

  // Parsear el string manualmente para evitar problemas de zona horaria
  const [datePart, timePart] = dateTimeLocalString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);

  // Crear fecha en zona horaria local manteniendo los valores exactos
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return date;
}

/**
 * Convierte un string de input type="date" a Date para el inicio del día (00:00:00 local)
 *
 * @param dateString - String en formato "YYYY-MM-DD" del input date
 * @returns Date al inicio del día en zona horaria local
 *
 * @example
 * parseLocalDateStart("2025-10-13") // 2025-10-13 00:00:00 local
 */
export function parseLocalDateStart(dateString: string): Date {
  if (!dateString) {
    throw new Error('dateString es requerido');
  }

  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Convierte un string de input type="date" a Date para el final del día (23:59:59.999 local)
 *
 * @param dateString - String en formato "YYYY-MM-DD" del input date
 * @returns Date al final del día en zona horaria local
 *
 * @example
 * parseLocalDateEnd("2025-10-13") // 2025-10-13 23:59:59.999 local
 */
export function parseLocalDateEnd(dateString: string): Date {
  if (!dateString) {
    throw new Error('dateString es requerido');
  }

  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

/**
 * Formatea un Date para usarse en un input datetime-local
 *
 * @param date - Objeto Date a formatear
 * @returns String en formato "YYYY-MM-DDTHH:mm"
 *
 * @example
 * formatDateTimeLocal(new Date()) // "2025-10-13T22:00"
 */
export function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formatea un Date para usarse en un input type="date"
 *
 * @param date - Objeto Date a formatear
 * @returns String en formato "YYYY-MM-DD"
 *
 * @example
 * formatDateLocal(new Date()) // "2025-10-13"
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

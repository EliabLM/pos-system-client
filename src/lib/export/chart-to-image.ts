/**
 * Chart to Image Converter
 *
 * Converts chart elements (Recharts) to base64 images for embedding in PDFs.
 * Client-side only - uses html2canvas for conversion.
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

/**
 * Convert a chart element to a base64 image
 *
 * @param chartElement - The HTML element containing the chart
 * @param format - Image format ('png' or 'jpeg')
 * @param quality - Image quality (0-1) for jpeg
 * @returns Promise resolving to base64 image string
 * @throws Error if element not found or conversion fails
 */
export async function chartToImage(
  chartElement: HTMLElement,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.95
): Promise<string> {
  try {
    // Dynamic import for client-side only library
    const html2canvas = await import('html2canvas');

    if (!chartElement) {
      throw new Error('Chart element not found');
    }

    // Convert element to canvas
    const canvas = await html2canvas.default(chartElement, {
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null, // Transparent background
    });

    // Convert canvas to base64 image
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const imageData = canvas.toDataURL(mimeType, quality);

    return imageData;
  } catch (error) {
    console.error('Error converting chart to image:', error);
    throw new Error(
      error instanceof Error
        ? `Error al convertir gráfico: ${error.message}`
        : 'Error desconocido al convertir gráfico'
    );
  }
}

/**
 * Convert a chart element by ID to a base64 image
 *
 * @param chartId - The ID of the chart element
 * @param format - Image format ('png' or 'jpeg')
 * @param quality - Image quality (0-1) for jpeg
 * @returns Promise resolving to base64 image string
 * @throws Error if element not found or conversion fails
 */
export async function chartToImageById(
  chartId: string,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.95
): Promise<string> {
  const chartElement = document.getElementById(chartId);

  if (!chartElement) {
    throw new Error(`Chart element with ID "${chartId}" not found`);
  }

  return chartToImage(chartElement, format, quality);
}

/**
 * Download a chart as an image file
 *
 * @param chartElement - The HTML element containing the chart
 * @param filename - Output filename (without extension)
 * @param format - Image format ('png' or 'jpeg')
 * @param quality - Image quality (0-1) for jpeg
 * @throws Error if conversion or download fails
 */
export async function downloadChartAsImage(
  chartElement: HTMLElement,
  filename: string,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.95
): Promise<void> {
  try {
    const imageData = await chartToImage(chartElement, format, quality);

    // Create download link
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `${filename}.${format}`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading chart as image:', error);
    throw new Error(
      error instanceof Error
        ? `Error al descargar gráfico: ${error.message}`
        : 'Error desconocido al descargar gráfico'
    );
  }
}

/**
 * Download a chart by ID as an image file
 *
 * @param chartId - The ID of the chart element
 * @param filename - Output filename (without extension)
 * @param format - Image format ('png' or 'jpeg')
 * @param quality - Image quality (0-1) for jpeg
 * @throws Error if element not found or download fails
 */
export async function downloadChartAsImageById(
  chartId: string,
  filename: string,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.95
): Promise<void> {
  const chartElement = document.getElementById(chartId);

  if (!chartElement) {
    throw new Error(`Chart element with ID "${chartId}" not found`);
  }

  return downloadChartAsImage(chartElement, filename, format, quality);
}

/**
 * Convert multiple charts to images
 *
 * @param chartIds - Array of chart element IDs
 * @param format - Image format ('png' or 'jpeg')
 * @param quality - Image quality (0-1) for jpeg
 * @returns Promise resolving to array of base64 images
 * @throws Error if any conversion fails
 */
export async function convertMultipleCharts(
  chartIds: string[],
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.95
): Promise<string[]> {
  const imagePromises = chartIds.map((chartId) =>
    chartToImageById(chartId, format, quality)
  );

  try {
    return await Promise.all(imagePromises);
  } catch (error) {
    console.error('Error converting multiple charts:', error);
    throw new Error(
      error instanceof Error
        ? `Error al convertir gráficos: ${error.message}`
        : 'Error desconocido al convertir gráficos'
    );
  }
}

/**
 * Get chart dimensions
 *
 * @param chartElement - The HTML element containing the chart
 * @returns Object with width and height
 */
export function getChartDimensions(chartElement: HTMLElement): {
  width: number;
  height: number;
} {
  const rect = chartElement.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Check if chart to image conversion is supported
 *
 * @returns true if supported
 */
export function isChartToImageSupported(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

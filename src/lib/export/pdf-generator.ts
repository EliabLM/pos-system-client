/**
 * PDF Generator Utility
 *
 * Generates PDF files from HTML elements using jsPDF and html2canvas.
 * Client-side only - uses dynamic imports for browser compatibility.
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import type { PDFGeneratorOptions } from '@/interfaces/reports';

/**
 * Generate a PDF from an HTML element
 *
 * @param options - PDF generation options
 * @throws Error if element not found or generation fails
 */
export async function generatePDF(
  options: PDFGeneratorOptions
): Promise<void> {
  const {
    elementId,
    filename,
    orientation = 'landscape',
    title,
    includeDate = true,
    scale = 2,
  } = options;

  try {
    // Dynamic imports for client-side only libraries
    const [{ jsPDF }, html2canvas] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    // Find the element to convert
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Convert HTML to canvas with color fix
    const canvas = await html2canvas.default(element, {
      scale,
      logging: false,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Add CSS override to replace oklch colors with RGB fallbacks
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * {
            --background: rgb(255, 255, 255) !important;
            --foreground: rgb(36, 36, 36) !important;
            --card: rgb(255, 255, 255) !important;
            --card-foreground: rgb(36, 36, 36) !important;
            --primary: rgb(56, 189, 115) !important;
            --primary-foreground: rgb(245, 250, 247) !important;
            --muted: rgb(247, 247, 247) !important;
            --muted-foreground: rgb(140, 140, 140) !important;
            --border: rgb(235, 235, 235) !important;
          }
        `;
        clonedDoc.head.appendChild(style);

        // Ensure white background for PDF
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.backgroundColor = 'white';
          clonedElement.style.padding = '20px';
        }
      },
    });

    // Get canvas dimensions
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = orientation === 'landscape' ? 297 : 210; // A4 size in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    // Add title if provided
    if (title) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, 14, 15);
    }

    // Add date if requested
    if (includeDate) {
      const currentDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const dateX = orientation === 'landscape' ? 230 : 140;
      pdf.text(`Generado: ${currentDate}`, dateX, title ? 15 : 10);
    }

    // Calculate Y position for image (after title/date)
    const startY = title || includeDate ? 25 : 10;

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 10, startY, imgWidth - 20, imgHeight);

    // Handle multi-page PDFs
    const pageHeight = orientation === 'landscape' ? 210 : 297;
    let heightLeft = imgHeight - (pageHeight - startY);

    while (heightLeft > 0) {
      pdf.addPage();
      pdf.addImage(
        imgData,
        'PNG',
        10,
        -(pageHeight - startY) - (imgHeight - heightLeft),
        imgWidth - 20,
        imgHeight
      );
      heightLeft -= pageHeight;
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(
      error instanceof Error
        ? `Error al generar PDF: ${error.message}`
        : 'Error desconocido al generar PDF'
    );
  }
}

/**
 * Generate a simple PDF with text content
 *
 * @param filename - Output filename (without extension)
 * @param title - Document title
 * @param content - Array of text lines to include
 * @param orientation - Page orientation
 */
export async function generateSimplePDF(
  filename: string,
  title: string,
  content: string[],
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  try {
    const { jsPDF } = await import('jspdf');

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    // Add title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 14, 20);

    // Add date
    const currentDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generado: ${currentDate}`, 14, 30);

    // Add content
    pdf.setFontSize(12);
    let yPosition = 40;
    const lineHeight = 7;
    const pageHeight = orientation === 'landscape' ? 210 : 297;

    content.forEach((line) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(line, 14, yPosition);
      yPosition += lineHeight;
    });

    // Save the PDF
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error generating simple PDF:', error);
    throw new Error(
      error instanceof Error
        ? `Error al generar PDF: ${error.message}`
        : 'Error desconocido al generar PDF'
    );
  }
}

/**
 * Check if PDF generation is supported in the current environment
 *
 * @returns true if PDF generation is supported
 */
export function isPDFSupported(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

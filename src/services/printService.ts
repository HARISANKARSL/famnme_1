/**
 * Print & PDF Export Service
 *
 * Provides functionality to print the tree chart and export it as a PDF.
 */

export function printTree(): void {
  // Add a print-specific class to body for CSS targeting
  document.body.classList.add('printing-tree');
  window.print();
  // Remove the class after print dialog closes
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-tree');
  }, { once: true });
}

export async function exportTreePDF(elementId: string = 'tree-canvas-container', fileName: string = 'family-tree.pdf'): Promise<void> {
  // Use html-to-image to capture the canvas, then jspdf to create PDF
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Canvas element not found:', elementId);
      return;
    }

    // Dynamic imports for tree-shaking
    const { toPng } = await import('html-to-image');
    const { default: jsPDF } = await import('jspdf');

    // Capture as PNG
    const dataUrl = await toPng(element, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    });

    // Create PDF
    const img = new Image();
    img.src = dataUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        try {
          // Calculate PDF dimensions to fit the image
          const imgWidth = img.width;
          const imgHeight = img.height;

          // Use landscape if wider than tall
          const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
          const pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [imgWidth / 2, imgHeight / 2],
          });

          pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
          pdf.save(fileName);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
    });
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw error;
  }
}

export async function exportTreeImage(elementId: string = 'tree-canvas-container', fileName: string = 'family-tree.png'): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Canvas element not found:', elementId);
      return;
    }

    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(element, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    });

    // Download
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export image:', error);
    throw error;
  }
}

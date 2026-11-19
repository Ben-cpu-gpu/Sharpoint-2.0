import * as pdfjsLib from 'pdfjs-dist';

// Configuration du worker pdf.js pour le navigateur client
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  // Worker moderne hébergé sur CDN aligné avec la version de pdfjs-dist
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
}

/**
 * Extrait l'intégralité du texte d'un fichier PDF directement dans le navigateur (100% Client-Side)
 * @param file Fichier PDF issu d'un input file ou drag-and-drop
 * @param onProgress Callback de progression (page actuelle, total de pages)
 */
export async function extractTextFromPdf(
  file: File | ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  try {
    let arrayBuffer: ArrayBuffer;
    if (file instanceof File) {
      arrayBuffer = await file.arrayBuffer();
    } else {
      arrayBuffer = file;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      isEvalSupported: false,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) {
        onProgress(pageNum, numPages);
      }

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      let lastY: number | null = null;
      let pageText = '';

      for (const item of textContent.items) {
        if ('str' in item) {
          const strItem = item as { str: string; transform: number[] };
          const currentY = strItem.transform[5];

          // Saut de ligne si la coordonnée Y a changé significativement
          if (lastY !== null && Math.abs(currentY - lastY) > 8) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }

          pageText += strItem.str;
          lastY = currentY;
        }
      }

      fullText += `--- [Page ${pageNum}/${numPages}] ---\n${pageText}\n\n`;
    }

    return fullText.trim();
  } catch (error: any) {
    console.error('Erreur lors du parsing du PDF avec pdfjs-dist :', error);
    throw new Error(`Impossible d'extraire le texte du PDF : ${error.message || 'Fichier corrompu ou illisible'}`);
  }
}

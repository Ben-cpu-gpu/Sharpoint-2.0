import * as pdfjsLib from 'pdfjs-dist';
import { classifyPdfBlock, PdfDetectedBox, PdfScannedPage } from '../utils/documentExtraction';

// Configuration du worker pdf.js pour le navigateur client
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  // Worker moderne hébergé sur CDN aligné avec la version de pdfjs-dist
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
}

export interface PdfExtractionProgress {
  current: number;
  total: number;
  pageText: string;
  accumulatedText: string;
  scannedPage?: PdfScannedPage;
  scannedPages?: PdfScannedPage[];
}

interface RawLineBucket {
  yPdf: number;
  items: Array<{
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

/**
 * Extrait l'intégralité du texte et les coordonnées réelles des blocs d'un fichier PDF (100% Client-Side),
 * tout en générant un aperçu visuel réel de chaque page pour l'araignée d'extraction.
 */
export async function extractTextFromPdf(
  file: File | ArrayBuffer,
  onProgress?: (progress: PdfExtractionProgress) => void,
  signal?: AbortSignal
): Promise<string> {
  try {
    if (signal?.aborted) {
      const err = new Error('Lecture PDF annulée.');
      err.name = 'AbortError';
      throw err;
    }

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

    const abortHandler = () => {
      try {
        void loadingTask.destroy();
      } catch {
        // Ignore cleanup errors
      }
    };
    signal?.addEventListener('abort', abortHandler, { once: true });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    let fullText = '';
    const scannedPages: PdfScannedPage[] = [];

    if (onProgress) {
      onProgress({
        current: 0,
        total: numPages,
        pageText: '',
        accumulatedText: '',
        scannedPages: [],
      });
    }

    try {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (signal?.aborted) {
          const err = new Error('Lecture PDF annulée.');
          err.name = 'AbortError';
          throw err;
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();

        // 1. Rendu visuel réel de la page PDF sur un canvas hors-DOM
        let previewUrl = '';
        const aspectRatio = viewport.width > 0 && viewport.height > 0 ? viewport.width / viewport.height : 0.707;
        if (typeof document !== 'undefined') {
          try {
            const targetWidth = Math.min(720, Math.max(420, viewport.width));
            const renderScale = viewport.width > 0 ? targetWidth / viewport.width : 1.0;
            const renderViewport = page.getViewport({ scale: renderScale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(renderViewport.width));
            canvas.height = Math.max(1, Math.round(renderViewport.height));
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
              previewUrl = canvas.toDataURL('image/png');
            }
          } catch {
            previewUrl = '';
          }
        }

        // 2. Extraction texte + regroupement géométrique en lignes avec boîtes englobantes réelles
        const buckets: RawLineBucket[] = [];
        let lastY: number | null = null;
        let pageText = '';

        for (const item of textContent.items) {
          if ('str' in item) {
            const strItem = item as {
              str: string;
              transform: number[];
              width?: number;
              height?: number;
            };
            const currentY = strItem.transform[5];
            const tx = pdfjsLib.Util.transform(viewport.transform, strItem.transform);
            const xVp = tx[4];
            const yBaselineVp = tx[5];
            const fontH = Math.max(10, Math.hypot(tx[2], tx[3]) || (strItem.height || 12));
            const itemWidth = Math.max(4, (strItem.width || strItem.str.length * 4.5) * viewport.scale);

            if (lastY !== null && Math.abs(currentY - lastY) > 8) {
              pageText += '\n';
            } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
              pageText += ' ';
            }
            pageText += strItem.str;
            lastY = currentY;

            const trimmed = strItem.str.trim();
            if (trimmed) {
              let bucket = buckets.find(b => Math.abs(b.yPdf - currentY) <= 6);
              if (!bucket) {
                bucket = { yPdf: currentY, items: [] };
                buckets.push(bucket);
              }
              bucket.items.push({
                str: strItem.str,
                x: xVp,
                y: yBaselineVp - fontH * 0.85,
                width: itemWidth,
                height: fontH * 1.15,
              });
            }
          }
        }

        // Convertit les lignes géométriques en PdfDetectedBox normalisées [0..100]%
        const pageWidth = Math.max(1, viewport.width);
        const pageHeight = Math.max(1, viewport.height);
        const rawBoxes: PdfDetectedBox[] = [];

        buckets.forEach((bucket, idx) => {
          const sorted = [...bucket.items].sort((a, b) => a.x - b.x);
          const lineStr = sorted.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
          if (lineStr.length < 3) return;

          // Détecte une géométrie tabulaire (plusieurs colonnes séparées par des grands espaces horizontaux)
          let largeGapCount = 0;
          for (let i = 1; i < sorted.length; i++) {
            const gap = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width);
            if (gap > 26) largeGapCount++;
          }
          const isTabularGeometry = largeGapCount >= 2;

          const minX = Math.min(...sorted.map(it => it.x));
          const maxX = Math.max(...sorted.map(it => it.x + it.width));
          const minY = Math.min(...sorted.map(it => it.y));
          const maxY = Math.max(...sorted.map(it => it.y + it.height));

          const xPct = Math.max(1, Math.min(94, (minX / pageWidth) * 100));
          const yPct = Math.max(1, Math.min(95, (minY / pageHeight) * 100));
          const wPct = Math.max(6, Math.min(98 - xPct, ((maxX - minX) / pageWidth) * 100));
          const hPct = Math.max(2.2, Math.min(18, ((maxY - minY) / pageHeight) * 100));

          const category = classifyPdfBlock(lineStr, isTabularGeometry);
          rawBoxes.push({
            id: `p${pageNum}_b${idx}`,
            pageNum,
            text: lineStr,
            xPct: Number(xPct.toFixed(2)),
            yPct: Number(yPct.toFixed(2)),
            wPct: Number(wPct.toFixed(2)),
            hPct: Number(hPct.toFixed(2)),
            category,
          });
        });

        // Priorise les formules, théorèmes, tableaux et définitions, tout en gardant un ordre vertical naturel
        const priorityBoxes = rawBoxes.filter(b => b.category !== 'text');
        const textBoxes = rawBoxes.filter(b => b.category === 'text').slice(0, 12);
        const combinedBoxes = [...priorityBoxes, ...textBoxes]
          .slice(0, 32)
          .sort((a, b) => a.yPct - b.yPct);

        const scannedPage: PdfScannedPage = {
          pageNum,
          totalPages: numPages,
          previewUrl,
          aspectRatio,
          text: pageText,
          boxes: combinedBoxes,
        };
        scannedPages.push(scannedPage);

        fullText += `--- [Page ${pageNum}/${numPages}] ---\n${pageText}\n\n`;

        if (onProgress) {
          onProgress({
            current: pageNum,
            total: numPages,
            pageText,
            accumulatedText: fullText.trim(),
            scannedPage,
            scannedPages: [...scannedPages],
          });
        }

        // Laisse au navigateur un court instant de rafraîchissement visuel pour suivre le balayage réel
        if (numPages > 1 && pageNum < numPages) {
          await new Promise(resolve => setTimeout(resolve, 90));
        }
      }
    } finally {
      signal?.removeEventListener('abort', abortHandler);
    }

    return fullText.trim();
  } catch (error: any) {
    if (error?.name === 'AbortError' || signal?.aborted) {
      const abortErr = new Error('Extraction PDF annulée.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    console.error('Erreur lors du parsing du PDF avec pdfjs-dist :', error);
    throw new Error(`Impossible d'extraire le texte du PDF : ${error.message || 'Fichier corrompu ou illisible'}`);
  }
}

export type DocumentDestination = 'sheet' | 'td' | 'annale';
export type NavMainTab = 'sheets' | 'td' | 'annales';

export interface DocumentTelemetryMetrics {
  formulas: number;
  theorems: number;
  definitions: number;
  blocks: number;
  charCount: number;
  previewLines: string[];
}

export interface ExtractionProgressBreakdown {
  pdfPct: number;
  aiPct: number;
  globalPct: number;
}

/**
 * Mappe l'onglet sélectionné sur l'Anneau 1 du Système Solaire vers la destination du modal d'ingestion.
 */
export function mapTabToDestination(tab: NavMainTab | undefined | null): DocumentDestination {
  if (tab === 'td') return 'td';
  if (tab === 'annales') return 'annale';
  return 'sheet';
}

/**
 * Analyse déterministe du texte réel extrait du PDF ou collé par l'étudiant :
 * - compte les formules/équations réelles
 * - compte les théorèmes/lois/principes
 * - compte les définitions et unités SI
 * - compte les exercices/pages/tableaux
 * - extrait les lignes réelles les plus récentes pour l'afficheur scanner de l'araignée
 */
export function analyzeDocumentText(text: string): DocumentTelemetryMetrics {
  const cleanText = typeof text === 'string' ? text : '';
  if (!cleanText.trim()) {
    return {
      formulas: 0,
      theorems: 0,
      definitions: 0,
      blocks: 0,
      charCount: 0,
      previewLines: [],
    };
  }

  const rawLines = cleanText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let formulas = 0;
  let theorems = 0;
  let definitions = 0;
  let blocks = 0;

  const contentLines: string[] = [];

  for (const line of rawLines) {
    if (/^---\s*\[Page\s+\d+\/\d+\]\s*---$/i.test(line)) {
      blocks += 1;
      continue;
    }

    if (
      /[=≈≤≥∫∑∆∇∂√]|\\(?:frac|int|sum|partial|nabla|vec|sqrt)\b|\$\$?[^$]+\$\$?/.test(line)
    ) {
      formulas += 1;
    }

    if (
      /\b(?:th[eé]or[eè]me|principe|loi|corollaire|propri[eé]t[eé]|lemme|axiome|[eé]quation)\b/i.test(
        line
      )
    ) {
      theorems += 1;
    }

    if (
      /\b(?:d[eé]finition|soit|avec|unit[eé]s?|kelvin|pascal|newton|joule|watt|m\/s)\b|\[(?:m|kg|s|pa|n|j|w|k|v|a|rad|mol|hz)[^\]]*\]/i.test(
        line
      )
    ) {
      definitions += 1;
    }

    if (
      /\b(?:exercice|probl[eè]me|partie|question|tableau|figure|bar[eè]me|annexe)\b/i.test(line)
    ) {
      blocks += 1;
    }

    if (line.length >= 6 && !/^\d+$/.test(line)) {
      contentLines.push(line);
    }
  }

  // Privilégie les lignes récemment extraites (fin du flux si plusieurs pages) tout en gardant un aperçu lisible
  const previewLines =
    contentLines.length <= 10 ? contentLines : contentLines.slice(contentLines.length - 10);

  return {
    formulas,
    theorems,
    definitions,
    blocks: Math.max(blocks, rawLines.length > 0 ? 1 : 0),
    charCount: cleanText.length,
    previewLines,
  };
}

/**
 * Estime l'avancement du JSON généré par le stream IA à partir des sections déjà reçues.
 */
export function countStreamedJsonSignals(partialText: string): {
  formulas: number;
  theorems: number;
  definitions: number;
  blocks: number;
} {
  if (!partialText) {
    return { formulas: 0, theorems: 0, definitions: 0, blocks: 0 };
  }
  const formulas = (partialText.match(/"(?:formula|statement)"\s*:/g) || []).length;
  const theorems = (partialText.match(/"name"\s*:/g) || []).length;
  const definitions = (partialText.match(/"(?:unitsAndVariables|strictConditions|steps)"\s*:/g) || []).length;
  const blocks = (partialText.match(/"(?:question|title|goal)"\s*:/g) || []).length;
  return { formulas, theorems, definitions, blocks };
}

/**
 * Nettoie et extrait un JSON valide depuis une réponse LLM (gère balises <think>, markdown ```json, et texte autour).
 */
export function extractJsonFromModelText(raw: string): string {
  let cleaned = (raw || '').trim();

  // Supprime d'éventuelles traces de raisonnement (DeepSeek R1 / Qwen 3)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Retire les blocs markdown ```json ... ``` ou ``` ... ```
  const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    cleaned = fencedMatch[1].trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Si le modèle a ajouté du texte explicatif autour, isole le premier objet/tableau JSON complet
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const firstObj = cleaned.indexOf('{');
    const firstArr = cleaned.indexOf('[');
    const startIdx =
      firstObj === -1
        ? firstArr
        : firstArr === -1
        ? firstObj
        : Math.min(firstObj, firstArr);

    if (startIdx >= 0) {
      const openChar = cleaned[startIdx];
      const closeChar = openChar === '{' ? '}' : ']';
      const endIdx = cleaned.lastIndexOf(closeChar);
      if (endIdx > startIdx) {
        cleaned = cleaned.slice(startIdx, endIdx + 1).trim();
      }
    }
  }

  return cleaned;
}

/**
 * Calcule des barres de progression 100% déterministes (PDF + IA + globale).
 */
export function computeExtractionProgress(input: {
  hasPdfFile: boolean;
  pdfCurrentPage: number;
  pdfTotalPages: number;
  pdfDone: boolean;
  aiPct: number;
  isDone?: boolean;
}): ExtractionProgressBreakdown {
  if (input.isDone) {
    return { pdfPct: 100, aiPct: 100, globalPct: 100 };
  }

  let pdfPct = 100;
  if (input.hasPdfFile) {
    if (input.pdfDone) {
      pdfPct = 100;
    } else if (input.pdfTotalPages > 0) {
      pdfPct = Math.min(
        99,
        Math.max(1, Math.round((input.pdfCurrentPage / input.pdfTotalPages) * 100))
      );
    } else {
      pdfPct = 5;
    }
  }

  const aiPct = Math.min(100, Math.max(0, Math.round(input.aiPct)));
  const globalPct = Math.min(
    100,
    Math.max(0, Math.round(input.hasPdfFile ? pdfPct * 0.35 + aiPct * 0.65 : aiPct))
  );

  return { pdfPct, aiPct, globalPct };
}

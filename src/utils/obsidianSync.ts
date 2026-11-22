import { AnnaleItem, MasteryLevel, StudySheet, Subject, TDExercise } from '../types/course';

export interface ObsidianExportEntry {
  path: string;
  content: string;
}

const MASTERY_LABELS: Record<MasteryLevel, string> = {
  to_learn: 'À apprendre',
  learning: 'En cours',
  mastered: 'Maîtrisé',
};

export function sanitizeObsidianFilename(raw: string): string {
  const cleaned = raw
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|#^\[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Note-Sans-Titre';
  return cleaned.slice(0, 96).trim();
}

function escapeYamlString(value: string): string {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function toCalloutLines(body: string): string {
  return String(body ?? '')
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');
}

function normalizeSubjectTag(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function sheetToObsidianMarkdown(sheet: StudySheet, subjectName: string): string {
  const safeSubject = subjectName || sheet.subjectId;
  const tagList = Array.from(
    new Set(['fichemaster', 'estaca', normalizeSubjectTag(safeSubject), ...sheet.tags.map(normalizeSubjectTag)].filter(Boolean))
  );

  const lines: string[] = [
    '---',
    `id: ${escapeYamlString(sheet.id)}`,
    'type: fiche-cours',
    `title: ${escapeYamlString(sheet.title)}`,
    `subjectId: ${escapeYamlString(sheet.subjectId)}`,
    `subject: ${escapeYamlString(safeSubject)}`,
    `chapter: ${escapeYamlString(sheet.chapter)}`,
    `mastery: ${escapeYamlString(sheet.mastery)}`,
    `masteryLabel: ${escapeYamlString(MASTERY_LABELS[sheet.mastery])}`,
    `updatedAt: ${escapeYamlString(sheet.updatedAt || sheet.createdAt || new Date().toISOString())}`,
    'tags:',
    ...tagList.map(tag => `  - ${tag}`),
    '---',
    '',
    `# ${sheet.title}`,
    '',
    `> [!info] Métadonnées · [[${safeSubject}]]`,
    `> - **Chapitre** : ${sheet.chapter}`,
    `> - **Maîtrise** : ${MASTERY_LABELS[sheet.mastery]}`,
    `> - **Synthèse** : ${sheet.subtitle || 'Cours structuré FicheMaster IA'}`,
    '',
  ];

  if (sheet.theorems.length > 0) {
    lines.push('## Théorèmes Fondamentaux & Hypothèses', '');
    for (const thm of sheet.theorems) {
      lines.push(`> [!abstract] ${thm.name}`);
      lines.push(toCalloutLines(thm.statement));
      if (thm.strictConditions.length > 0) {
        lines.push('>');
        lines.push('> **Hypothèses strictes :**');
        for (const cond of thm.strictConditions) {
          lines.push(`> - ${cond}`);
        }
      }
      if (thm.professorTip) {
        lines.push('>');
        lines.push(`> **Astuce d'examen :** ${thm.professorTip}`);
      }
      lines.push('');
    }
  }

  if (sheet.magicFormulas.length > 0) {
    lines.push('## Formules Clés & Unités SI', '');
    for (const fml of sheet.magicFormulas) {
      lines.push(`> [!tip] ${fml.name}`);
      const trimmedFormula = fml.formula.trim();
      const displayFormula =
        trimmedFormula.startsWith('$') || trimmedFormula.startsWith('$$')
          ? trimmedFormula
          : `$$\n${trimmedFormula}\n$$`;
      lines.push(toCalloutLines(displayFormula));
      lines.push('>');
      lines.push(`> - **Variables & Unités SI** : ${fml.unitsAndVariables}`);
      if (fml.validityDomain) {
        lines.push(`> - **Validité** : ${fml.validityDomain}`);
      }
      lines.push('');
    }
  }

  if (sheet.stepByStepMethods.length > 0) {
    lines.push('## Méthodes de Résolution Pas à Pas', '');
    for (const mth of sheet.stepByStepMethods) {
      lines.push(`> [!example] ${mth.goal}`);
      mth.steps.forEach((step, idx) => {
        lines.push(`> ${idx + 1}. ${step}`);
      });
      if (mth.trapToAvoid) {
        lines.push('>');
        lines.push(`> **Piège à éviter :** ${mth.trapToAvoid}`);
      }
      lines.push('');
    }
  }

  if (sheet.examTraps.length > 0) {
    lines.push("## Pièges d'Examen", '');
    lines.push('> [!warning] Erreurs fréquentes à éviter');
    for (const trap of sheet.examTraps) {
      lines.push(`> - ${trap}`);
    }
    lines.push('');
  }

  if (sheet.flashcards.length > 0) {
    lines.push('## Cartes Réflexes (Flashcards)', '');
    for (const card of sheet.flashcards) {
      lines.push(`> [!question]- ${card.question}`);
      lines.push(toCalloutLines(card.answer));
      lines.push('');
    }
  }

  if (sheet.quiz.length > 0) {
    lines.push("## Quiz d'Auto-Évaluation", '');
    sheet.quiz.forEach((q, idx) => {
      lines.push(`### Q${idx + 1}. ${q.question}`);
      q.options.forEach((opt, optIdx) => {
        const mark = optIdx === q.correctIndex ? 'x' : ' ';
        lines.push(`- [${mark}] ${opt}`);
      });
      if (q.explanation) {
        lines.push('', `> [!note]- Explication`, toCalloutLines(q.explanation));
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}

export function exerciseToObsidianMarkdown(
  item: TDExercise | AnnaleItem,
  type: 'td' | 'annale',
  subjectName: string
): string {
  const safeSubject = subjectName || item.subjectId;
  const annale = type === 'annale' ? (item as AnnaleItem) : null;

  const lines: string[] = [
    '---',
    `id: ${escapeYamlString(item.id)}`,
    `type: ${type}`,
    `title: ${escapeYamlString(item.title)}`,
    `subjectId: ${escapeYamlString(item.subjectId)}`,
    `subject: ${escapeYamlString(safeSubject)}`,
    `chapter: ${escapeYamlString(item.chapter)}`,
    `notion: ${escapeYamlString(item.notion)}`,
    `difficulty: ${item.difficulty}`,
    `status: ${escapeYamlString(item.status)}`,
  ];

  if (annale) {
    lines.push(
      `session: ${escapeYamlString(annale.session)}`,
      `year: ${annale.year}`,
      `durationMinutes: ${annale.durationMinutes}`,
      `points: ${annale.points}`
    );
  }

  lines.push(
    'tags:',
    '  - fichemaster',
    `  - ${type}`,
    `  - ${normalizeSubjectTag(safeSubject)}`,
    '---',
    '',
    `# ${item.title}`,
    '',
    `> [!info] Contexte · [[${safeSubject}]]`,
    `> - **Chapitre** : ${item.chapter}`,
    `> - **Notion** : ${item.notion}`,
    `> - **Difficulté** : ${item.difficulty}/3`,
    ...(annale
      ? [
          `> - **Session** : ${annale.session} (${annale.year})`,
          `> - **Durée / Barème** : ${annale.durationMinutes} min · ${annale.points} pts`,
        ]
      : []),
    '',
    '## Énoncé',
    '',
    item.statement,
    ''
  );

  if (annale && annale.gradingCriteria.length > 0) {
    lines.push("## Critères d'Évaluation", '');
    for (const crit of annale.gradingCriteria) {
      lines.push(`- ${crit}`);
    }
    lines.push('');
  }

  if (item.hints.length > 0) {
    lines.push('## Indices Progressifs', '');
    item.hints.forEach((hint, idx) => {
      lines.push(`> [!tip]- Indice ${idx + 1}`);
      lines.push(toCalloutLines(hint));
      lines.push('');
    });
  }

  lines.push('## Corrigé Détaillé', '');
  lines.push('> [!success]- Afficher la correction complète pas à pas');
  lines.push(toCalloutLines(item.solution));
  lines.push('');

  return lines.join('\n');
}

export function generateObsidianCanvas(
  sheets: StudySheet[],
  tdExercises: TDExercise[],
  annales: AnnaleItem[],
  subjects: Subject[]
): string {
  interface CanvasNode {
    id: string;
    type: 'text' | 'file';
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    text?: string;
    file?: string;
  }

  interface CanvasEdge {
    id: string;
    fromNode: string;
    fromSide: 'top' | 'right' | 'bottom' | 'left';
    toNode: string;
    toSide: 'top' | 'right' | 'bottom' | 'left';
    color?: string;
    label?: string;
  }

  const nodes: CanvasNode[] = [
    {
      id: 'hub-fichemaster',
      type: 'text',
      x: -170,
      y: -80,
      width: 340,
      height: 160,
      color: '3',
      text: `# FicheMaster IA · Système Solaire ESTACA\n\n- **${sheets.length}** Fiches de cours\n- **${tdExercises.length}** Exercices de TD\n- **${annales.length}** Annales d'examen`,
    },
  ];

  const edges: CanvasEdge[] = [];
  const activeSubjects = subjects.filter(
    sub =>
      sheets.some(s => s.subjectId === sub.id) ||
      tdExercises.some(t => t.subjectId === sub.id) ||
      annales.some(a => a.subjectId === sub.id)
  );

  const listToPlace = activeSubjects.length > 0 ? activeSubjects : subjects.slice(0, 6);
  const subjectRadius = 560;

  listToPlace.forEach((sub, sIdx) => {
    const angle = (sIdx / Math.max(1, listToPlace.length)) * Math.PI * 2 - Math.PI / 2;
    const sx = Math.round(Math.cos(angle) * subjectRadius - 130);
    const sy = Math.round(Math.sin(angle) * subjectRadius - 55);
    const subNodeId = `subject-${sub.id}`;

    const subSheets = sheets.filter(s => s.subjectId === sub.id);
    const subTd = tdExercises.filter(t => t.subjectId === sub.id);
    const subAnnales = annales.filter(a => a.subjectId === sub.id);

    nodes.push({
      id: subNodeId,
      type: 'text',
      x: sx,
      y: sy,
      width: 260,
      height: 110,
      color: '5',
      text: `### ${sub.name}\n${sub.code} · ${subSheets.length} fiches · ${subTd.length} TD · ${subAnnales.length} annales`,
    });

    edges.push({
      id: `edge-hub-${sub.id}`,
      fromNode: 'hub-fichemaster',
      fromSide: Math.cos(angle) >= 0 ? 'right' : 'left',
      toNode: subNodeId,
      toSide: Math.cos(angle) >= 0 ? 'left' : 'right',
      color: '5',
    });

    const items = [
      ...subSheets.slice(0, 4).map(s => ({
        id: `file-sheet-${s.id}`,
        file: `Fiches/${sanitizeObsidianFilename(s.title)}.md`,
        color: '3',
      })),
      ...subTd.slice(0, 3).map(t => ({
        id: `file-td-${t.id}`,
        file: `TD/${sanitizeObsidianFilename(t.title)}.md`,
        color: '4',
      })),
      ...subAnnales.slice(0, 3).map(a => ({
        id: `file-annale-${a.id}`,
        file: `Annales/${sanitizeObsidianFilename(a.title)}.md`,
        color: '2',
      })),
    ];

    items.forEach((item, idx) => {
      const spread = (idx - (items.length - 1) / 2) * 0.24;
      const itemAngle = angle + spread;
      const dist = 360 + (idx % 2) * 140;
      const ix = Math.round(sx + 130 + Math.cos(itemAngle) * dist - 125);
      const iy = Math.round(sy + 55 + Math.sin(itemAngle) * dist - 40);

      nodes.push({
        id: item.id,
        type: 'file',
        x: ix,
        y: iy,
        width: 250,
        height: 80,
        color: item.color,
        file: item.file,
      });

      edges.push({
        id: `edge-${sub.id}-${item.id}`,
        fromNode: subNodeId,
        fromSide: Math.cos(itemAngle) >= 0 ? 'right' : 'left',
        toNode: item.id,
        toSide: Math.cos(itemAngle) >= 0 ? 'left' : 'right',
        color: item.color,
      });
    });
  });

  return JSON.stringify({ nodes, edges }, null, 2);
}

export function buildVaultExportEntries(
  sheets: StudySheet[],
  tdExercises: TDExercise[],
  annales: AnnaleItem[],
  subjects: Subject[]
): ObsidianExportEntry[] {
  const subjectNameMap = new Map(subjects.map(s => [s.id, s.name]));
  const entries: ObsidianExportEntry[] = [];
  const usedPaths = new Set<string>();

  const reserveUniquePath = (folder: string, title: string, id: string): string => {
    const base = sanitizeObsidianFilename(title);
    let candidate = `${folder}/${base}.md`;
    if (usedPaths.has(candidate)) {
      candidate = `${folder}/${base} (${id.slice(-4)}).md`;
    }
    usedPaths.add(candidate);
    return candidate;
  };

  for (const sheet of sheets) {
    const subjectName = subjectNameMap.get(sheet.subjectId) || sheet.subjectId;
    entries.push({
      path: reserveUniquePath('Fiches', sheet.title, sheet.id),
      content: sheetToObsidianMarkdown(sheet, subjectName),
    });
  }

  for (const ex of tdExercises) {
    const subjectName = subjectNameMap.get(ex.subjectId) || ex.subjectId;
    entries.push({
      path: reserveUniquePath('TD', ex.title, ex.id),
      content: exerciseToObsidianMarkdown(ex, 'td', subjectName),
    });
  }

  for (const annale of annales) {
    const subjectName = subjectNameMap.get(annale.subjectId) || annale.subjectId;
    entries.push({
      path: reserveUniquePath('Annales', annale.title, annale.id),
      content: exerciseToObsidianMarkdown(annale, 'annale', subjectName),
    });
  }

  entries.push({
    path: 'Système Solaire ESTACA.canvas',
    content: generateObsidianCanvas(sheets, tdExercises, annales, subjects),
  });

  entries.push({
    path: 'README - Coffre FicheMaster IA.md',
    content: [
      '# Coffre Obsidian · FicheMaster IA',
      '',
      'Ce dossier a été généré automatiquement par **FicheMaster IA** :',
      '',
      `- **Fiches/** (${sheets.length} fiches de cours structurées avec KaTeX et callouts Obsidian)`,
      `- **TD/** (${tdExercises.length} exercices de TD avec indices repliables et corrigés détaillés)`,
      `- **Annales/** (${annales.length} annales avec barème officiel et corrigé pas à pas)`,
      '- **Système Solaire ESTACA.canvas** (carte mentale JSON Canvas prête à ouvrir dans Obsidian)',
      '',
      'Pour réimporter vos notes modifiées vers FicheMaster IA, ouvrez le panneau **Obsidian** dans l’application et cliquez sur **Importer des notes .md**.',
      '',
    ].join('\n'),
  });

  return entries;
}

export function buildObsidianNewUri(
  sheet: StudySheet,
  subjectName: string,
  vaultName?: string
): string {
  const filename = sanitizeObsidianFilename(sheet.title);
  const fullMarkdown = sheetToObsidianMarkdown(sheet, subjectName);
  // Keep URI well within OS/browser URL limits (~6500 chars max encoded)
  const trimmedContent =
    fullMarkdown.length > 4200
      ? `${fullMarkdown.slice(0, 4150)}\n\n<!-- Tronqué pour URL obsidian:// — utilisez l'export .zip pour la note complète -->`
      : fullMarkdown;

  const params = new URLSearchParams();
  if (vaultName && vaultName.trim()) {
    params.set('vault', vaultName.trim());
  }
  params.set('file', `FicheMaster IA/Fiches/${filename}`);
  params.set('content', trimmedContent);
  return `obsidian://new?${params.toString()}`;
}

export function parseObsidianMarkdownToSheet(
  filename: string,
  markdown: string,
  subjects: Subject[]
): StudySheet {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  const frontmatter: Record<string, string> = {};
  const yamlTags: string[] = [];

  let body = normalized;
  const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (fmMatch) {
    const fmBlock = fmMatch[1];
    body = fmMatch[2].trim();
    let inTagsList = false;

    for (const rawLine of fmBlock.split('\n')) {
      if (inTagsList && /^\s*-\s+(.+)$/.test(rawLine)) {
        yamlTags.push(rawLine.replace(/^\s*-\s+/, '').replace(/^["']|["']$/g, '').trim());
        continue;
      }
      inTagsList = false;
      const kv = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1];
      const val = kv[2].trim();
      if (key === 'tags' && !val) {
        inTagsList = true;
        continue;
      }
      frontmatter[key] = val.replace(/^["']|["']$/g, '');
    }
  }

  const baseName = filename.replace(/\.(md|markdown)$/i, '').trim() || 'Note importée Obsidian';
  const h1Match = body.match(/^#\s+(.+)$/m);
  const title = frontmatter.title || h1Match?.[1]?.trim() || baseName;

  const subjectLookup = (frontmatter.subjectId || frontmatter.subject || '').toLowerCase();
  const matchedSubject =
    subjects.find(
      s =>
        s.id.toLowerCase() === subjectLookup ||
        s.name.toLowerCase() === subjectLookup ||
        s.code.toLowerCase() === subjectLookup ||
        (subjectLookup && s.name.toLowerCase().includes(subjectLookup))
    ) || subjects[0];

  const masteryRaw = frontmatter.mastery as MasteryLevel | undefined;
  const mastery: MasteryLevel =
    masteryRaw === 'mastered' || masteryRaw === 'learning' || masteryRaw === 'to_learn'
      ? masteryRaw
      : 'learning';

  const theorems: StudySheet['theorems'] = [];
  const magicFormulas: StudySheet['magicFormulas'] = [];
  const stepByStepMethods: StudySheet['stepByStepMethods'] = [];
  const examTraps: string[] = [];
  const flashcards: StudySheet['flashcards'] = [];

  // Parse Obsidian callouts when present
  const calloutRegex = /^>\s*\[!([a-zA-Z]+)[+-]?\]\s*(.*)\n((?:>.*\n?)*)/gm;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = calloutRegex.exec(body)) !== null) {
    idx += 1;
    const calloutType = match[1].toLowerCase();
    const calloutTitle = match[2].trim();
    const rawContent = match[3]
      .split('\n')
      .map(line => line.replace(/^>\s?/, ''))
      .join('\n')
      .trim();

    if (calloutType === 'abstract' || calloutType === 'theorem') {
      const condMatches = Array.from(rawContent.matchAll(/^-\s+(.+)$/gm)).map(m => m[1].trim());
      const statementOnly = rawContent
        .split(/\*\*Hypothèses strictes\s*:\*\*/i)[0]
        .trim();
      theorems.push({
        id: `obs_thm_${Date.now()}_${idx}`,
        name: calloutTitle || `Théorème ${theorems.length + 1}`,
        statement: statementOnly || rawContent,
        strictConditions: condMatches.filter(c => !c.startsWith('**')),
      });
    } else if (calloutType === 'tip' || calloutType === 'formula') {
      const varMatch = rawContent.match(/\*\*Variables\s*&\s*Unités SI\*\*\s*:\s*(.+)/i);
      const valMatch = rawContent.match(/\*\*Validité\*\*\s*:\s*(.+)/i);
      const formulaCore = rawContent
        .split(/\n-\s+\*\*Variables/i)[0]
        .trim();
      magicFormulas.push({
        id: `obs_fml_${Date.now()}_${idx}`,
        name: calloutTitle || `Formule ${magicFormulas.length + 1}`,
        formula: formulaCore || rawContent,
        unitsAndVariables: varMatch?.[1]?.trim() || 'Unités SI',
        validityDomain: valMatch?.[1]?.trim() || '',
      });
    } else if (calloutType === 'example') {
      const steps = Array.from(rawContent.matchAll(/^\d+\.\s+(.+)$/gm)).map(m => m[1].trim());
      const trapMatch = rawContent.match(/\*\*Piège à éviter\s*:\*\*\s*(.+)/i);
      stepByStepMethods.push({
        id: `obs_mth_${Date.now()}_${idx}`,
        goal: calloutTitle || `Méthode ${stepByStepMethods.length + 1}`,
        steps: steps.length > 0 ? steps : [rawContent],
        trapToAvoid: trapMatch?.[1]?.trim(),
      });
    } else if (calloutType === 'warning') {
      const bullets = Array.from(rawContent.matchAll(/^-\s+(.+)$/gm)).map(m => m[1].trim());
      if (bullets.length > 0) {
        examTraps.push(...bullets);
      } else if (rawContent) {
        examTraps.push(rawContent);
      }
    } else if (calloutType === 'question') {
      flashcards.push({
        id: `obs_fc_${Date.now()}_${idx}`,
        question: calloutTitle || `Question ${flashcards.length + 1}`,
        answer: rawContent,
      });
    }
  }

  // Fallback for plain Obsidian notes without FicheMaster callouts
  if (
    theorems.length === 0 &&
    magicFormulas.length === 0 &&
    stepByStepMethods.length === 0 &&
    examTraps.length === 0
  ) {
    const cleanBody = body.replace(/^#\s+.+\n*/m, '').trim();
    const displayMathBlocks = Array.from(cleanBody.matchAll(/\$\$([\s\S]*?)\$\$/g)).map(m =>
      m[1].trim()
    );
    displayMathBlocks.forEach((expr, mIdx) => {
      if (expr) {
        magicFormulas.push({
          id: `obs_mf_${Date.now()}_${mIdx}`,
          name: `Formule extraite ${mIdx + 1}`,
          formula: `$$${expr}$$`,
          unitsAndVariables: 'Extrait de la note Obsidian',
          validityDomain: '',
        });
      }
    });

    const sections = cleanBody
      .split(/\n(?=##\s+)/)
      .map(s => s.trim())
      .filter(Boolean);

    if (sections.length > 0) {
      sections.forEach((sec, sIdx) => {
        const headingMatch = sec.match(/^##\s+(.+)\n?([\s\S]*)$/);
        const heading = headingMatch ? headingMatch[1].trim() : `Section ${sIdx + 1}`;
        const secBody = headingMatch ? headingMatch[2].trim() : sec;
        const listSteps = secBody
          .split('\n')
          .map(l => l.replace(/^[-*]\s+|^\d+\.\s+/, '').trim())
          .filter(Boolean);

        theorems.push({
          id: `obs_sec_${Date.now()}_${sIdx}`,
          name: heading,
          statement: secBody || heading,
          strictConditions: listSteps.slice(0, 4),
        });
      });
    } else if (cleanBody) {
      theorems.push({
        id: `obs_raw_${Date.now()}`,
        name: title,
        statement: cleanBody,
        strictConditions: ['Note importée depuis Obsidian'],
      });
    }
  }

  const nowIso = new Date().toISOString();
  const safeId = frontmatter.id || `obs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  return {
    id: safeId,
    subjectId: matchedSubject?.id || 'maths',
    title,
    subtitle: `Importé depuis Obsidian (${baseName}.md)`,
    chapter: frontmatter.chapter || baseName,
    tags: yamlTags.length > 0 ? yamlTags.slice(0, 6) : ['Obsidian', 'Markdown'],
    mastery,
    theorems,
    magicFormulas,
    stepByStepMethods,
    examTraps,
    flashcards,
    quiz: [],
    createdAt: frontmatter.updatedAt || nowIso,
    updatedAt: nowIso,
  };
}

// ==========================================
// Zero-dependency PKZIP builder (Store + CRC32)
// ==========================================

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildZipArchive(
  entries: Array<{ path: string; content: string | Uint8Array }>
): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path.replace(/^\/+/, ''));
    const dataBytes =
      typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
    const crc = computeCrc32(dataBytes);

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const ldv = new DataView(localHeader.buffer);
    ldv.setUint32(0, 0x04034b50, true); // Signature PK\x03\x04
    ldv.setUint16(4, 20, true); // Version needed
    ldv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    ldv.setUint16(8, 0, true); // Store (no compression)
    ldv.setUint16(10, 0, true); // Mod time
    ldv.setUint16(12, 0x5421, true); // Mod date
    ldv.setUint32(14, crc, true);
    ldv.setUint32(18, dataBytes.length, true);
    ldv.setUint32(22, dataBytes.length, true);
    ldv.setUint16(26, nameBytes.length, true);
    ldv.setUint16(28, 0, true); // Extra len
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    // Central directory header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(centralHeader.buffer);
    cdv.setUint32(0, 0x02014b50, true); // Signature PK\x01\x02
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0x0800, true); // UTF-8
    cdv.setUint16(10, 0, true); // Store
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0x5421, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, dataBytes.length, true);
    cdv.setUint32(24, dataBytes.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true); // Signature PK\x05\x06
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, offset, true);
  edv.setUint16(20, 0, true);

  const totalSize = offset + centralSize + eocd.length;
  const output = new Uint8Array(totalSize);
  let cursor = 0;

  for (const part of localParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  output.set(eocd, cursor);

  return output;
}

export type MathSegment =
  | { type: 'text'; value: string }
  | { type: 'inline-math'; value: string }
  | { type: 'block-math'; value: string };

const FRENCH_STOPWORDS = new Set([
  'et', 'ou', 'en', 'de', 'du', 'des', 'au', 'aux', 'le', 'la', 'les',
  'un', 'une', 'si', 'ce', 'se', 'sa', 'ma', 'ta', 'il', 'on', 'ne',
  'par', 'sur', 'est', 'sont', 'pour', 'dans', 'avec', 'sans', 'non',
  'car', 'qui', 'que', 'dont', 'où', 'pts', 'pt', 'bar', 'air', 'eau',
]);

/**
 * Consumes a balanced `{...}` group starting at `startIndex` (which must point to `{`).
 * Returns the end index (exclusive), or `startIndex + 1` if unbalanced.
 */
function consumeBracedGroup(text: string, startIndex: number): number {
  if (text[startIndex] !== '{') return startIndex;
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === '{' && text[i - 1] !== '\\') {
      depth++;
    } else if (text[i] === '}' && text[i - 1] !== '\\') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return startIndex + 1;
}

/**
 * Strips LaTeX commands (`\cmd{...}`) and scripts (`_{...}`, `^{...}`) to test
 * whether the remaining text contains natural-language prose words.
 */
function stripLatexForProseCheck(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      i++;
      while (i < text.length && /[a-zA-Z]/.test(text[i])) i++;
      while (i < text.length && text[i] === '{') {
        i = consumeBracedGroup(text, i);
      }
      out += ' ';
      continue;
    }
    if ((ch === '_' || ch === '^') && text[i + 1] === '{') {
      i = consumeBracedGroup(text, i + 1);
      out += ' ';
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * Determines whether a string without `$` delimiters is a pure mathematical formula
 * rather than natural-language prose containing inline math fragments.
 */
export function isPureFormulaWithoutDelimiters(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;

  const hasLatexCommand = /\\[a-zA-Z]+/.test(trimmed);
  const hasScript = /[_^]/.test(trimmed);
  const hasMathSyntax = hasLatexCommand || hasScript || /=/.test(trimmed);
  if (!hasMathSyntax) return false;

  // Brackets like [kg/m³] or [Pa = ...] indicate prose unit annotations, not pure formulas
  if (/\[[^\]]*[a-zA-Z]{2,}[^\]]*\]/.test(trimmed)) {
    return false;
  }

  // Simple numeric values with units (e.g., "v = 43.8 m/s", "eta = 58.5 %", "sigma_max = 100 MPa")
  if (!hasLatexCommand && /\d(?:\.\d+)?\s*(?:%|m\/s|km\/h|m²|m³|kg\/m³|MPa|kPa|Pa|rad|pts|pt|N\b|K\b)/i.test(trimmed)) {
    return false;
  }

  // Plain equality without LaTeX commands/scripts containing spaces around units (e.g., "v = 43.8 m/s")
  if (!hasLatexCommand && !hasScript) {
    return false;
  }

  const stripped = stripLatexForProseCheck(trimmed);

  // Any French accented character outside LaTeX commands indicates prose
  if (/[àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]/.test(stripped)) {
    return false;
  }

  // Two or more prose words (or any 3+ letter natural word) outside LaTeX commands/scripts
  const words = stripped.match(/[a-zA-Z]{2,}/g) || [];
  const proseWords = words.filter(w => {
    const lower = w.toLowerCase();
    // Allow common short math symbols like Re, Ma, Cz, Fz, sin, cos, max, min
    if (/^(re|ma|cz|fz|sin|cos|tan|log|ln|exp|max|min|sqrt)$/i.test(w)) return false;
    return w.length >= 3 || FRENCH_STOPWORDS.has(lower);
  });

  return proseWords.length === 0;
}

/**
 * Reads a single LaTeX atom starting at `index`:
 * - `\command` with any `{...}` args and `_`/`^` scripts
 * - identifier with `_` or `^` script(s), e.g., `F_z`, `v_1^2`, `I_{Gz}`, `r^{\gamma - 1}`
 */
function consumeMathAtom(text: string, start: number): number {
  let i = start;

  if (text[i] === '\\') {
    i++;
    if (i < text.length && /[a-zA-Z]/.test(text[i])) {
      while (i < text.length && /[a-zA-Z]/.test(text[i])) i++;
    } else if (i < text.length) {
      i++; // Escaped symbol like \| or \{
    }
    while (i < text.length && text[i] === '{') {
      i = consumeBracedGroup(text, i);
    }
  } else if (/[A-Za-z0-9]/.test(text[i])) {
    while (i < text.length && /[A-Za-z0-9]/.test(text[i])) i++;
    // Must actually have a subscript or superscript to start as a non-backslash atom
    if (text[i] !== '_' && text[i] !== '^') {
      return start;
    }
  } else {
    return start;
  }

  // Consume chained subscripts / superscripts (e.g. v_1^2, \vec{R}_{fluide \to aube})
  while (i < text.length && (text[i] === '_' || text[i] === '^')) {
    i++;
    if (text[i] === '{') {
      i = consumeBracedGroup(text, i);
    } else if (text[i] === '(') {
      let depth = 0;
      const parenStart = i;
      while (i < text.length) {
        if (text[i] === '(') depth++;
        else if (text[i] === ')') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        i++;
      }
      if (depth !== 0) i = parenStart + 1;
    } else if (text[i] === '\\') {
      i++;
      while (i < text.length && /[a-zA-Z]/.test(text[i])) i++;
    } else {
      while (i < text.length && /[A-Za-z0-9]/.test(text[i])) i++;
    }
  }

  return i;
}

/**
 * Normalizes bare multi-character subscripts/superscripts (e.g. `I_Gz` -> `I_{Gz}`)
 * inside extracted inline math so KaTeX renders all subscript characters properly.
 */
function normalizeBareScripts(latex: string): string {
  return latex.replace(/([A-Za-z0-9}])_([A-Za-z0-9]{2,})/g, '$1_{$2}');
}

function isSimpleParenMathGroup(text: string, start: number): number {
  if (text[start] !== '(') return start;
  let depth = 0;
  let end = start;
  while (end < text.length) {
    if (text[end] === '(') depth++;
    else if (text[end] === ')') {
      depth--;
      if (depth === 0) {
        end++;
        break;
      }
    }
    end++;
  }
  if (depth !== 0) return start;

  const inner = text.slice(start + 1, end - 1);
  // Reject prose parentheticals like "(v_2 = 0 au point d'arrêt)"
  const stripped = stripLatexForProseCheck(inner);
  const words = stripped.match(/[a-zA-ZÀ-ÿ]{2,}/g) || [];
  if (words.some(w => w.length >= 3 || FRENCH_STOPWORDS.has(w.toLowerCase()))) {
    return start;
  }
  return end;
}

/**
 * Extracts inline LaTeX spans from French prose that does not use `$` delimiters.
 * Preserves all spaces in surrounding prose while rendering math tokens via KaTeX.
 */
function extractInlineMathFromProse(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let textStart = 0;
  let i = 0;

  while (i < text.length) {
    const atomEnd = consumeMathAtom(text, i);
    if (atomEnd === i) {
      i++;
      continue;
    }

    // Flush preceding plain text
    if (i > textStart) {
      segments.push({ type: 'text', value: text.slice(textStart, i) });
    }

    // Greedily extend math span across operators, numbers, single-letter vars, and math atoms
    let spanEnd = atomEnd;
    let cursor = atomEnd;

    while (cursor < text.length) {
      // Skip whitespace only if something valid in the math span follows
      let wsEnd = cursor;
      while (wsEnd < text.length && wsEnd < cursor + 3 && text[wsEnd] === ' ') {
        wsEnd++;
      }

      // Check for trailing sentence punctuation that should NOT be pulled in
      if (wsEnd >= text.length) break;

      // 1. Next math atom (\cmd or X_y)
      const nextAtomEnd = consumeMathAtom(text, wsEnd);
      if (nextAtomEnd > wsEnd) {
        spanEnd = nextAtomEnd;
        cursor = nextAtomEnd;
        continue;
      }

      // 2. Math operator (=, +, -, *, /, <, >, \cdot, etc.) - disallow "=>" prose arrow
      if (text.startsWith('=>', wsEnd) || text.startsWith('->', wsEnd)) {
        break;
      }
      const opMatch = /^([=+\-*/<>]|<=|>=)/.exec(text.slice(wsEnd));
      if (opMatch) {
        // Ensure a space-separated trailing `-` isn't a bullet or hyphen before prose
        const afterOp = wsEnd + opMatch[0].length;
        let check = afterOp;
        while (check < text.length && text[check] === ' ') check++;
        const nextIsMath =
          consumeMathAtom(text, check) > check ||
          isSimpleParenMathGroup(text, check) > check ||
          /^[0-9]+(?:[.,/][0-9]+)?/.test(text.slice(check)) ||
          /^[a-zA-Z](?![a-zA-ZÀ-ÿ])/.test(text.slice(check));

        if (nextIsMath) {
          spanEnd = afterOp;
          cursor = afterOp;
          continue;
        }
        break;
      }

      // 3. Parenthesized pure math group, e.g. `(T_3 - T_2)` or `(P_t - P_s)`
      const parenEnd = isSimpleParenMathGroup(text, wsEnd);
      if (parenEnd > wsEnd) {
        spanEnd = parenEnd;
        cursor = parenEnd;
        continue;
      }

      // 4. Number or fraction like `1/2`, `0`, `1.225` (only if immediately after operator or inside chain with no unit prose after)
      const numMatch = /^[0-9]+(?:[/.][0-9]+)?/.exec(text.slice(wsEnd));
      if (numMatch) {
        const prevNonSpace = text.slice(0, wsEnd).trimEnd().slice(-1);
        const afterNum = wsEnd + numMatch[0].length;
        let afterWs = afterNum;
        while (afterWs < text.length && text[afterWs] === ' ') afterWs++;
        const hasUnitAfter = /^(kg|pts|pt|m\/s|m²|m³|kPa|MPa|bar|K\b|°C)/i.test(text.slice(afterWs));
        const precededByOp = /[=+\-*/<>(]/.test(prevNonSpace);
        const continuesMath =
          consumeMathAtom(text, afterWs) > afterWs ||
          /^[=+\-*/<>]/.test(text.slice(afterWs)) ||
          wsEnd === cursor ||
          precededByOp;
        if (continuesMath && !hasUnitAfter) {
          spanEnd = afterNum;
          cursor = afterNum;
          continue;
        }
      }

      // 5. Single-letter variable (like `t`, `m`, `s`) ONLY if preceded by math operator/whitespace inside math and NOT followed by French word characters
      const singleVarMatch = /^[a-zA-Z](?![a-zA-ZÀ-ÿ])/.exec(text.slice(wsEnd));
      if (singleVarMatch) {
        const ch = singleVarMatch[0];
        const afterVar = wsEnd + 1;
        let afterWs = afterVar;
        while (afterWs < text.length && text[afterWs] === ' ') afterWs++;
        const nextChar = text[afterWs] || '';
        const prevNonSpace = text.slice(0, wsEnd).trimEnd().slice(-1);
        const looksMathConnected =
          /[=+\-*/<>]|^\\/.test(prevNonSpace) ||
          text.slice(spanEnd - 1, spanEnd) === '}' ||
          /[=+\-*/<>^_]/.test(nextChar);

        // Avoid pulling standalone "a" if followed by prose
        if (looksMathConnected && !(ch === 'a' && /^[a-zA-ZÀ-ÿ]/.test(text.slice(afterWs)))) {
          spanEnd = afterVar;
          cursor = afterVar;
          continue;
        }
      }

      break;
    }

    const rawMath = text.slice(i, spanEnd).trim();
    if (rawMath) {
      segments.push({
        type: 'inline-math',
        value: normalizeBareScripts(rawMath),
      });
    }

    textStart = spanEnd;
    i = spanEnd;
  }

  if (textStart < text.length) {
    segments.push({ type: 'text', value: text.slice(textStart) });
  }

  return segments;
}

/**
 * Parses arbitrary text/LaTeX into renderable segments:
 * 1. Explicit `block` mode or single wrapped `$$...$$` -> single `block-math` segment.
 * 2. Strings containing `$` delimiters -> `$$...$$` and `$...$` mixed with `text`.
 * 3. Un-delimited strings -> pure formula if purely mathematical, or prose with extracted inline math spans.
 */
export function parseMathContent(content: string, block = false): MathSegment[] {
  if (!content) return [];

  const trimmed = content.trim();
  const isSingleWrappedBlock =
    trimmed.startsWith('$$') &&
    trimmed.endsWith('$$') &&
    trimmed.length > 4 &&
    trimmed.indexOf('$$', 2) === trimmed.length - 2;

  if (isSingleWrappedBlock) {
    const cleanFormula = trimmed.slice(2, -2).trim();
    return [{ type: 'block-math', value: cleanFormula }];
  }

  if (content.includes('$')) {
    const segments: MathSegment[] = [];
    const regex = /\$\$([\s\S]*?)\$\$|\$([^\$\n]+)\$/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      }
      if (match[1] !== undefined) {
        segments.push({ type: 'block-math', value: match[1].trim() });
      } else if (match[2] !== undefined) {
        segments.push({ type: 'inline-math', value: match[2].trim() });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      segments.push({ type: 'text', value: content.slice(lastIndex) });
    }

    return segments;
  }

  if (isPureFormulaWithoutDelimiters(content)) {
    return [{ type: block ? 'block-math' : 'inline-math', value: normalizeBareScripts(trimmed) }];
  }

  if (/[\\^_]/.test(content)) {
    const extracted = extractInlineMathFromProse(content);
    if (block && extracted.length === 1 && extracted[0].type === 'inline-math') {
      return [{ type: 'block-math', value: extracted[0].value }];
    }
    return extracted;
  }

  const looksLikeBareEquation =
    block &&
    /[=\\^_+\-*/<>]/.test(trimmed) &&
    !/[àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]/.test(trimmed) &&
    !/\b(le|la|les|des|une|est|sont|pour|dans|avec|sans)\b/i.test(trimmed);

  return [{ type: looksLikeBareEquation ? 'block-math' : 'text', value: looksLikeBareEquation ? trimmed : content }];
}

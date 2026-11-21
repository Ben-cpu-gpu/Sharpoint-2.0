import React from 'react';
import katex from 'katex';
import { parseMathContent } from '../../utils/mathParser';
import { useKatexRepairContext } from '../../contexts/KatexRepairContext';

interface MathViewProps {
  math?: string;
  children?: string;
  block?: boolean;
  className?: string;
  repairEnabled?: boolean;
  onOpenRepair?: (brokenLatex: string) => void;
}

/**
 * Composant de rendu mathématique LaTeX sécurisé avec KaTeX.
 * Gère les formules pures, les textes mixtes avec délimiteurs $...$ / $$...$$,
 * et les phrases mixtes contenant des fragments LaTeX sans délimiteurs.
 * - Détecte fidèlement toute erreur KaTeX (throwOnError: true).
 * - N'affiche le déclencheur cliquable `✨ Réparer` et le ciblage direct
 *   que lorsque l'interrupteur Mode KaTeX est activé.
 */
export const MathView: React.FC<MathViewProps> = ({
  math,
  children,
  block = false,
  className = '',
  repairEnabled,
  onOpenRepair,
}) => {
  const { katexRepairMode } = useKatexRepairContext();
  const isRepairActive = repairEnabled ?? katexRepairMode;

  const content = math || children || '';
  if (!content) return null;

  const renderFormula = (latex: string, displayMode: boolean): { html: string; hasError: boolean } => {
    try {
      const html = katex.renderToString(latex, {
        displayMode,
        throwOnError: true,
        strict: false,
        trust: true,
      });
      return { html, hasError: false };
    } catch (err: any) {
      console.warn('Erreur de syntaxe KaTeX interceptée :', err);
      const encoded = encodeURIComponent(latex);
      const escaped = latex.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (!isRepairActive) {
        const cleanHtml = `<code class="font-mono text-xs text-slate-300 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.08]">${escaped}</code>`;
        return { html: cleanHtml, hasError: true };
      }
      const html = `<span role="button" tabindex="0" title="Formule KaTeX incorrecte — Cliquez pour la réparer avec l'Assistant IA" class="cursor-pointer text-amber-300 font-mono text-sm bg-amber-950/60 hover:bg-amber-900/80 px-2 py-0.5 rounded border border-amber-500/60 inline-flex items-center gap-1.5 transition-colors katex-repair-trigger shadow-sm" data-latex="${encoded}"><span class="text-amber-400 font-bold">✨ Réparer</span><span>${escaped}</span></span>`;
      return { html, hasError: true };
    }
  };

  const segments = parseMathContent(content, block);

  const handleClick = (e: React.MouseEvent<HTMLDivElement | HTMLSpanElement>) => {
    if (!onOpenRepair || !isRepairActive) return;
    const target = (e.target as HTMLElement).closest('.katex-repair-trigger');
    if (target) {
      const rawLatex = target.getAttribute('data-latex');
      if (rawLatex) {
        onOpenRepair(decodeURIComponent(rawLatex));
      }
      return;
    }
    const selectScope = (e.target as HTMLElement).closest('[data-katex-select-mode="true"]');
    if (selectScope) {
      const formulaNode = (e.target as HTMLElement).closest('.katex-formula-node');
      const rawMath = formulaNode?.getAttribute('data-raw-math');
      if (rawMath) {
        onOpenRepair(rawMath);
      }
    }
  };

  if (segments.length === 1 && segments[0].type === 'block-math') {
    const { html } = renderFormula(segments[0].value, true);
    return (
      <div
        onClick={handleClick}
        data-raw-math={segments[0].value}
        className={`katex-formula-node my-2 overflow-x-auto py-1 text-center select-text ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (segments.length === 1 && segments[0].type === 'text') {
    return <span className={className}>{segments[0].value}</span>;
  }

  return (
    <span onClick={handleClick} className={`leading-relaxed ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <React.Fragment key={`txt_${idx}`}>{seg.value}</React.Fragment>;
        }
        if (seg.type === 'block-math') {
          const { html } = renderFormula(seg.value, true);
          return (
            <div
              key={`mb_${idx}`}
              data-raw-math={seg.value}
              className="katex-formula-node my-2 overflow-x-auto select-text text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        const { html } = renderFormula(seg.value, false);
        return (
          <span
            key={`mi_${idx}`}
            data-raw-math={seg.value}
            className="katex-formula-node inline-block px-0.5 align-baseline select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
};

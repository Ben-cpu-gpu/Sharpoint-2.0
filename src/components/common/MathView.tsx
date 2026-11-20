import React from 'react';
import katex from 'katex';
import { parseMathContent } from '../../utils/mathParser';

interface MathViewProps {
  math?: string;
  children?: string;
  block?: boolean;
  className?: string;
  onOpenRepair?: (brokenLatex: string) => void;
}

/**
 * Composant de rendu mathématique LaTeX sécurisé avec KaTeX.
 * Gère les formules pures, les textes mixtes avec délimiteurs $...$ / $$...$$,
 * et les phrases mixtes contenant des fragments LaTeX sans délimiteurs.
 * En cas d'erreur de rendu KaTeX, propose un badge cliquable pour lancer l'Assistant de Réparation IA.
 */
export const MathView: React.FC<MathViewProps> = ({
  math,
  children,
  block = false,
  className = '',
  onOpenRepair,
}) => {
  const content = math || children || '';
  if (!content) return null;

  const renderFormula = (latex: string, displayMode: boolean): string => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: true,
      });
    } catch (err: any) {
      console.warn('Erreur de syntaxe KaTeX interceptée :', err);
      const encoded = encodeURIComponent(latex);
      return `<span role="button" tabindex="0" title="Formule KaTeX incorrecte — Cliquez pour la réparer avec l'Assistant IA" class="cursor-pointer text-amber-300 font-mono text-sm bg-amber-950/60 hover:bg-amber-900/80 px-2 py-0.5 rounded border border-amber-500/60 inline-flex items-center gap-1.5 transition-colors katex-repair-trigger shadow-sm" data-latex="${encoded}"><span class="text-amber-400 font-bold">✨ Réparer</span><span>${latex.replace(/</g, '&lt;')}</span></span>`;
    }
  };

  const segments = parseMathContent(content, block);

  const handleClick = (e: React.MouseEvent<HTMLDivElement | HTMLSpanElement>) => {
    const target = (e.target as HTMLElement).closest('.katex-repair-trigger');
    if (target && onOpenRepair) {
      const rawLatex = target.getAttribute('data-latex');
      if (rawLatex) {
        onOpenRepair(decodeURIComponent(rawLatex));
      }
    }
  };

  if (segments.length === 1 && segments[0].type === 'block-math') {
    const html = renderFormula(segments[0].value, true);
    return (
      <div
        onClick={handleClick}
        className={`my-2 overflow-x-auto py-1 text-center select-text ${className}`}
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
          const html = renderFormula(seg.value, true);
          return (
            <div
              key={`mb_${idx}`}
              className="my-2 overflow-x-auto select-text text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        const html = renderFormula(seg.value, false);
        return (
          <span
            key={`mi_${idx}`}
            className="inline-block px-0.5 align-baseline select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
};

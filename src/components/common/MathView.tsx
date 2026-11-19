import React from 'react';
import katex from 'katex';

interface MathViewProps {
  math?: string;
  children?: string;
  block?: boolean;
  className?: string;
}

/**
 * Composant de rendu mathématique LaTeX ultra-sécurisé avec KaTeX.
 * Gère à la fois les formules pures et les textes mixtes contenant des délimiteurs $...$ ou $$...$$.
 * Encadré par un try/catch pour ne JAMAIS faire crasher l'UI en cas de syntaxe KaTeX invalide.
 */
export const MathView: React.FC<MathViewProps> = ({
  math,
  children,
  block = false,
  className = '',
}) => {
  const content = math || children || '';

  // Fonction de rendu d'une formule isolée avec gestion des erreurs
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
      // Fallback gracieux en texte brut sécurisé
      return `<span class="text-amber-400 font-mono text-sm bg-amber-950/40 px-1 py-0.5 rounded border border-amber-800/50">${latex.replace(/</g, '&lt;')}</span>`;
    }
  };

  // Si le contenu commence et finit par $$ ou si c'est un pur bloc
  const trimmed = content.trim();
  if (block || (trimmed.startsWith('$$') && trimmed.endsWith('$$'))) {
    const cleanFormula = trimmed.startsWith('$$') && trimmed.endsWith('$$')
      ? trimmed.slice(2, -2).trim()
      : trimmed;

    const html = renderFormula(cleanFormula, true);

    return (
      <div
        className={`my-2 overflow-x-auto py-1 text-center select-text ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Traitement de texte mixte contenant des délimiteurs $ ou $$
  // Regex pour détecter les blocs $$...$$ et les inlines $...$
  const parseMixedContent = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /\$\$([\s\S]*?)\$\$|\$([^\$\n]+)\$/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIdx = 0;

    while ((match = regex.exec(text)) !== null) {
      // Texte avant le match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1] !== undefined) {
        // Formule display $$...$$
        const html = renderFormula(match[1].trim(), true);
        parts.push(
          <div
            key={`math_block_${keyIdx++}`}
            className="my-2 overflow-x-auto select-text text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } else if (match[2] !== undefined) {
        // Formule inline $...$
        const html = renderFormula(match[2].trim(), false);
        parts.push(
          <span
            key={`math_inline_${keyIdx++}`}
            className="inline-block px-0.5 align-middle select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // Vérifier si le texte contient du LaTeX avec des dollars
  if (content.includes('$')) {
    return (
      <span className={`leading-relaxed ${className}`}>
        {parseMixedContent(content)}
      </span>
    );
  }

  // Si c'est une formule brute passée sans dollars
  const isLikelyFormula = /[\\[\]{}^_+=]/.test(content);
  if (isLikelyFormula) {
    const html = renderFormula(content, block);
    return (
      <span
        className={`inline-block select-text ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <span className={className}>{content}</span>;
};

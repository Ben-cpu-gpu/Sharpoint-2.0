import React, { useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';

export interface SelectedKatexTarget {
  snippet: string;
  scopeType: 'sheet' | 'td' | 'annale';
  scopeId: string;
}

interface SelectionRepairBarProps {
  onRepairSelection: (target: SelectedKatexTarget) => void;
}

interface FloatingPos {
  x: number;
  y: number;
}

function getElementFromNode(node: Node | null): HTMLElement | null {
  if (!node) return null;
  if (node instanceof HTMLElement) return node;
  return node.parentElement;
}

/**
 * Barre flottante contextuelle : lorsqu'un utilisateur sélectionne une formule ou du texte LaTeX
 * dans une fiche, un TD ou une annale, propose de l'envoyer directement à l'Assistant KaTeX
 * pour le réparer et l'appliquer en place.
 */
export const SelectionRepairBar: React.FC<SelectionRepairBarProps> = ({ onRepairSelection }) => {
  const [target, setTarget] = useState<SelectedKatexTarget | null>(null);
  const [pos, setPos] = useState<FloatingPos | null>(null);

  useEffect(() => {
    const updateFromSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setTarget(null);
        setPos(null);
        return;
      }

      const rawText = sel.toString().trim();
      const range = sel.getRangeAt(0);
      const anchorEl = getElementFromNode(range.commonAncestorContainer);
      const scopeEl = anchorEl?.closest('[data-katex-repair-scope]') as HTMLElement | null;

      if (!scopeEl) {
        setTarget(null);
        setPos(null);
        return;
      }

      const scopeType = (scopeEl.getAttribute('data-scope-type') || 'sheet') as 'sheet' | 'td' | 'annale';
      const scopeId = scopeEl.getAttribute('data-scope-id') || '';

      // Si la sélection touche directement un nœud KaTeX rendu, récupère le code LaTeX source exact
      const startFormula = getElementFromNode(range.startContainer)?.closest('[data-raw-math]') as HTMLElement | null;
      const endFormula = getElementFromNode(range.endContainer)?.closest('[data-raw-math]') as HTMLElement | null;
      let snippet = rawText;

      if (startFormula && (!endFormula || startFormula === endFormula)) {
        const rawMath = startFormula.getAttribute('data-raw-math');
        if (rawMath && rawMath.trim().length >= 2) {
          snippet = rawMath.trim();
        }
      }

      if (!snippet || snippet.length < 2 || snippet.length > 800) {
        setTarget(null);
        setPos(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setTarget(null);
        setPos(null);
        return;
      }

      const vw = window.innerWidth;
      const clampedX = Math.max(115, Math.min(vw - 115, rect.left + rect.width / 2));
      const clampedY = rect.top > 72 ? rect.top - 10 : Math.min(window.innerHeight - 60, rect.bottom + 46);

      setTarget({ snippet, scopeType, scopeId });
      setPos({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = () => {
      window.setTimeout(updateFromSelection, 15);
    };

    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchend', handlePointerUp);
    document.addEventListener('keyup', handlePointerUp);

    return () => {
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchend', handlePointerUp);
      document.removeEventListener('keyup', handlePointerUp);
    };
  }, []);

  if (!target || !pos) return null;

  return (
    <div
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
      className="fixed z-50 animate-fade-in"
    >
      <button
        type="button"
        onMouseDown={e => {
          // Empêche la perte de sélection avant le clic
          e.preventDefault();
        }}
        onClick={() => {
          onRepairSelection(target);
          window.getSelection()?.removeAllRanges();
          setTarget(null);
          setPos(null);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold shadow-[0_8px_24px_rgba(245,158,11,0.45)] border border-amber-300 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
      >
        <Wand2 className="w-3.5 h-3.5" />
        <span>Réparer sélection KaTeX</span>
      </button>
    </div>
  );
};

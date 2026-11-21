import { createContext, useContext } from 'react';

interface KatexRepairContextValue {
  katexRepairMode: boolean;
  setKatexRepairMode: (next: boolean) => void;
  toggleKatexRepairMode: () => void;
  onOpenKatexModal: (initialLatex?: string) => void;
}

const KatexRepairContext = createContext<KatexRepairContextValue>({
  katexRepairMode: false,
  setKatexRepairMode: () => {},
  toggleKatexRepairMode: () => {},
  onOpenKatexModal: () => {},
});

export const KatexRepairProvider = KatexRepairContext.Provider;

export function useKatexRepairContext(): KatexRepairContextValue {
  return useContext(KatexRepairContext);
}

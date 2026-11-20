import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#0A0E19]/95 border border-amber-400/50 px-3.5 py-2 text-xs font-semibold text-amber-200 shadow-2xl backdrop-blur-md"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Mode hors-ligne · Fiches locales en cache</span>
    </div>
  );
};

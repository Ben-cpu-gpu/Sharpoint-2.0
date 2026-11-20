import React, { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { User } from 'firebase/auth';

export type CloudSyncState = 'offline_local' | 'connecting' | 'synced' | 'syncing' | 'error';

interface CloudSyncControlProps {
  user: User | null;
  authReady: boolean;
  syncState: CloudSyncState;
  syncError: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const CloudSyncControl: React.FC<CloudSyncControlProps> = ({
  user,
  authReady,
  syncState,
  syncError,
  onSignIn,
  onSignOut,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  const handleSignInClick = async () => {
    setIsBusy(true);
    try {
      await onSignIn();
      setMenuOpen(false);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOutClick = async () => {
    setIsBusy(true);
    try {
      await onSignOut();
      setMenuOpen(false);
    } finally {
      setIsBusy(false);
    }
  };

  if (!authReady) {
    return (
      <div
        aria-label="Initialisation de la synchronisation cloud"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A0E19] border border-white/[0.1] text-xs text-slate-400"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
        <span className="hidden lg:inline">Sync...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={handleSignInClick}
        disabled={isBusy}
        aria-label="Se connecter avec Google pour synchroniser entre PC et téléphone"
        title="Synchroniser vos fiches et clés API avec Google"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-white/[0.12] hover:border-amber-400/45 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
      >
        {isBusy ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
        ) : (
          <LogIn className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span className="hidden sm:inline">Connexion Google</span>
        <span className="sm:hidden">Sync</span>
      </button>
    );
  }

  const firstName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Compte';

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen(prev => !prev)}
        aria-expanded={menuOpen}
        aria-label={`Compte connecté ${user.email || firstName}`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-emerald-400/35 text-xs font-semibold text-slate-100 transition-colors whitespace-nowrap shrink-0"
      >
        {syncState === 'syncing' || syncState === 'connecting' ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
        ) : syncState === 'error' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        ) : (
          <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        )}
        <span className="hidden md:inline max-w-[96px] truncate">{firstName}</span>
        <span
          aria-hidden="true"
          className={`w-2 h-2 rounded-full shrink-0 ${
            syncState === 'error'
              ? 'bg-rose-400'
              : syncState === 'syncing' || syncState === 'connecting'
              ? 'bg-sky-400 animate-pulse'
              : 'bg-emerald-400'
          }`}
        />
      </button>

      {menuOpen && (
        <div
          role="dialog"
          aria-label="Statut du compte et synchronisation cloud"
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0A0E19] border border-white/[0.12] p-4 shadow-2xl z-50 space-y-3"
        >
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-9 h-9 rounded-full border border-white/[0.15] shrink-0 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xs font-bold text-amber-300 shrink-0">
                {firstName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display text-xs font-bold text-slate-100 truncate">
                {user.displayName || 'Étudiant ESTACA'}
              </p>
              <p className="text-[11px] font-mono text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#04060C] border border-white/[0.08] text-[11px] flex items-center gap-2">
            {syncState === 'error' ? (
              <>
                <CloudOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-rose-300 truncate">{syncError || 'Erreur de synchronisation'}</span>
              </>
            ) : syncState === 'syncing' || syncState === 'connecting' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
                <span className="text-sky-300">Synchronisation cloud en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-300">Synchronisé PC &amp; mobile en temps réel</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleSignOutClick}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#04060C] hover:bg-rose-950/30 border border-white/[0.1] hover:border-rose-400/40 text-xs font-semibold text-slate-300 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Se déconnecter</span>
          </button>
        </div>
      )}
    </div>
  );
};

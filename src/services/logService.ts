import { DebugLog } from '../types/course';

const STORAGE_KEY = 'fichemaster_debug_logs';
const MAX_LOGS = 100;

type LogListener = (logs: DebugLog[]) => void;
const listeners: Set<LogListener> = new Set();

export const getStoredLogs = (): DebugLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load logs from localStorage', e);
    return [];
  }
};

let currentLogs: DebugLog[] = getStoredLogs();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener([...currentLogs]);
    } catch (e) {
      console.error('Error notifying log listener', e);
    }
  });
};

export const subscribeToLogs = (listener: LogListener): (() => void) => {
  listeners.add(listener);
  listener([...currentLogs]);
  return () => {
    listeners.delete(listener);
  };
};

export const addDebugLog = (entry: Omit<DebugLog, 'id' | 'timestamp'>): DebugLog => {
  const newLog: DebugLog = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    }),
  };

  currentLogs = [newLog, ...currentLogs].slice(0, MAX_LOGS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentLogs));
  } catch (e) {
    console.error('Failed to persist log', e);
  }

  notifyListeners();
  return newLog;
};

export const clearLogs = (): void => {
  currentLogs = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear logs', e);
  }
  notifyListeners();
};

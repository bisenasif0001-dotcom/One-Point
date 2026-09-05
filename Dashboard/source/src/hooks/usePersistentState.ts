import { useEffect, useState } from 'react';

function resolveInitialValue<T>(initialValue: T | (() => T)) {
  return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
}

function readStoredValue<T>(key: string, fallback: T) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  } catch {
    return fallback;
  }
}

export function usePersistentState<T>(key: string, initialValue: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    const fallback = resolveInitialValue(initialValue);
    return readStoredValue<T>(key, fallback);
  });

  useEffect(() => {
    try {
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
        return;
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}

import { useState, useEffect } from 'react';

// Like useState, but persisted to localStorage under `key`.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable - ignore */
    }
  }, [key, value]);

  return [value, setValue];
}

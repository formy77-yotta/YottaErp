'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Restituisce il valore debounced dopo il delay specificato.
 * Utile per campi di ricerca che aggiornano l'URL senza inviare a ogni keystroke.
 *
 * @param value - Valore da debounce
 * @param delay - Ritardo in ms (es. 500)
 * @returns Valore aggiornato dopo delay ms di inattività
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Chiama callback dopo delay ms dall'ultima invocazione.
 * Utile per aggiornare l'URL di ricerca al termine della digitazione.
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId);
      const id = setTimeout(() => {
        callback(...args);
        setTimeoutId(null);
      }, delay);
      setTimeoutId(id);
    },
    [callback, delay, timeoutId]
  );

  return debounced;
}

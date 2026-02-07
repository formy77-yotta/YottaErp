'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

const DEFAULT_DEBOUNCE_MS = 500;

export interface DataTableSearchInputProps {
  /** Valore corrente dall'URL (source of truth per sync esterno, es. back) */
  value: string;
  /** Chiamato dopo debounce quando il valore cambia (aggiorna URL) */
  onDebouncedChange: (value: string) => void;
  /** Ritardo in ms prima di chiamare onDebouncedChange (default 500) */
  debounceMs?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Input di ricerca per DataTable: valore locale per feedback immediato,
 * aggiornamento URL solo dopo debounce. Sync da URL solo quando non focalizzato
 * per evitare che re-render con URL provvisorio sovrascrivano la digitazione (no flicker).
 */
export function DataTableSearchInput({
  value,
  onDebouncedChange,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  placeholder = 'Cerca...',
  className,
}: DataTableSearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, debounceMs);
  const isFocusedRef = useRef(false);

  // Sincronizza da URL solo quando l'input NON è focalizzato (es. dopo "Indietro").
  // Mentre l'utente digita non tocchiamo mai localValue per evitare lampaggi.
  useEffect(() => {
    if (isFocusedRef.current) return;
    if (value !== localValue) setLocalValue(value);
  }, [value, localValue]);

  // Notifica il parent dopo debounce (solo se diverso dal valore URL corrente)
  useEffect(() => {
    const next = debouncedValue.trim();
    const current = value.trim();
    if (next === current) return;
    onDebouncedChange(debouncedValue);
  }, [debouncedValue, value, onDebouncedChange]);

  return (
    <Input
      type="search"
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => { isFocusedRef.current = true; }}
      onBlur={() => { isFocusedRef.current = false; }}
      className={cn('h-8 w-40', className)}
      aria-label={placeholder}
    />
  );
}

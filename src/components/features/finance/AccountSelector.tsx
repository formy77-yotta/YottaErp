'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getFinancialAccounts } from '@/actions/finance';

const TYPE_LABELS: Record<string, string> = {
  BANK: 'Banca',
  CASH: 'Cassa',
  VIRTUAL: 'Virtuale',
};

export type FinancialAccountTypeFilter = 'BANK' | 'CASH' | 'VIRTUAL';

interface AccountSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Mostra solo conti di questo tipo (es. solo CASH per Contanti/Assegno) */
  filterByType?: FinancialAccountTypeFilter;
  className?: string;
}

export function AccountSelector({
  value,
  onValueChange,
  placeholder = 'Seleziona conto',
  disabled = false,
  filterByType,
  className,
}: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getFinancialAccounts()
      .then((list) => {
        if (!cancelled) {
          const filtered = filterByType
            ? list.filter((a) => a.type === filterByType)
            : list;
          setAccounts(filtered);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterByType]);

  const displayAccounts = accounts;

  return (
    <Select
      value={value ?? ''}
      onValueChange={onValueChange}
      disabled={disabled || loading}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? 'Caricamento...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {displayAccounts.map((acc) => (
          <SelectItem key={acc.id} value={acc.id}>
            {acc.name} ({TYPE_LABELS[acc.type] ?? acc.type})
          </SelectItem>
        ))}
        {displayAccounts.length === 0 && !loading && (
          <div className="py-2 px-2 text-sm text-muted-foreground">
            Nessun conto disponibile
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

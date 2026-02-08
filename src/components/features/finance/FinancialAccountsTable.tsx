'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { getAccountBalances, deleteFinancialAccount } from '@/actions/finance';
import { formatCurrency } from '@/lib/decimal-utils';
import { Decimal } from 'decimal.js';
import { useEffect, useState } from 'react';

const TYPE_LABELS: Record<string, string> = {
  BANK: 'Banca',
  CASH: 'Cassa',
  VIRTUAL: 'Virtuale',
};

/** Dati serializzabili per la tabella (saldi come stringa per client) */
export type AccountBalanceRow = {
  id: string;
  name: string;
  type: string;
  iban: string | null;
  balance: string;
};

interface FinancialAccountsTableProps {
  refreshKey?: number;
}

export function FinancialAccountsTable({ refreshKey = 0 }: FinancialAccountsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<AccountBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAccountBalances().then((list) => {
      setRows(
        list.map((acc) => ({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          iban: acc.iban,
          balance: acc.balance.toString(),
        }))
      );
      setLoading(false);
    });
  }, [refreshKey]);

  async function handleDelete(id: string) {
    const result = await deleteFinancialAccount(id);
    if (result.success) {
      router.refresh();
      setRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      alert(result.error);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>IBAN</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell className="text-right"><div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <p>Nessun conto configurato.</p>
        <p className="text-sm mt-1">Usa &quot;Aggiungi conto&quot; per creare una banca, cassa o conto virtuale.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>IBAN</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>{TYPE_LABELS[row.type] ?? row.type}</TableCell>
              <TableCell className="font-mono text-sm">{row.iban ?? '—'}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(new Decimal(row.balance))}
              </TableCell>
              <TableCell>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminare questo conto?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Il conto &quot;{row.name}&quot; potrà essere eliminato solo se non ha pagamenti collegati.
                        Questa azione non può essere annullata.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(row.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { listPayments, type ListPaymentItem } from '@/actions/finance';
import { formatCurrency } from '@/lib/decimal-utils';
import { Decimal } from 'decimal.js';
import { Link2 } from 'lucide-react';

const DIRECTION_LABELS: Record<string, string> = {
  INFLOW: 'Entrata',
  OUTFLOW: 'Uscita',
};

interface PaymentsTableProps {
  refreshKey?: number;
  onCollegaScadenze: (paymentId: string) => void;
}

export function PaymentsTable({ refreshKey = 0, onCollegaScadenze }: PaymentsTableProps) {
  const [rows, setRows] = useState<ListPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listPayments()
      .then(setRows)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Importo</TableHead>
              <TableHead>Direzione</TableHead>
              <TableHead>Conto</TableHead>
              <TableHead className="text-right">Allocato</TableHead>
              <TableHead className="text-right">Residuo</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell className="text-right"><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                <TableCell className="text-right"><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
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
        <p>Nessun pagamento registrato.</p>
        <p className="text-sm mt-1">Usa &quot;Nuovo pagamento&quot; per registrare un movimento e collegarlo a una scadenza.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Importo</TableHead>
            <TableHead>Direzione</TableHead>
            <TableHead>Conto</TableHead>
            <TableHead className="text-right">Allocato</TableHead>
            <TableHead className="text-right">Residuo</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const amount = new Decimal(row.amount);
            const allocated = row.allocated;
            const residual = amount.minus(allocated).toNumber();
            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {new Date(row.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </TableCell>
                <TableCell>{formatCurrency(amount)}</TableCell>
                <TableCell>{DIRECTION_LABELS[row.direction] ?? row.direction}</TableCell>
                <TableCell>{row.accountName}</TableCell>
                <TableCell className="text-right">{formatCurrency(new Decimal(allocated))}</TableCell>
                <TableCell className="text-right">{formatCurrency(new Decimal(residual))}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCollegaScadenze(row.id)}
                    title="Collega scadenze"
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Collega scadenze
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

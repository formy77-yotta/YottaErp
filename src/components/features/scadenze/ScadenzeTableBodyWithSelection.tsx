'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ScadenzeDataTableHeader } from './ScadenzeDataTableHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/decimal-utils';
import { Decimal } from 'decimal.js';
import { ReconcilePaymentDialog, type ScadenzaRow } from './ReconcilePaymentDialog';
import type { PaymentDeadlineRow } from '@/services/queries/payment-queries';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Da pagare',
  PAID: 'Pagata',
  PARTIAL: 'Parziale',
};
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDING: 'outline',
  PAID: 'default',
  PARTIAL: 'secondary',
};

function AmountCell({ amount, operationSignValuation }: { amount: string; operationSignValuation: number }) {
  const decimal = new Decimal(amount);
  const signed = decimal.mul(operationSignValuation);
  const isNegative = signed.lessThan(0);
  return (
    <span
      className={
        isNegative
          ? 'font-medium text-red-600 dark:text-red-400'
          : 'font-medium text-green-600 dark:text-green-400'
      }
    >
      {formatCurrency(signed)}
    </span>
  );
}

function ScadenzaProgressBar({
  paid,
  total,
  operationSignValuation,
}: {
  paid: string;
  total: string;
  operationSignValuation: number;
}) {
  const paidNum = parseFloat(paid);
  const totalNum = parseFloat(total);
  const pct = totalNum !== 0 ? Math.min(100, (paidNum / totalNum) * 100) : 0;
  const signedPaid = new Decimal(paid).mul(operationSignValuation);
  const isNegative = signedPaid.lessThan(0);
  const textClass = isNegative
    ? 'text-xs text-red-600 dark:text-red-400'
    : 'text-xs text-green-600 dark:text-green-400';
  return (
    <div className="space-y-1 min-w-0">
      <p className={`${textClass} whitespace-nowrap truncate`}>{formatCurrency(signedPaid)}</p>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden min-w-0">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.abs(pct)}%` }}
        />
      </div>
    </div>
  );
}

function toScadenzaRow(d: PaymentDeadlineRow): ScadenzaRow {
  return {
    id: d.id,
    amount: d.amount,
    paidAmount: d.paidAmount,
    document: { number: d.document.number, documentDirection: d.document.documentDirection },
  };
}

export function ScadenzeTableBodyWithSelection({ deadlines }: { deadlines: PaymentDeadlineRow[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  const selectedRows = deadlines.filter((d) => selectedIds.has(d.id));
  const scadenzeForDialog = selectedRows.map(toScadenzaRow);
  const canAllocate = selectedRows.length > 0 && selectedRows.every((d) => new Decimal(d.amount).minus(d.paidAmount).greaterThan(0));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === deadlines.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(deadlines.map((d) => d.id)));
  };

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/40 mb-2">
          <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!canAllocate}>
            <Wallet className="h-4 w-4 mr-1" />
            Alloca pagamento ({selectedRows.length} scadenze)
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Deseleziona
          </Button>
        </div>
      )}
      <Table className="min-w-[900px]">
        <ScadenzeDataTableHeader showSelectColumn />
        <TableBody>
        {deadlines.map((d) => (
          <TableRow key={d.id} className="whitespace-nowrap">
            <TableCell className="w-10 shrink-0">
              {new Decimal(d.amount).minus(d.paidAmount).greaterThan(0) && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(d.id)}
                  onChange={() => toggleOne(d.id)}
                  className="h-4 w-4 rounded border-input"
                />
              )}
            </TableCell>
            <TableCell className="font-medium shrink-0">
              {new Date(d.dueDate).toLocaleDateString('it-IT', {
                weekday: 'short',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })}
            </TableCell>
            <TableCell className="shrink-0">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="font-mono text-sm">{d.document.number}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {d.document.documentTypeDescription}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="max-w-[180px] min-w-0">
              <span className="text-sm truncate block" title={d.document.customerNameSnapshot || undefined}>
                {d.document.customerNameSnapshot || '—'}
              </span>
            </TableCell>
            <TableCell className="text-right shrink-0">
              <AmountCell amount={d.amount} operationSignValuation={d.operationSignValuation} />
            </TableCell>
            <TableCell className="w-[140px] min-w-[140px] shrink-0">
              <ScadenzaProgressBar
                paid={d.paidAmount}
                total={d.amount}
                operationSignValuation={d.operationSignValuation}
              />
            </TableCell>
            <TableCell className="shrink-0">
              <Badge variant={STATUS_VARIANTS[d.status] ?? 'outline'}>
                {STATUS_LABELS[d.status] ?? d.status}
              </Badge>
            </TableCell>
            <TableCell className="w-0 p-0" />
            <TableCell className="text-right w-[180px] shrink-0">
              <div className="flex items-center justify-end gap-1 flex-nowrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedIds(new Set([d.id]));
                    setDialogOpen(true);
                  }}
                  title="Pagamento"
                  disabled={!new Decimal(d.amount).minus(d.paidAmount).greaterThan(0)}
                >
                  <Wallet className="h-4 w-4 mr-1" />
                  Pagamento
                </Button>
                <Link href={`/documents/${d.documentId}`}>
                  <Button variant="ghost" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    Documento
                  </Button>
                </Link>
              </div>
            </TableCell>
          </TableRow>
        ))}
        </TableBody>
      </Table>
      <ReconcilePaymentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedIds(new Set());
        }}
        scadenze={dialogOpen && scadenzeForDialog.length > 0 ? scadenzeForDialog : null}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}

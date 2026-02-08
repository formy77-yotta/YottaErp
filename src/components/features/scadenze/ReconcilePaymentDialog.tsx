'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getFinancialAccounts,
  getInstallmentsForAllocation,
  type InstallmentOption,
  listPayments,
  reconcilePayment,
} from '@/actions/finance';
import { getPaymentTypesAction } from '@/services/actions/payment-actions';
import { formatCurrency } from '@/lib/decimal-utils';
import { Decimal } from 'decimal.js';

export type ScadenzaRow = {
  id: string;
  amount: string;
  paidAmount: string;
  document: { number: string };
};

type PaymentOption = {
  id: string;
  amount: string;
  date: string;
  direction: string;
  reference: string | null;
  allocated: number;
};

type PaymentTypeOption = { id: string; name: string };

const residual = (p: PaymentOption) =>
  new Decimal(p.amount).minus(p.allocated).toNumber();

export function ReconcilePaymentDialog({
  open,
  onOpenChange,
  scadenza,
  initialPaymentId = null,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scadenza: ScadenzaRow | null;
  /** Quando aperto dalla pagina Pagamenti "Collega scadenze" */
  initialPaymentId?: string | null;
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [payments, setPayments] = useState<PaymentOption[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeOption[]>([]);
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newFinancialAccountId, setNewFinancialAccountId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newDirection, setNewDirection] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');
  const [newPaymentTypeId, setNewPaymentTypeId] = useState<string>('');
  const [newReference, setNewReference] = useState('');
  const [newNotes, _setNewNotes] = useState('');
  const [financialAccounts, setFinancialAccounts] = useState<Array<{ id: string; name: string }>>([]);

  const [existingPaymentId, setExistingPaymentId] = useState<string>('');
  const [allocateAmount, setAllocateAmount] = useState('');

  /** Scadenza effettiva: da prop o dalla selezione dropdown (pagina Pagamenti) */
  const effectiveScadenza: ScadenzaRow | null = scadenza
    ? scadenza
    : selectedInstallmentId
      ? (() => {
          const opt = installmentOptions.find((o) => o.id === selectedInstallmentId);
          return opt ? { id: opt.id, amount: opt.amount, paidAmount: opt.paidAmount, document: { number: opt.documentNumber } } : null;
        })()
      : null;

  const deadlineResidual = effectiveScadenza
    ? new Decimal(effectiveScadenza.amount).minus(effectiveScadenza.paidAmount).toNumber()
    : 0;

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialPaymentId) {
      setMode('existing');
      setExistingPaymentId(initialPaymentId);
    }
    if (scadenza) {
      const residualScadenza = new Decimal(scadenza.amount).minus(scadenza.paidAmount).toFixed(2);
      setAllocateAmount(residualScadenza);
    } else {
      setAllocateAmount('');
      setSelectedInstallmentId('');
    }

    Promise.all([
      listPayments(),
      getPaymentTypesAction(true),
      getFinancialAccounts(),
      ...(scadenza ? [] : [getInstallmentsForAllocation()]),
    ])
      .then((results) => {
        const [payList, typesRes, accounts, instOpts] = results;
        setPayments(payList);
        if (typesRes?.success && typesRes?.data) setPaymentTypes(typesRes.data);
        setFinancialAccounts((accounts ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
        if (!scadenza && Array.isArray(instOpts)) setInstallmentOptions(instOpts);
      })
      .catch(() => setPayments([]));
  }, [open, scadenza, initialPaymentId]);

  const allocateNum = parseFloat(allocateAmount) || 0;
  const validAllocate =
    !!effectiveScadenza &&
    allocateNum > 0 &&
    allocateNum <= deadlineResidual &&
    (mode === 'new'
      ? !!newFinancialAccountId && new Decimal(newAmount || 0).gte(allocateNum)
      : true) &&
    (mode === 'existing'
      ? (() => {
          const p = payments.find((x) => x.id === existingPaymentId);
          return p ? allocateNum <= residual(p) : false;
        })()
      : true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveScadenza || !validAllocate) return;
    setLoading(true);
    setError(null);
    try {
      const amountStr = allocateAmount.replace(',', '.');
      if (mode === 'new') {
        const res = await reconcilePayment({
          newPayment: {
            financialAccountId: newFinancialAccountId,
            amount: newAmount.replace(',', '.'),
            date: new Date(newDate),
            direction: newDirection,
            paymentTypeId: newPaymentTypeId || undefined,
            reference: newReference || undefined,
            notes: newNotes || undefined,
          },
          allocations: [{ installmentId: effectiveScadenza.id, amount: amountStr }],
        });
        if (res.success) {
          onOpenChange(false);
          onSuccess?.();
        } else {
          setError(res.error);
        }
      } else {
        const res = await reconcilePayment({
          paymentId: existingPaymentId,
          allocations: [{ installmentId: effectiveScadenza.id, amount: amountStr }],
        });
        if (res.success) {
          onOpenChange(false);
          onSuccess?.();
        } else {
          setError(res.error);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento</DialogTitle>
        </DialogHeader>
        {effectiveScadenza ? (
          <p className="text-sm text-muted-foreground">
            Scadenza doc. {effectiveScadenza.document.number} · Residuo{' '}
            {formatCurrency(new Decimal(effectiveScadenza.amount).minus(effectiveScadenza.paidAmount))}
          </p>
        ) : !scadenza && installmentOptions.length > 0 ? (
          <div className="space-y-2">
            <Label>Scadenza da collegare</Label>
            <Select value={selectedInstallmentId} onValueChange={(v) => { setSelectedInstallmentId(v); const o = installmentOptions.find((x) => x.id === v); if (o) setAllocateAmount(new Decimal(o.amount).minus(o.paidAmount).toFixed(2)); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona scadenza" />
              </SelectTrigger>
              <SelectContent>
                {installmentOptions.map((o) => {
                  const res = new Decimal(o.amount).minus(o.paidAmount).toNumber();
                  if (res <= 0) return null;
                  return (
                    <SelectItem key={o.id} value={o.id}>
                      {o.documentNumber} · {new Date(o.dueDate).toLocaleDateString('it-IT')} · Residuo {formatCurrency(new Decimal(res))}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === 'new'}
                onChange={() => setMode('new')}
              />
              Nuovo pagamento
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === 'existing'}
                onChange={() => setMode('existing')}
              />
              Pagamento esistente
            </label>
          </div>

          {mode === 'new' && (
            <div className="grid gap-2">
              <Label>Conto</Label>
              <Select
                value={newFinancialAccountId}
                onValueChange={setNewFinancialAccountId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona conto" />
                </SelectTrigger>
                <SelectContent>
                  {financialAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label>Importo pagamento</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              <Label>Data</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <Label>Direzione</Label>
              <Select
                value={newDirection}
                onValueChange={(v) => setNewDirection(v as 'INFLOW' | 'OUTFLOW')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFLOW">Entrata</SelectItem>
                  <SelectItem value="OUTFLOW">Uscita</SelectItem>
                </SelectContent>
              </Select>
              {paymentTypes.length > 0 && (
                <>
                  <Label>Tipo pagamento (opz.)</Label>
                  <Select
                    value={newPaymentTypeId}
                    onValueChange={setNewPaymentTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nessuno" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Label>Riferimento (opz.)</Label>
              <Input
                value={newReference}
                onChange={(e) => setNewReference(e.target.value)}
                placeholder="Es. numero assegno"
              />
            </div>
          )}

          {mode === 'existing' && (
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <Select
                value={existingPaymentId}
                onValueChange={setExistingPaymentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {payments.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {formatCurrency(new Decimal(p.amount))} ·{' '}
                      {new Date(p.date).toLocaleDateString('it-IT')}
                      {p.reference ? ` · ${p.reference}` : ''} (residuo{' '}
                      {formatCurrency(new Decimal(residual(p)))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {effectiveScadenza && (
          <div className="space-y-2">
            <Label>Importo da allocare a questa scadenza</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={allocateAmount}
              onChange={(e) => setAllocateAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Max {formatCurrency(new Decimal(deadlineResidual))}
            </p>
          </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading || !validAllocate}>
              {loading ? 'Salvataggio...' : 'Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

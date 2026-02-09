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
  document: { number: string; documentDirection?: string };
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

/** Scadenze: una sola (da riga) o più (selezione multipla). Se scadenze è fornito e non vuoto ha priorità. */
export function ReconcilePaymentDialog({
  open,
  onOpenChange,
  scadenza,
  scadenze,
  initialPaymentId = null,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scadenza?: ScadenzaRow | null;
  /** Più scadenze da collegare in un colpo solo (totale = somma residui) */
  scadenze?: ScadenzaRow[] | null;
  initialPaymentId?: string | null;
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [payments, setPayments] = useState<PaymentOption[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeOption[]>([]);
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<Set<string>>(new Set());
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
  /** Per più scadenze: importo allocato per ogni installmentId */
  const [allocationAmounts, setAllocationAmounts] = useState<Record<string, string>>({});

  const effectiveScadenze: ScadenzaRow[] =
    scadenze && scadenze.length > 0
      ? scadenze
      : scadenza
        ? [scadenza]
        : Array.from(selectedInstallmentIds)
            .map((id) => installmentOptions.find((o) => o.id === id))
            .filter((o): o is InstallmentOption => !!o)
            .map((o) => ({
              id: o.id,
              amount: o.amount,
              paidAmount: o.paidAmount,
              document: { number: o.documentNumber, documentDirection: o.documentDirection },
            }));

  const isMultiple = effectiveScadenze.length > 1;
  const effectiveScadenzaSingle = effectiveScadenze[0] ?? null;
  const totalResidual = effectiveScadenze.reduce(
    (sum, s) => sum.plus(new Decimal(s.amount).minus(s.paidAmount)),
    new Decimal(0)
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialPaymentId) {
      setMode('existing');
      setExistingPaymentId(initialPaymentId);
    }
    if (scadenze && scadenze.length > 0) {
      const amounts: Record<string, string> = {};
      let sum = new Decimal(0);
      scadenze.forEach((s) => {
        const res = new Decimal(s.amount).minus(s.paidAmount).toFixed(2);
        amounts[s.id] = res;
        sum = sum.plus(res);
      });
      setAllocationAmounts(amounts);
      setNewAmount(sum.toFixed(2));
      setAllocateAmount(scadenze.length === 1 ? amounts[scadenze[0].id] ?? '' : '');
      const dir = scadenze[0]?.document?.documentDirection;
      setNewDirection(dir === 'PURCHASE' ? 'OUTFLOW' : 'INFLOW');
    } else if (scadenza) {
      const residualScadenza = new Decimal(scadenza.amount).minus(scadenza.paidAmount).toFixed(2);
      setAllocateAmount(residualScadenza);
      setAllocationAmounts({});
      const dir = scadenza.document?.documentDirection;
      setNewDirection(dir === 'PURCHASE' ? 'OUTFLOW' : 'INFLOW');
    } else {
      setAllocateAmount('');
      setAllocationAmounts({});
      setSelectedInstallmentIds(new Set());
    }

    Promise.all([
      listPayments(),
      getPaymentTypesAction(true),
      getFinancialAccounts(),
      ...(scadenza || (scadenze && scadenze.length > 0) ? [] : [getInstallmentsForAllocation()]),
    ])
      .then((results) => {
        const [payList, typesRes, accounts, instOpts] = results;
        setPayments(payList);
        if (typesRes?.success && typesRes?.data) setPaymentTypes(typesRes.data);
        setFinancialAccounts((accounts ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
        if (!scadenza && !(scadenze && scadenze.length > 0) && Array.isArray(instOpts)) setInstallmentOptions(instOpts);
      })
      .catch(() => setPayments([]));
  }, [open, scadenza, scadenze, initialPaymentId]);

  // Quando si selezionano/deselezionano scadenze dalla lista (pagina Pagamenti), aggiorna importi, totale e direzione
  useEffect(() => {
    if (scadenza || (scadenze && scadenze.length > 0) || selectedInstallmentIds.size === 0) return;
    const amounts: Record<string, string> = {};
    let sum = new Decimal(0);
    effectiveScadenze.forEach((s) => {
      const res = new Decimal(s.amount).minus(s.paidAmount).toFixed(2);
      amounts[s.id] = res;
      sum = sum.plus(res);
    });
    setAllocationAmounts(amounts);
    setNewAmount(sum.toFixed(2));
    if (effectiveScadenze.length === 1) setAllocateAmount(amounts[effectiveScadenze[0].id] ?? '');
    else setAllocateAmount('');
    // Acquisto = uscita, Vendita = entrata
    const dir = effectiveScadenze[0]?.document?.documentDirection;
    setNewDirection(dir === 'PURCHASE' ? 'OUTFLOW' : 'INFLOW');
  }, [selectedInstallmentIds, installmentOptions]);

  const totalAllocate = isMultiple
    ? effectiveScadenze.reduce((s, sc) => s.plus(allocationAmounts[sc.id]?.replace(',', '.') || '0'), new Decimal(0))
    : new Decimal(allocateAmount.replace(',', '.') || '0');
  const totalAllocateNum = totalAllocate.toNumber();

  const validAllocate =
    effectiveScadenze.length > 0 &&
    totalAllocateNum > 0 &&
    (isMultiple
      ? effectiveScadenze.every((s) => {
          const res = new Decimal(s.amount).minus(s.paidAmount).toNumber();
          const alloc = parseFloat(allocationAmounts[s.id]?.replace(',', '.') || '0');
          return alloc >= 0 && alloc <= res;
        }) && (mode === 'new' ? new Decimal(newAmount || 0).gte(totalAllocate) && !!newFinancialAccountId : true) &&
          (mode === 'existing'
            ? (() => {
                const p = payments.find((x) => x.id === existingPaymentId);
                return p ? totalAllocateNum <= residual(p) : false;
              })()
            : true)
      : (() => {
          const deadlineResidual = new Decimal(effectiveScadenzaSingle!.amount).minus(effectiveScadenzaSingle!.paidAmount).toNumber();
          return (
            totalAllocateNum <= deadlineResidual &&
            (mode === 'new' ? !!newFinancialAccountId && new Decimal(newAmount || 0).gte(totalAllocate) : true) &&
            (mode === 'existing'
              ? (() => {
                  const p = payments.find((x) => x.id === existingPaymentId);
                  return p ? totalAllocateNum <= residual(p) : false;
                })()
              : true)
          );
        })());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveScadenze.length === 0 || !validAllocate) return;
    setLoading(true);
    setError(null);
    try {
      const allocations = isMultiple
        ? effectiveScadenze
            .map((s) => ({ installmentId: s.id, amount: (allocationAmounts[s.id] ?? '0').replace(',', '.') }))
            .filter((a) => parseFloat(a.amount) > 0)
        : [{ installmentId: effectiveScadenzaSingle!.id, amount: allocateAmount.replace(',', '.') }];
      if (allocations.length === 0) {
        setError('Inserisci almeno un importo da allocare.');
        setLoading(false);
        return;
      }
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
          allocations,
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
          allocations,
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

  const toggleInstallmentSelection = (id: string) => {
    setSelectedInstallmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagamento</DialogTitle>
        </DialogHeader>
        {effectiveScadenze.length > 0 ? (
          isMultiple ? (
            <p className="text-sm text-muted-foreground">
              {effectiveScadenze.length} scadenze selezionate · Totale residuo{' '}
              {formatCurrency(totalResidual)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Scadenza doc. {effectiveScadenzaSingle!.document.number} · Residuo{' '}
              {formatCurrency(new Decimal(effectiveScadenzaSingle!.amount).minus(effectiveScadenzaSingle!.paidAmount))}
            </p>
          )
        ) : !scadenza && !scadenze?.length && installmentOptions.length > 0 ? (
          <div className="space-y-2">
            <Label>Scadenze da collegare (seleziona una o più)</Label>
            <div className="max-h-56 overflow-y-auto rounded border p-2 space-y-1">
              {installmentOptions.map((o) => {
                const res = new Decimal(o.amount).minus(o.paidAmount).toNumber();
                if (res <= 0) return null;
                const checked = selectedInstallmentIds.has(o.id);
                return (
                  <label
                    key={o.id}
                    className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleInstallmentSelection(o.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="font-mono text-sm shrink-0 w-28 truncate" title={o.documentNumber}>
                      {o.documentNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.dueDate).toLocaleDateString('it-IT')}
                    </span>
                    <span className="text-xs font-medium ml-auto">
                      Residuo {formatCurrency(new Decimal(res))}
                    </span>
                  </label>
                );
              })}
            </div>
            {effectiveScadenze.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {effectiveScadenze.length} scadenza/e selezionate · Totale residuo{' '}
                {formatCurrency(totalResidual)}
              </p>
            )}
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

          {effectiveScadenze.length > 0 && (
            isMultiple ? (
              <div className="space-y-2">
                <Label>Importi da allocare per scadenza</Label>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded border p-2">
                  {effectiveScadenze.map((s) => {
                    const res = new Decimal(s.amount).minus(s.paidAmount);
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-xs shrink-0 w-24 truncate" title={s.document.number}>
                          {s.document.number}
                        </span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="h-8 text-sm"
                          value={allocationAmounts[s.id] ?? ''}
                          onChange={(e) =>
                            setAllocationAmounts((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                        />
                        <span className="text-xs text-muted-foreground shrink-0">
                          max {formatCurrency(res)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Totale allocato: {formatCurrency(totalAllocate)}
                </p>
              </div>
            ) : (
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
                  Max {formatCurrency(new Decimal(effectiveScadenzaSingle!.amount).minus(effectiveScadenzaSingle!.paidAmount))}
                </p>
              </div>
            )
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

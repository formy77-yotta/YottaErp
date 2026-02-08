'use server';

/**
 * Server Actions per la gestione finanziaria: conti, pagamenti e riconciliazione su scadenze.
 * REGOLA: L'importo totale dei mapping non può superare l'importo del pagamento.
 * Il "pagato" su una scadenza = SUM(PaymentMapping.amount) (calcolato, non campo statico).
 * Tutti i calcoli monetari usano Decimal.js.
 */

import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import {
  reconcilePaymentSchema,
  createFinancialAccountSchema,
  type ReconcilePaymentInput,
  type CreateFinancialAccountRawInput,
} from '@/schemas/finance-schema';
import { Decimal } from 'decimal.js';

export type ReconcilePaymentResult =
  | { success: true; paymentId: string; mappingIds: string[] }
  | { success: false; error: string };

export type CreateFinancialAccountResult =
  | { success: true; id: string }
  | { success: false; error: string };

export type DeleteFinancialAccountResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Crea un nuovo conto finanziario (Banca, Cassa, Virtuale).
 */
export async function createFinancialAccount(
  input: CreateFinancialAccountRawInput
): Promise<CreateFinancialAccountResult> {
  const parseResult = createFinancialAccountSchema.safeParse(input);
  if (!parseResult.success) {
    const first = parseResult.error.flatten().fieldErrors;
    const msg = Object.entries(first)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('; ') || parseResult.error.message;
    return { success: false, error: msg };
  }

  const ctx = await getAuthContext();
  const data = parseResult.data;

  try {
    const account = await prisma.financialAccount.create({
      data: {
        organizationId: ctx.organizationId,
        name: data.name,
        type: data.type,
        iban: data.iban && data.iban.trim() !== '' ? data.iban.trim() : null,
        initialBalance: data.initialBalance,
      },
    });
    return { success: true, id: account.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Errore durante la creazione del conto.' };
  }
}

/**
 * Restituisce i conti finanziari dell'organizzazione (per selector e liste).
 */
export async function getFinancialAccounts(activeOnly = true) {
  const ctx = await getAuthContext();
  const accounts = await prisma.financialAccount.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
  return accounts;
}

/**
 * Saldo attuale di ogni conto: Saldo Iniziale + Entrate (INFLOW) - Uscite (OUTFLOW).
 * Tutti i calcoli con Decimal.js. Restituisce oggetti serializzabili (stringhe per importi)
 * per essere passati a Client Components.
 */
export type AccountBalanceItem = {
  id: string;
  name: string;
  type: string;
  iban: string | null;
  initialBalance: string;
  totalInflow: string;
  totalOutflow: string;
  balance: string;
};

export async function getAccountBalances(): Promise<AccountBalanceItem[]> {
  const ctx = await getAuthContext();

  const accounts = await prisma.financialAccount.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      payments: {
        select: { amount: true, type: true },
      },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  return accounts.map((acc) => {
    const initial = new Decimal(acc.initialBalance.toString());
    let inflow = new Decimal(0);
    let outflow = new Decimal(0);
    for (const p of acc.payments) {
      const amt = new Decimal(p.amount.toString());
      if (p.type === 'INFLOW') inflow = inflow.plus(amt);
      else outflow = outflow.plus(amt);
    }
    const balance = initial.plus(inflow).minus(outflow);
    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      iban: acc.iban,
      initialBalance: initial.toString(),
      totalInflow: inflow.toString(),
      totalOutflow: outflow.toString(),
      balance: balance.toString(),
    };
  });
}

/**
 * Elimina un conto finanziario. Non consentito se ha pagamenti collegati.
 */
export async function deleteFinancialAccount(
  id: string
): Promise<DeleteFinancialAccountResult> {
  const ctx = await getAuthContext();

  const account = await prisma.financialAccount.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { _count: { select: { payments: true } } },
  });

  if (!account) {
    return { success: false, error: 'Conto non trovato o non autorizzato.' };
  }

  if (account._count.payments > 0) {
    return {
      success: false,
      error: 'Non è possibile eliminare un conto con pagamenti collegati. Rimuovi prima i pagamenti.',
    };
  }

  await prisma.financialAccount.delete({
    where: { id },
  });
  return { success: true };
}

/**
 * Riconcilia un pagamento: seleziona un Payment esistente (o ne crea uno nuovo)
 * e distribuisce il suo importo su una o più scadenze (Installment).
 *
 * Validazioni Zod + business:
 * - Somma allocazioni <= importo del pagamento (residuo se payment esistente).
 * - Per ogni scadenza: allocazione <= residuo (amount - SUM(mapping esistenti)).
 */
export async function reconcilePayment(
  input: ReconcilePaymentInput
): Promise<ReconcilePaymentResult> {
  const parseResult = reconcilePaymentSchema.safeParse(input);
  if (!parseResult.success) {
    const first = parseResult.error.flatten().fieldErrors;
    const msg = Object.entries(first)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('; ') || parseResult.error.message;
    return { success: false, error: msg };
  }

  const { paymentId, newPayment, allocations } = parseResult.data;
  const ctx = await getAuthContext();

  // Raggruppa allocazioni per installmentId (somma se stesso installment più volte)
  const byInstallment = new Map<string, Decimal>();
  for (const a of allocations) {
    const current = byInstallment.get(a.installmentId) ?? new Decimal(0);
    byInstallment.set(a.installmentId, current.plus(a.amount));
  }
  const totalAllocation = Array.from(byInstallment.values()).reduce(
    (acc, d) => acc.plus(d),
    new Decimal(0)
  );

  let paymentAmount: Decimal;
  let targetPaymentId: string;
  let existingMappingSum = new Decimal(0);
  /** Per payment esistente: importo già allocato per ogni scadenza (per upsert) */
  const existingByInstallment = new Map<string, Decimal>();

  if (paymentId) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, organizationId: ctx.organizationId },
      include: { mappings: true },
    });
    if (!payment) {
      return { success: false, error: 'Pagamento non trovato o non autorizzato.' };
    }
    paymentAmount = new Decimal(payment.amount.toString());
    targetPaymentId = payment.id;
    for (const m of payment.mappings) {
      existingMappingSum = existingMappingSum.plus(m.amount.toString());
      const prev = existingByInstallment.get(m.installmentId) ?? new Decimal(0);
      existingByInstallment.set(m.installmentId, prev.plus(m.amount.toString()));
    }
  } else if (newPayment) {
    paymentAmount = newPayment.amount;
    if (totalAllocation.greaterThan(paymentAmount)) {
      return {
        success: false,
        error: `Somma allocazioni (${totalAllocation.toFixed(2)}) supera l'importo del pagamento (${paymentAmount.toFixed(2)}).`,
      };
    }
    // Verifica che il conto appartenga alla stessa organizzazione
    const account = await prisma.financialAccount.findFirst({
      where: { id: newPayment.financialAccountId, organizationId: ctx.organizationId },
    });
    if (!account) {
      return { success: false, error: 'Conto finanziario non trovato o non appartiene alla tua organizzazione.' };
    }
    // Id verrà assegnato in transazione
    targetPaymentId = '';
  } else {
    return { success: false, error: 'Fornire paymentId o newPayment.' };
  }

  if (existingMappingSum.plus(totalAllocation).greaterThan(paymentAmount)) {
    return {
      success: false,
      error: `Somma allocazioni (${totalAllocation.toFixed(2)}) + già allocato (${existingMappingSum.toFixed(2)}) supera l'importo del pagamento (${paymentAmount.toFixed(2)}).`,
    };
  }

  const installmentIds = Array.from(byInstallment.keys());
  const installments = await prisma.installment.findMany({
    where: { id: { in: installmentIds } },
    include: {
      document: { select: { organizationId: true } },
      payments: true,
    },
  });

  if (installments.length !== installmentIds.length) {
    return { success: false, error: 'Una o più scadenze non trovate.' };
  }

  for (const inst of installments) {
    if (inst.document.organizationId !== ctx.organizationId) {
      return { success: false, error: 'Una o più scadenze non appartengono alla tua organizzazione.' };
    }
    const paid = inst.payments.reduce(
      (s, m) => s.plus(m.amount.toString()),
      new Decimal(0)
    );
    const residual = new Decimal(inst.amount.toString()).minus(paid);
    const alloc = byInstallment.get(inst.id);
    if (!alloc || alloc.greaterThan(residual)) {
      return {
        success: false,
        error: `Scadenza ${inst.id}: allocazione ${alloc?.toFixed(2) ?? 0} supera il residuo ${residual.toFixed(2)}.`,
      };
    }
  }

  const mappingIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (!paymentId && newPayment) {
      const created = await tx.payment.create({
        data: {
          organizationId: ctx.organizationId,
          financialAccountId: newPayment.financialAccountId,
          amount: newPayment.amount,
          date: newPayment.date,
          description: newPayment.notes?.trim() || 'Riconciliazione scadenze',
          method: 'TRANSFER',
          type: newPayment.direction === 'INFLOW' ? 'INFLOW' : 'OUTFLOW',
          reference: newPayment.reference ?? null,
        },
      });
      targetPaymentId = created.id;
    }

    for (const [installmentId, amountToAdd] of byInstallment) {
      const existingOnInstallment = existingByInstallment.get(installmentId) ?? new Decimal(0);
      const newTotal = existingOnInstallment.plus(amountToAdd);
      const m = await tx.paymentMapping.upsert({
        where: {
          paymentId_installmentId: { paymentId: targetPaymentId, installmentId },
        },
        create: {
          paymentId: targetPaymentId,
          installmentId,
          amount: newTotal,
        },
        update: { amount: newTotal },
      });
      mappingIds.push(m.id);
    }
  });

  return { success: true, paymentId: targetPaymentId, mappingIds };
}

/** Lista pagamenti dell'organizzazione (per dropdown "Alloca pagamento") */
export async function listPayments(options?: { direction?: 'INFLOW' | 'OUTFLOW'; limit?: number }) {
  const ctx = await getAuthContext();
  const list = await prisma.payment.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(options?.direction && { type: options.direction }),
    },
    orderBy: { date: 'desc' },
    take: options?.limit ?? 100,
    select: {
      id: true,
      amount: true,
      date: true,
      type: true,
      reference: true,
      mappings: { select: { amount: true } },
    },
  });
  return list.map((p) => ({
    id: p.id,
    amount: p.amount.toString(),
    date: p.date,
    direction: p.type,
    reference: p.reference ?? null,
    allocated: p.mappings.reduce((s, m) => s + Number(m.amount), 0),
  }));
}

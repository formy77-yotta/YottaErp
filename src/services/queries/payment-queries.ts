/**
 * Query functions per Server Components
 * 
 * MULTITENANT: Ogni query filtra automaticamente per organizationId
 * 
 * IMPORTANTE: Questo file è server-only e non può essere importato
 * in client components. Usa Server Actions per interazioni dal client.
 */

import 'server-only';

import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';

/**
 * Ottiene tutti i tipi di pagamento dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @param activeOnly - Se true, restituisce solo i tipi attivi
 * @returns Array di tipi di pagamento
 */
export async function getPaymentTypes(
  activeOnly: boolean = false
): Promise<Array<{
  id: string;
  name: string;
  sdiCode: string;
  sepaCode: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>> {
  const ctx = await getAuthContext();

  const paymentTypes = await prisma.paymentType.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(activeOnly && { active: true }),
    },
    orderBy: {
      name: 'asc',
    },
  });

  return paymentTypes;
}

/**
 * Ottiene tutte le condizioni di pagamento dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @param activeOnly - Se true, restituisce solo le condizioni attive
 * @returns Array di condizioni di pagamento con tipo di pagamento incluso
 */
export async function getPaymentConditions(
  activeOnly: boolean = false
): Promise<Array<{
  id: string;
  name: string;
  paymentType: {
    id: string;
    name: string;
    sdiCode: string;
  };
  daysToFirstDue: number;
  gapBetweenDues: number;
  numberOfDues: number;
  isEndOfMonth: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>> {
  const ctx = await getAuthContext();

  const conditions = await prisma.paymentCondition.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(activeOnly && { active: true }),
    },
    include: {
      paymentType: {
        select: {
          id: true,
          name: true,
          sdiCode: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return conditions;
}

/**
 * Parametri opzionali per filtrare le scadenze
 */
export interface GetPaymentDeadlinesParams {
  dateFrom?: Date;
  dateTo?: Date;
  status?: 'PENDING' | 'PAID' | 'PARTIAL';
}

/**
 * Ottiene le scadenze di pagamento dell'organizzazione corrente
 *
 * MULTITENANT: Filtra tramite document.organizationId
 *
 * @param params - Filtri opzionali (intervallo date, stato)
 * @returns Array di scadenze con documento e cliente
 */
export async function getPaymentDeadlines(
  params?: GetPaymentDeadlinesParams
): Promise<
  Array<{
    id: string;
    documentId: string;
    dueDate: Date;
    amount: string;
    status: string;
    paidAmount: string;
    document: {
      id: string;
      number: string;
      date: Date;
      customerNameSnapshot: string;
      grossTotal: string;
      category: string;
    };
  }>
> {
  const ctx = await getAuthContext();

  const deadlines = await prisma.paymentDeadline.findMany({
    where: {
      document: {
        organizationId: ctx.organizationId,
      },
      ...(params?.dateFrom &&
        params?.dateTo && {
          dueDate: {
            gte: params.dateFrom,
            lte: params.dateTo,
          },
        }),
      ...(params?.dateFrom && !params?.dateTo && { dueDate: { gte: params.dateFrom } }),
      ...(params?.dateTo && !params?.dateFrom && { dueDate: { lte: params.dateTo } }),
      ...(params?.status && { status: params.status }),
    },
    include: {
      document: {
        select: {
          id: true,
          number: true,
          date: true,
          customerNameSnapshot: true,
          grossTotal: true,
          category: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  });

  return deadlines.map((d) => ({
    id: d.id,
    documentId: d.documentId,
    dueDate: d.dueDate,
    amount: d.amount.toString(),
    status: d.status,
    paidAmount: d.paidAmount.toString(),
    document: {
      id: d.document.id,
      number: d.document.number,
      date: d.document.date,
      customerNameSnapshot: d.document.customerNameSnapshot,
      grossTotal: d.document.grossTotal.toString(),
      category: d.document.category,
    },
  }));
}

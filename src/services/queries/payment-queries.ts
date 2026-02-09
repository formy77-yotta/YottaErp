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
import {
  parseSearchParams,
  parseSortParam,
  type SearchParams,
} from '@/lib/validations/search-params';
import type { Prisma } from '@prisma/client';

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
    operationSignValuation: number;
    document: {
      id: string;
      number: string;
      date: Date;
      customerNameSnapshot: string;
      grossTotal: string;
      category: string;
      documentTypeDescription: string;
    };
  }>
> {
  const ctx = await getAuthContext();

  const deadlines = await prisma.installment.findMany({
    where: {
      organizationId: ctx.organizationId,
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
          documentType: {
            select: { description: true, operationSignValuation: true },
          },
        },
      },
      payments: { select: { amount: true } },
    },
    orderBy: {
      dueDate: 'asc',
    },
  });

  return deadlines.map((d) => {
    const paidFromMappings = d.payments.reduce(
      (sum, m) => sum + Number(m.amount),
      0
    );
    const paidAmountStr = paidFromMappings.toFixed(2);
    const amountNum = Number(d.amount.toString());
    const status =
      paidFromMappings >= amountNum
        ? 'PAID'
        : paidFromMappings > 0
          ? 'PARTIAL'
          : d.status.toString();
    const sign = d.document.documentType?.operationSignValuation ?? 1;
    return {
      id: d.id,
      documentId: d.documentId,
      dueDate: d.dueDate,
      amount: d.amount.toString(),
      status,
      paidAmount: paidAmountStr,
      operationSignValuation: sign,
      document: {
        id: d.document.id,
        number: d.document.number,
        date: d.document.date,
        customerNameSnapshot: d.document.customerNameSnapshot,
        grossTotal: d.document.grossTotal.toString(),
        category: d.document.category,
        documentTypeDescription: d.document.documentType?.description ?? d.document.category,
        documentDirection: d.document.documentType?.documentDirection ?? 'SALE',
      },
    };
  });
}

/** Tipo riga scadenza per DataTable */
export type PaymentDeadlineRow = {
  id: string;
  documentId: string;
  dueDate: Date;
  amount: string;
  status: string;
  paidAmount: string;
  /** Segno per valorizzazione: -1 = uscita (es. acquisti), +1 = entrata (es. vendite) */
  operationSignValuation: number;
  document: {
    id: string;
    number: string;
    date: Date;
    customerNameSnapshot: string;
    grossTotal: string;
    category: string;
    /** Descrizione tipo documento (es. "Fattura acquisto", "Fattura") */
    documentTypeDescription: string;
    /** PURCHASE = uscita per saldare, SALE = entrata per incassare */
    documentDirection: string;
  };
};

const DEADLINE_SORT_FIELDS = ['dueDate', 'amount', 'status', 'documentNumber', 'documentCustomerName'] as const;

/**
 * Ottiene le scadenze con ricerca, ordinamento e paginazione (per DataTable).
 * MULTITENANT: Filtra tramite document.organizationId
 */
export async function getPaymentDeadlinesPage(
  params?: GetPaymentDeadlinesParams,
  searchParamsRaw?: Record<string, string | string[] | undefined>
): Promise<{ data: PaymentDeadlineRow[]; count: number }> {
  const ctx = await getAuthContext();

  const searchParams: SearchParams = searchParamsRaw
    ? parseSearchParams(searchParamsRaw)
    : { page: 1, perPage: 10, sort: undefined, q: undefined };

  const { page, perPage, sort: sortParam, q } = searchParams;
  const skip = (page - 1) * perPage;

  const where: Prisma.InstallmentWhereInput = {
    organizationId: ctx.organizationId,
    ...(q && q.length > 0 && {
      document: {
        OR: [
          { number: { contains: q, mode: 'insensitive' } },
          { customerNameSnapshot: { contains: q, mode: 'insensitive' } },
        ],
      },
    }),
    ...(params?.dateFrom && params?.dateTo && { dueDate: { gte: params.dateFrom, lte: params.dateTo } }),
    ...(params?.dateFrom && !params?.dateTo && { dueDate: { gte: params.dateFrom } }),
    ...(params?.dateTo && !params?.dateFrom && { dueDate: { lte: params.dateTo } }),
    ...(params?.status && { status: params.status }),
  };

  const parsedSort = parseSortParam(sortParam);
  let orderBy: Prisma.InstallmentOrderByWithRelationInput[] = [{ dueDate: 'asc' }];
  if (parsedSort && DEADLINE_SORT_FIELDS.includes(parsedSort.field as (typeof DEADLINE_SORT_FIELDS)[number])) {
    if (parsedSort.field === 'documentNumber') {
      orderBy = [{ document: { number: parsedSort.order } }];
    } else if (parsedSort.field === 'documentCustomerName') {
      orderBy = [{ document: { customerNameSnapshot: parsedSort.order } }];
    } else {
      orderBy = [{ [parsedSort.field]: parsedSort.order }];
    }
  }

  const [deadlines, count] = await Promise.all([
    prisma.installment.findMany({
      where,
      orderBy,
      skip,
      take: perPage,
      include: {
        document: {
          select: {
            id: true,
            number: true,
            date: true,
            customerNameSnapshot: true,
            grossTotal: true,
            category: true,
            documentType: {
              select: { description: true, operationSignValuation: true, documentDirection: true },
            },
          },
        },
        payments: { select: { amount: true } },
      },
    }),
    prisma.installment.count({ where }),
  ]);

  const data: PaymentDeadlineRow[] = deadlines.map((d) => {
    const paidFromMappings = d.payments.reduce(
      (sum, m) => sum + Number(m.amount),
      0
    );
    const paidAmountStr = paidFromMappings.toFixed(2);
    const amountNum = Number(d.amount.toString());
    const status =
      paidFromMappings >= amountNum
        ? 'PAID'
        : paidFromMappings > 0
          ? 'PARTIAL'
          : d.status.toString();
    const sign = d.document.documentType?.operationSignValuation ?? 1;
    return {
      id: d.id,
      documentId: d.documentId,
      dueDate: d.dueDate,
      amount: d.amount.toString(),
      status,
      paidAmount: paidAmountStr,
      operationSignValuation: sign,
      document: {
        id: d.document.id,
        number: d.document.number,
        date: d.document.date,
        customerNameSnapshot: d.document.customerNameSnapshot,
        grossTotal: d.document.grossTotal.toString(),
        category: d.document.category,
        documentTypeDescription: d.document.documentType?.description ?? d.document.category,
        documentDirection: d.document.documentType?.documentDirection ?? 'SALE',
      },
    };
  });

  return { data, count };
}

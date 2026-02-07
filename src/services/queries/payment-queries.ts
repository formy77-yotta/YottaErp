/**
 * Query functions per Server Components
 * 
 * Queste funzioni NON sono Server Actions ('use server')
 * ma funzioni normali che possono essere chiamate direttamente
 * nei Server Components async.
 * 
 * MULTITENANT: Ogni query filtra automaticamente per organizationId
 */

import { prisma } from '@/lib/prisma';
import { getAuthContext, ForbiddenError } from '@/lib/auth';

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

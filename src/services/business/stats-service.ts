import { Decimal } from 'decimal.js';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { toDecimal } from '@/lib/decimal-utils';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

/** Snapshot documento per revert statistiche (stato prima della modifica) */
export type DocumentSnapshotForStats = {
  organizationId: string;
  date: Date;
  documentType: {
    valuationImpact: boolean;
    operationSignValuation: number | null;
    documentDirection: string;
  };
  lines: Array<{
    productId: string | null;
    quantity: unknown;
    netAmount: unknown;
  }>;
};

/**
 * CHECK CRITICO: il tipo documento deve prevedere valorizzazione.
 * Ritorna true se non bisogna aggiornare le stats.
 */
function skipValuation(
  valuationImpact: boolean,
  operationSignValuation: number | null
): boolean {
  return (
    valuationImpact === false ||
    operationSignValuation == null ||
    operationSignValuation === 0
  );
}

/**
 * Applica l'impatto di un documento alle statistiche annuali (add).
 * Usato in creazione documento e dopo aggiornamento righe.
 * Usa Decimal.js per tutti i calcoli. CMP = (ValoreTotaleAttuale + deltaAmount) / (QuantitàTotaleAttuale + deltaQty).
 */
export async function applyDocumentStats(
  tx: Tx,
  documentId: string
): Promise<void> {
  const document = await tx.document.findUnique({
    where: { id: documentId },
    select: {
      organizationId: true,
      date: true,
      documentType: {
        select: {
          valuationImpact: true,
          operationSignValuation: true,
          documentDirection: true,
        },
      },
      lines: {
        select: { productId: true, quantity: true, netAmount: true },
      },
    },
  });

  if (!document) {
    throw new Error(`Documento con ID ${documentId} non trovato`);
  }

  const { documentType } = document;
  if (skipValuation(documentType.valuationImpact, documentType.operationSignValuation)) {
    return;
  }

  const sign = documentType.operationSignValuation!;
  const direction = documentType.documentDirection.toUpperCase();
  const year = document.date.getFullYear();

  for (const line of document.lines) {
    if (!line.productId) continue;

    const lineQuantity = toDecimal(line.quantity as string | number | Decimal);
    const lineNetAmount = toDecimal(line.netAmount as string | number | Decimal);
    const deltaQty = lineQuantity.mul(sign);
    const deltaAmount = lineNetAmount.mul(sign);

    const statKey = {
      organizationId_productId_year: {
        organizationId: document.organizationId,
        productId: line.productId,
        year,
      },
    };

    let stat = await tx.productAnnualStat.findUnique({ where: statKey });
    if (!stat) {
      stat = await tx.productAnnualStat.create({
        data: {
          organizationId: document.organizationId,
          productId: line.productId,
          year,
          purchasedQuantity: new Decimal(0),
          purchasedTotalAmount: new Decimal(0),
          soldQuantity: new Decimal(0),
          soldTotalAmount: new Decimal(0),
          weightedAverageCost: new Decimal(0),
          lastCost: new Decimal(0),
        },
      });
    }

    const purchasedQuantity = toDecimal(stat.purchasedQuantity);
    const purchasedTotalAmount = toDecimal(stat.purchasedTotalAmount);
    const soldQuantity = toDecimal(stat.soldQuantity);
    const soldTotalAmount = toDecimal(stat.soldTotalAmount);
    const lastCost = toDecimal(stat.lastCost);

    if (direction === 'SALE') {
      const nextSoldQuantity = soldQuantity.plus(deltaQty).toDecimalPlaces(4);
      const nextSoldTotalAmount = soldTotalAmount.plus(deltaAmount).toDecimalPlaces(2);
      await tx.productAnnualStat.update({
        where: { id: stat.id },
        data: { soldQuantity: nextSoldQuantity, soldTotalAmount: nextSoldTotalAmount },
      });
    } else if (direction === 'PURCHASE') {
      const nextPurchasedQuantity = purchasedQuantity.plus(deltaQty).toDecimalPlaces(4);
      const nextPurchasedTotalAmount = purchasedTotalAmount
        .plus(deltaAmount)
        .toDecimalPlaces(2);

      let nextLastCost = lastCost;
      if (deltaQty.greaterThan(0) && lineQuantity.greaterThan(0)) {
        nextLastCost = lineNetAmount.div(lineQuantity).toDecimalPlaces(4);
      }

      // CMP: (ValoreTotaleAttuale + deltaAmount) / (QuantitàTotaleAttuale + deltaQty)
      const totalQty = purchasedQuantity.plus(deltaQty);
      const totalAmount = purchasedTotalAmount.plus(deltaAmount);
      const nextWeightedAverageCost = totalQty.greaterThan(0)
        ? totalAmount.div(totalQty).toDecimalPlaces(4)
        : new Decimal(0);

      await tx.productAnnualStat.update({
        where: { id: stat.id },
        data: {
          purchasedQuantity: nextPurchasedQuantity,
          purchasedTotalAmount: nextPurchasedTotalAmount,
          weightedAverageCost: nextWeightedAverageCost,
          lastCost: nextLastCost,
        },
      });
    }
  }
}

/**
 * Sottrae l'impatto di un documento dalle statistiche (revert).
 * Usato prima di aggiornare le righe di un documento che ha valorizzazione.
 */
export async function revertDocumentStats(
  tx: Tx,
  snapshot: DocumentSnapshotForStats
): Promise<void> {
  const { documentType } = snapshot;
  if (skipValuation(snapshot.documentType.valuationImpact, documentType.operationSignValuation)) {
    return;
  }

  const sign = documentType.operationSignValuation!;
  const direction = documentType.documentDirection.toUpperCase();
  const year = snapshot.date.getFullYear();

  for (const line of snapshot.lines) {
    if (!line.productId) continue;

    const lineQuantity = toDecimal(line.quantity as string | number | Decimal);
    const lineNetAmount = toDecimal(line.netAmount as string | number | Decimal);
    const deltaQty = lineQuantity.mul(sign);
    const deltaAmount = lineNetAmount.mul(sign);
    const negDeltaQty = deltaQty.neg();
    const negDeltaAmount = deltaAmount.neg();

    const statKey = {
      organizationId_productId_year: {
        organizationId: snapshot.organizationId,
        productId: line.productId,
        year,
      },
    };

    const stat = await tx.productAnnualStat.findUnique({ where: statKey });
    if (!stat) continue;

    const purchasedQuantity = toDecimal(stat.purchasedQuantity);
    const purchasedTotalAmount = toDecimal(stat.purchasedTotalAmount);
    const soldQuantity = toDecimal(stat.soldQuantity);
    const soldTotalAmount = toDecimal(stat.soldTotalAmount);

    if (direction === 'SALE') {
      const nextSoldQuantity = soldQuantity.plus(negDeltaQty).toDecimalPlaces(4);
      const nextSoldTotalAmount = soldTotalAmount.plus(negDeltaAmount).toDecimalPlaces(2);
      await tx.productAnnualStat.update({
        where: { id: stat.id },
        data: { soldQuantity: nextSoldQuantity, soldTotalAmount: nextSoldTotalAmount },
      });
    } else if (direction === 'PURCHASE') {
      const nextPurchasedQuantity = purchasedQuantity.plus(negDeltaQty).toDecimalPlaces(4);
      const nextPurchasedTotalAmount = purchasedTotalAmount
        .plus(negDeltaAmount)
        .toDecimalPlaces(2);
      const totalQty = nextPurchasedQuantity;
      const totalAmount = nextPurchasedTotalAmount;
      const nextWeightedAverageCost =
        totalQty.greaterThan(0) && totalAmount.greaterThanOrEqualTo(0)
          ? totalAmount.div(totalQty).toDecimalPlaces(4)
          : new Decimal(0);
      await tx.productAnnualStat.update({
        where: { id: stat.id },
        data: {
          purchasedQuantity: nextPurchasedQuantity,
          purchasedTotalAmount: nextPurchasedTotalAmount,
          weightedAverageCost: nextWeightedAverageCost,
        },
      });
    }
  }
}

/**
 * Aggiorna le statistiche annuali a partire da un documento (standalone).
 * Carica il documento, controlla valuationImpact e operationSignValuation (0/null = skip),
 * applica le variazioni. Usa Decimal.js e può essere eseguito in transazione esterna
 * passando applyDocumentStats(tx, documentId).
 */
export async function updateStatsFromDocument(documentId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await applyDocumentStats(tx as Tx, documentId);
  });
}

/**
 * Ricalcola da zero tutte le statistiche di valorizzazione per un anno.
 * Elimina i record ProductAnnualStat dell'organizzazione per quell'anno e riapplica
 * l'impatto di ogni documento con valorizzazione (ordinato per data) per correggere disallineamenti.
 *
 * @param organizationId - ID organizzazione
 * @param year - Anno (es. 2025)
 * @returns Numero di documenti processati
 */
export async function recalculateStatsForYear(
  organizationId: string,
  year: number
): Promise<number> {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  let documentsProcessed = 0;

  await prisma.$transaction(async (tx) => {
    const client = tx as Tx;

    await client.productAnnualStat.deleteMany({
      where: { organizationId, year },
    });

    const documents = await client.document.findMany({
      where: {
        organizationId,
        date: { gte: start, lte: end },
        documentType: {
          valuationImpact: true,
          operationSignValuation: { not: null },
        },
      },
      orderBy: { date: 'asc' },
      select: { id: true, documentType: { select: { operationSignValuation: true } } },
    });

    const toProcess = documents.filter(
      (d) =>
        d.documentType.operationSignValuation != null &&
        d.documentType.operationSignValuation !== 0
    );

    for (const doc of toProcess) {
      await applyDocumentStats(client, doc.id);
      documentsProcessed += 1;
    }
  });

  return documentsProcessed;
}

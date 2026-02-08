'use server';

import { revalidatePath } from 'next/cache';
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { getAuthContext, ForbiddenError, verifyOrganizationAccess } from '@/lib/auth';
import { createDocumentSchema, updateDocumentSchema, type CreateDocumentInput, type UpdateDocumentInput } from '@/schemas/document-schema';
import { calculateLineTotal, toDecimal } from '@/lib/decimal-utils';
import { processDocumentLineStock } from '@/services/business/stock-service';
import { generateInvoiceXML, InvoiceXMLError } from '@/services/business/invoice-xml-service';
import { calculateDeadlines } from '@/lib/utils/payment-calculator';
import type { Prisma } from '@prisma/client';
import {
  parseSearchParams,
  parseSortParam,
  type SearchParams,
} from '@/lib/validations/search-params';

/**
 * Tipo risultato standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Tipo output documento con relazioni (lista)
 */
export type DocumentRow = {
  id: string;
  number: string;
  date: Date;
  category: string;
  documentType: {
    id: string;
    code: string;
    description: string;
  };
  entity: {
    id: string;
    businessName: string;
    vatNumber: string | null;
  } | null;
  netTotal: string;
  vatTotal: string;
  grossTotal: string;
  createdAt: Date;
};

/** Campi ordinabili per Document (whitelist). documentTypeDescription ordina per documentType.description */
const DOCUMENT_SORT_FIELDS = [
  'number',
  'date',
  'category',
  'documentTypeDescription',
  'customerNameSnapshot',
  'netTotal',
  'vatTotal',
  'grossTotal',
  'createdAt',
] as const;

/**
 * Ottiene i documenti dell'organizzazione con ricerca, ordinamento e paginazione server-side.
 *
 * MULTITENANT: Filtra automaticamente per organizationId.
 *
 * @param filters - Filtri opzionali (tipo documento, entità, date)
 * @param searchParamsRaw - Parametri URL (page, perPage, sort, q) da validare
 * @returns { data, count } per la DataTable
 */
export async function getDocumentsAction(
  filters?: {
    documentTypeId?: string;
    entityId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  },
  searchParamsRaw?: Record<string, string | string[] | undefined>
): Promise<ActionResult<{ data: DocumentRow[]; count: number }>> {
  try {
    const ctx = await getAuthContext();

    const searchParams: SearchParams = searchParamsRaw
      ? parseSearchParams(searchParamsRaw)
      : { page: 1, perPage: 10, sort: undefined, q: undefined };

    const { page, perPage, sort: sortParam, q } = searchParams;
    const skip = (page - 1) * perPage;

    const baseWhere: Prisma.DocumentWhereInput = {
      organizationId: ctx.organizationId,
      ...(filters?.documentTypeId && { documentTypeId: filters.documentTypeId }),
      ...(filters?.entityId && { entityId: filters.entityId }),
      ...(filters?.dateFrom || filters?.dateTo
        ? {
            date: {
              ...(filters.dateFrom && { gte: filters.dateFrom }),
              ...(filters.dateTo && { lte: filters.dateTo }),
            },
          }
        : {}),
    };

    // Ricerca testuale: number, customerNameSnapshot, customerVatSnapshot (case insensitive)
    const searchFilter =
      q && q.length > 0
        ? {
            OR: [
              { number: { contains: q, mode: 'insensitive' as const } },
              { customerNameSnapshot: { contains: q, mode: 'insensitive' as const } },
              { customerVatSnapshot: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {};

    const where = { ...baseWhere, ...searchFilter };

    // Ordinamento dinamico (documentTypeDescription -> documentType.description). Prisma richiede un array.
    const parsedSort = parseSortParam(sortParam);
    let orderBy: Prisma.DocumentOrderByWithRelationInput[] = [
      { date: 'desc' },
      { number: 'desc' },
    ];
    if (parsedSort && DOCUMENT_SORT_FIELDS.includes(parsedSort.field as (typeof DOCUMENT_SORT_FIELDS)[number])) {
      if (parsedSort.field === 'documentTypeDescription') {
        orderBy = [{ documentType: { description: parsedSort.order } }];
      } else {
        orderBy = [{ [parsedSort.field]: parsedSort.order }];
      }
    }

    const [documents, count] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
        include: {
          documentType: {
            select: {
              id: true,
              code: true,
              description: true,
            },
          },
          entity: {
            select: {
              id: true,
              businessName: true,
              vatNumber: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    const documentsOutput: DocumentRow[] = documents.map((doc) => ({
      id: doc.id,
      number: doc.number,
      date: doc.date,
      category: doc.category,
      documentType: doc.documentType,
      entity: doc.entity,
      netTotal: doc.netTotal.toString(),
      vatTotal: doc.vatTotal.toString(),
      grossTotal: doc.grossTotal.toString(),
      createdAt: doc.createdAt,
    }));

    return {
      success: true,
      data: { data: documentsOutput, count },
    };
  } catch (error) {
    console.error('Errore recupero documenti:', error);
    if (error instanceof ForbiddenError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: 'Errore durante il recupero dei documenti',
    };
  }
}

/**
 * Ottiene un documento singolo per ID con tutte le righe
 * 
 * MULTITENANT: Verifica che il documento appartenga all'organizzazione corrente
 * 
 * @param id - ID del documento
 * @returns Documento con righe o errore
 */
export async function getDocumentAction(
  id: string
): Promise<ActionResult<{
  id: string;
  number: string;
  date: Date;
  category: string;
  documentType: {
    id: string;
    code: string;
    description: string;
  };
  entityId: string | null;
  entity: {
    id: string;
    businessName: string;
    vatNumber: string | null;
  } | null;
  customerNameSnapshot: string;
  customerVatSnapshot: string | null;
  customerFiscalCodeSnapshot: string | null;
  customerAddressSnapshot: string;
  customerSdiSnapshot: string | null;
  customerCity: string;
  customerProvince: string;
  customerZip: string;
  customerCountry: string;
  netTotal: string;
  vatTotal: string;
  grossTotal: string;
  notes: string | null;
  paymentTerms: string | null;
  paymentConditionId: string | null;
  paymentCondition: {
    id: string;
    name: string;
    paymentType: {
      id: string;
      name: string;
      sdiCode: string;
    };
  } | null;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    productId: string | null;
    productCode: string;
    description: string;
    unitPrice: string;
    quantity: string;
    vatRate: string;
    netAmount: string;
    vatAmount: string;
    grossAmount: string;
  }>;
}>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();

    // 2. Recupera documento con righe e relazioni
    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        date: true,
        category: true,
        documentType: {
          select: {
            id: true,
            code: true,
            description: true,
          },
        },
        entityId: true,
        entity: {
          select: {
            id: true,
            businessName: true,
            vatNumber: true,
          },
        },
        customerNameSnapshot: true,
        customerVatSnapshot: true,
        customerFiscalCodeSnapshot: true,
        customerAddressSnapshot: true,
        customerSdiSnapshot: true,
        customerCity: true,
        customerProvince: true,
        customerZip: true,
        customerCountry: true,
        shippingNominative: true,
        shippingReceiverName: true,
        shippingStreet: true,
        shippingCity: true,
        shippingZipCode: true,
        shippingProvince: true,
        shippingCountry: true,
        shippingAddressId: true,
        netTotal: true,
        vatTotal: true,
        grossTotal: true,
        notes: true,
        paymentTerms: true,
        paymentConditionId: true,
        paymentCondition: {
          select: {
            id: true,
            name: true,
            paymentType: {
              select: {
                id: true,
                name: true,
                sdiCode: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
        organizationId: true, // Per verifica multitenant
        lines: {
          orderBy: {
            createdAt: 'asc', // Ordina righe per ordine di creazione
          },
          select: {
            id: true,
            productId: true,
            productCode: true,
            description: true,
            unitPrice: true,
            quantity: true,
            vatRate: true,
            netAmount: true,
            vatAmount: true,
            grossAmount: true,
          },
        },
      },
    });

    if (!document) {
      return {
        success: false,
        error: 'Documento non trovato',
      };
    }

    // 3. ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, document);

    // 4. Converti Decimal a stringa per serializzazione
    return {
      success: true,
      data: {
        id: document.id,
        number: document.number,
        date: document.date,
        category: document.category,
        documentType: document.documentType,
        entityId: document.entityId,
        entity: document.entity,
        customerNameSnapshot: document.customerNameSnapshot,
        customerVatSnapshot: document.customerVatSnapshot,
        customerFiscalCodeSnapshot: document.customerFiscalCodeSnapshot,
        customerAddressSnapshot: document.customerAddressSnapshot,
        customerSdiSnapshot: document.customerSdiSnapshot,
        customerCity: document.customerCity,
        customerProvince: document.customerProvince,
        customerZip: document.customerZip,
        customerCountry: document.customerCountry,
        shippingNominative: document.shippingNominative,
        shippingReceiverName: document.shippingReceiverName,
        shippingStreet: document.shippingStreet,
        shippingCity: document.shippingCity,
        shippingZipCode: document.shippingZipCode,
        shippingProvince: document.shippingProvince,
        shippingCountry: document.shippingCountry,
        shippingAddressId: document.shippingAddressId,
        netTotal: document.netTotal.toString(),
        vatTotal: document.vatTotal.toString(),
        grossTotal: document.grossTotal.toString(),
        notes: document.notes,
        paymentTerms: document.paymentTerms,
        paymentConditionId: document.paymentConditionId,
        paymentCondition: document.paymentCondition,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        lines: document.lines.map((line) => ({
          id: line.id,
          productId: line.productId,
          productCode: line.productCode,
          description: line.description,
          unitPrice: line.unitPrice.toString(),
          quantity: line.quantity.toString(),
          vatRate: line.vatRate.toString(),
          netAmount: line.netAmount.toString(),
          vatAmount: line.vatAmount.toString(),
          grossAmount: line.grossAmount.toString(),
        })),
      },
    };
  } catch (error) {
    console.error('Errore recupero documento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero del documento',
    };
  }
}

/**
 * Aggiorna un documento esistente
 * 
 * MULTITENANT: Verifica che il documento appartenga all'organizzazione corrente
 * 
 * FUNZIONALITÀ:
 * - Aggiorna campi modificabili (data, notes, paymentTerms, mainWarehouseId)
 * - Aggiorna righe documento (sostituisce tutte le righe)
 * - Ricalcola totali documento
 * - Gestisce movimenti magazzino (elimina vecchi e crea nuovi se necessario)
 * 
 * NOTA: Il numero documento e il tipo documento NON sono modificabili per garantire l'integrità.
 * 
 * @param input - Dati documento da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateDocumentAction(
  input: UpdateDocumentInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();

    // 2. Validazione con Zod
    const validatedData = updateDocumentSchema.parse(input);

    // 3. Esegui aggiornamento in transazione
    const updatedDocument = await prisma.$transaction(async (tx) => {
      // 3.1. Recupera documento esistente con relazioni
      const existingDocument = await tx.document.findUnique({
        where: { id: validatedData.id },
        include: {
          documentType: true, // Include tutti i campi di DocumentTypeConfig (inventoryMovement, etc.)
          lines: true,
        },
      });

      if (!existingDocument) {
        throw new Error('Documento non trovato');
      }

      // 3.2. ✅ Verifica che appartenga all'organizzazione corrente
      verifyOrganizationAccess(ctx, existingDocument);

      // 3.2.1. Gestione aggiornamento entità (se modificata)
      let entitySnapshot: {
        customerNameSnapshot: string;
        customerVatSnapshot: string | null;
        customerFiscalCodeSnapshot: string | null;
        customerAddressSnapshot: string;
        customerSdiSnapshot: string | null;
        customerCity: string;
        customerProvince: string;
        customerZip: string;
        customerCountry: string;
      } | null = null;

      if (validatedData.entityId !== undefined) {
        if (validatedData.entityId) {
          // Recupera nuova entità e verifica appartenenza
          const entity = await tx.entity.findUnique({
            where: { id: validatedData.entityId },
            select: {
              id: true,
              organizationId: true,
              businessName: true,
              vatNumber: true,
              fiscalCode: true,
              address: true,
              city: true,
              province: true,
              zipCode: true,
              country: true,
              sdiCode: true,
            },
          });

          if (!entity) {
            throw new Error('Entità non trovata');
          }

          // ✅ Verifica che l'entità appartenga all'organizzazione corrente
          verifyOrganizationAccess(ctx, entity);

          // Indirizzo: da entità o da sede se entityAddressId fornito
          let addressSnapshot = {
            customerAddressSnapshot: entity.address || '',
            customerCity: entity.city || '',
            customerProvince: entity.province || '',
            customerZip: entity.zipCode || '',
            customerCountry: entity.country || 'IT',
          };
          if (validatedData.entityAddressId) {
            const addr = await tx.entityAddress.findFirst({
              where: { id: validatedData.entityAddressId, entityId: validatedData.entityId },
            });
            if (addr) {
              const addrLine = [addr.street, addr.receiverName].filter(Boolean).join(' - ');
              addressSnapshot = {
                customerAddressSnapshot: addrLine || addr.street,
                customerCity: addr.city,
                customerProvince: addr.province,
                customerZip: addr.zipCode,
                customerCountry: addr.country || 'IT',
              };
            }
          }
          entitySnapshot = {
            customerNameSnapshot: entity.businessName,
            customerVatSnapshot: entity.vatNumber,
            customerFiscalCodeSnapshot: entity.fiscalCode,
            customerSdiSnapshot: entity.sdiCode,
            ...addressSnapshot,
          };
        } else {
          // Entità rimossa (documento interno)
          entitySnapshot = {
            customerNameSnapshot: '',
            customerVatSnapshot: null,
            customerFiscalCodeSnapshot: null,
            customerAddressSnapshot: '',
            customerSdiSnapshot: null,
            customerCity: '',
            customerProvince: '',
            customerZip: '',
            customerCountry: 'IT',
          };
        }
      }

      // 3.2.2. Snapshot destinazione di consegna (update)
      type UpdateShippingSnapshot = {
        shippingNominative: string | null;
        shippingReceiverName: string | null;
        shippingStreet: string | null;
        shippingCity: string | null;
        shippingZipCode: string | null;
        shippingProvince: string | null;
        shippingCountry: string | null;
        shippingAddressId: string | null;
      };
      let updateShippingSnapshot: UpdateShippingSnapshot | null = null;
      const hasManualShippingUpdate =
        (validatedData.shippingStreet?.trim() ?? '') !== '' ||
        (validatedData.shippingCity?.trim() ?? '') !== '' ||
        (validatedData.shippingReceiverName?.trim() ?? '') !== '' ||
        (validatedData.shippingNominative?.trim() ?? '') !== '';
      if (
        validatedData.shippingAddressId &&
        String(validatedData.shippingAddressId).trim() !== '' &&
        validatedData.entityId
      ) {
        const addr = await tx.entityAddress.findFirst({
          where: {
            id: validatedData.shippingAddressId,
            entityId: validatedData.entityId,
          },
        });
        if (addr) {
          const entityForVerify = await tx.entity.findUnique({
            where: { id: addr.entityId },
            select: { organizationId: true },
          });
          if (entityForVerify) {
            verifyOrganizationAccess(ctx, entityForVerify);
            updateShippingSnapshot = {
              shippingNominative: addr.nominative,
              shippingReceiverName: addr.receiverName,
              shippingStreet: addr.street,
              shippingCity: addr.city,
              shippingZipCode: addr.zipCode,
              shippingProvince: addr.province,
              shippingCountry: addr.country || 'IT',
              shippingAddressId: addr.id,
            };
          }
        }
      } else if (hasManualShippingUpdate) {
        updateShippingSnapshot = {
          shippingNominative: (validatedData.shippingNominative?.trim() ?? '') || null,
          shippingReceiverName: (validatedData.shippingReceiverName?.trim() ?? '') || null,
          shippingStreet: (validatedData.shippingStreet?.trim() ?? '') || null,
          shippingCity: (validatedData.shippingCity?.trim() ?? '') || null,
          shippingZipCode: (validatedData.shippingZipCode?.trim() ?? '') || null,
          shippingProvince: (validatedData.shippingProvince?.trim() ?? '') || null,
          shippingCountry: (validatedData.shippingCountry?.trim() ?? '') || 'IT',
          shippingAddressId: null,
        };
      }

      // 3.3. Se ci sono righe da aggiornare, gestisci l'aggiornamento
      if (validatedData.lines && validatedData.lines.length > 0) {
        // 3.3.1. Elimina vecchi movimenti di magazzino associati alle righe
        // (se il documento ha inventoryMovement attivo)
        if (existingDocument.documentType.inventoryMovement) {
          // Elimina movimenti di magazzino associati al documento
          await tx.stockMovement.deleteMany({
            where: {
              documentId: existingDocument.id,
            },
          });
        }

        // 3.3.2. Elimina vecchie righe
        await tx.documentLine.deleteMany({
          where: { documentId: validatedData.id },
        });

        // 3.3.3. Ricalcola totali dalle nuove righe
        let netTotal = new Decimal(0);
        let vatTotal = new Decimal(0);
        let grossTotal = new Decimal(0);

        // 3.3.4. Crea nuove righe e calcola totali
        for (const line of validatedData.lines) {
          // Recupera prodotto per verificare manageStock e defaultWarehouseId
          let product: { id: string; type: { manageStock: boolean } | null; defaultWarehouseId: string | null } | null = null;

          if (line.productId) {
            product = await tx.product.findUnique({
              where: { id: line.productId },
              include: { type: true },
            });
          }

          // Calcola totali riga
          const quantity = toDecimal(line.quantity);
          const unitPrice = toDecimal(line.unitPrice);
          const vatRate = toDecimal(line.vatRate);
          const lineTotals = calculateLineTotal(quantity, unitPrice, vatRate);

          netTotal = netTotal.plus(lineTotals.netAmount);
          vatTotal = vatTotal.plus(lineTotals.vatAmount);
          grossTotal = grossTotal.plus(lineTotals.grossAmount);

          // Determina warehouseId con logica a cascata
          let warehouseId: string | null = null;
          if (line.warehouseId) {
            warehouseId = line.warehouseId;
          } else if (product?.defaultWarehouseId) {
            warehouseId = product.defaultWarehouseId;
          } else if (validatedData.mainWarehouseId) {
            warehouseId = validatedData.mainWarehouseId;
          }
          // NOTA: mainWarehouseId non è salvato nel documento, viene solo usato al momento della creazione/aggiornamento

          // Crea riga documento
          // NOTA: warehouseId non è salvato nella riga documento (non esiste nello schema)
          // Viene solo usato al momento della creazione/aggiornamento per determinare il magazzino dei movimenti
          const createdLine = await tx.documentLine.create({
            data: {
              documentId: validatedData.id,
              productId: line.productId || null,
              productCode: line.productCode,
              description: line.description,
              unitPrice: toDecimal(line.unitPrice),
              quantity: toDecimal(line.quantity),
              vatRate: toDecimal(line.vatRate),
              netAmount: lineTotals.netAmount,
              vatAmount: lineTotals.vatAmount,
              grossAmount: lineTotals.grossAmount,
            },
          });

          // Gestione movimenti magazzino (se necessario)
          if (
            existingDocument.documentType.inventoryMovement &&
            product?.type?.manageStock &&
            warehouseId &&
            line.productId
          ) {
            // Crea riga documento con warehouseId per passare al servizio stock
            const documentLineWithWarehouse = {
              ...createdLine,
              warehouseId, // Priorità 1: warehouseId della riga
            };

            await processDocumentLineStock(
              tx,
              documentLineWithWarehouse,
              existingDocument.documentType,
              validatedData.mainWarehouseId || null,
              existingDocument.id,
              existingDocument.number,
              ctx.organizationId
            );
          }
        }

        // 3.3.5. Gestione scadenze pagamento (se paymentConditionId modificato)
        if (validatedData.paymentConditionId !== undefined) {
          // Elimina scadenze esistenti (se presenti)
          await tx.paymentDeadline.deleteMany({
            where: { documentId: validatedData.id },
          });

          // Se è stata selezionata una nuova condizione, genera nuove scadenze
          if (validatedData.paymentConditionId) {
            // Recupera condizione di pagamento e verifica appartenenza
            const paymentCondition = await tx.paymentCondition.findUnique({
              where: { id: validatedData.paymentConditionId },
              select: {
                id: true,
                organizationId: true,
                daysToFirstDue: true,
                gapBetweenDues: true,
                numberOfDues: true,
                isEndOfMonth: true,
              },
            });

            if (!paymentCondition) {
              throw new Error('Condizione di pagamento non trovata');
            }

            // ✅ Verifica che appartenga all'organizzazione corrente
            verifyOrganizationAccess(ctx, paymentCondition);

            // Usa la data del documento (o quella modificata se presente)
            const documentDate = validatedData.date 
              ? (validatedData.date instanceof Date ? validatedData.date : new Date(validatedData.date))
              : existingDocument.date;

            // Calcola scadenze usando il calcolatore
            const deadlines = calculateDeadlines(
              grossTotal,
              {
                daysToFirstDue: paymentCondition.daysToFirstDue,
                gapBetweenDues: paymentCondition.gapBetweenDues,
                numberOfDues: paymentCondition.numberOfDues,
                isEndOfMonth: paymentCondition.isEndOfMonth,
              },
              documentDate
            );

            // Crea PaymentDeadline per ogni scadenza calcolata
            for (const deadline of deadlines) {
              await tx.paymentDeadline.create({
                data: {
                  documentId: validatedData.id,
                  dueDate: deadline.dueDate,
                  amount: deadline.amount,
                  status: 'PENDING',
                  paidAmount: new Decimal(0),
                },
              });
            }
          }
        }

        // 3.3.6. Aggiorna documento con nuovi totali e snapshot entità (se modificata)
        const updated = await tx.document.update({
          where: { id: validatedData.id },
          data: {
            ...(validatedData.entityId !== undefined && {
              entityId: validatedData.entityId || null,
            }),
            ...(entitySnapshot && entitySnapshot),
            ...(updateShippingSnapshot && updateShippingSnapshot),
            ...(validatedData.date && { date: validatedData.date }),
            // NOTA: mainWarehouseId non è salvato nel documento (non esiste nello schema)
            // Viene solo usato al momento della creazione/aggiornamento per determinare il warehouseId delle righe
            ...(validatedData.notes !== undefined && {
              notes: validatedData.notes || null,
            }),
            ...(validatedData.paymentTerms !== undefined && {
              paymentTerms: validatedData.paymentTerms || null,
            }),
            ...(validatedData.paymentConditionId !== undefined && {
              paymentConditionId: validatedData.paymentConditionId || null,
            }),
            ...(validatedData.codiceCIG !== undefined && {
              codiceCIG: validatedData.codiceCIG || null,
            }),
            ...(validatedData.codiceCUP !== undefined && {
              codiceCUP: validatedData.codiceCUP || null,
            }),
            netTotal: netTotal.toDecimalPlaces(2),
            vatTotal: vatTotal.toDecimalPlaces(2),
            grossTotal: grossTotal.toDecimalPlaces(2),
          },
        });

        return updated;
      } else {
        // 3.4. Nessuna riga da aggiornare: aggiorna solo campi documento e snapshot entità (se modificata)
        const updated = await tx.document.update({
          where: { id: validatedData.id },
          data: {
            ...(validatedData.entityId !== undefined && {
              entityId: validatedData.entityId || null,
            }),
            ...(entitySnapshot && entitySnapshot),
            ...(updateShippingSnapshot && updateShippingSnapshot),
            ...(validatedData.date && { date: validatedData.date }),
            // NOTA: mainWarehouseId non è salvato nel documento (non esiste nello schema)
            // Viene solo usato al momento della creazione/aggiornamento per determinare il warehouseId delle righe
            ...(validatedData.notes !== undefined && {
              notes: validatedData.notes || null,
            }),
            ...(validatedData.paymentTerms !== undefined && {
              paymentTerms: validatedData.paymentTerms || null,
            }),
            ...(validatedData.paymentConditionId !== undefined && {
              paymentConditionId: validatedData.paymentConditionId || null,
            }),
            ...(validatedData.codiceCIG !== undefined && {
              codiceCIG: validatedData.codiceCIG || null,
            }),
            ...(validatedData.codiceCUP !== undefined && {
              codiceCUP: validatedData.codiceCUP || null,
            }),
          },
        });

        // 3.4.1. Gestione scadenze pagamento (se paymentConditionId modificato)
        if (validatedData.paymentConditionId !== undefined) {
          // Elimina scadenze esistenti (se presenti)
          await tx.paymentDeadline.deleteMany({
            where: { documentId: validatedData.id },
          });

          // Se è stata selezionata una nuova condizione, genera nuove scadenze
          if (validatedData.paymentConditionId) {
            // Recupera documento per ottenere grossTotal
            const doc = await tx.document.findUnique({
              where: { id: validatedData.id },
              select: { grossTotal: true, date: true },
            });

            if (doc) {
              // Recupera condizione di pagamento e verifica appartenenza
              const paymentCondition = await tx.paymentCondition.findUnique({
                where: { id: validatedData.paymentConditionId },
                select: {
                  id: true,
                  organizationId: true,
                  daysToFirstDue: true,
                  gapBetweenDues: true,
                  numberOfDues: true,
                  isEndOfMonth: true,
                },
              });

              if (!paymentCondition) {
                throw new Error('Condizione di pagamento non trovata');
              }

              // ✅ Verifica che appartenga all'organizzazione corrente
              verifyOrganizationAccess(ctx, paymentCondition);

              // Usa la data del documento (o quella modificata se presente)
              const documentDate = validatedData.date 
                ? (validatedData.date instanceof Date ? validatedData.date : new Date(validatedData.date))
                : doc.date;

              // Calcola scadenze usando il calcolatore
              const deadlines = calculateDeadlines(
                doc.grossTotal,
                {
                  daysToFirstDue: paymentCondition.daysToFirstDue,
                  gapBetweenDues: paymentCondition.gapBetweenDues,
                  numberOfDues: paymentCondition.numberOfDues,
                  isEndOfMonth: paymentCondition.isEndOfMonth,
                },
                documentDate
              );

              // Crea PaymentDeadline per ogni scadenza calcolata
              for (const deadline of deadlines) {
                await tx.paymentDeadline.create({
                  data: {
                    documentId: validatedData.id,
                    dueDate: deadline.dueDate,
                    amount: deadline.amount,
                    status: 'PENDING',
                    paidAmount: new Decimal(0),
                  },
                });
              }
            }
          }
        }

        return updated;
      }
    });

    // 4. Revalidazione cache Next.js
    revalidatePath('/documents');
    revalidatePath(`/documents/${validatedData.id}`);

    return {
      success: true,
      data: { id: updatedDocument.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento documento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'aggiornamento del documento',
    };
  }
}

/**
 * Ottiene il numero documento proposto per un tipo documento
 * 
 * Server Action per il frontend per ottenere il numero progressivo proposto
 * senza creare il documento.
 * 
 * @param documentTypeId - ID configurazione tipo documento
 * @returns Numero progressivo proposto come stringa (es. "000001")
 */
export async function getProposedDocumentNumberAction(
  documentTypeId: string
): Promise<ActionResult<{ number: string }>> {
  try {
    const ctx = await getAuthContext();
    
    const number = await generateDocumentNumber(
      documentTypeId,
      ctx.organizationId,
      prisma
    );
    
    return {
      success: true,
      data: { number },
    };
  } catch (error) {
    console.error('Errore recupero numero documento proposto:', error);
    
    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: 'Errore durante il recupero del numero documento proposto',
    };
  }
}

/**
 * Genera il numero progressivo annuo per un tipo documento
 * 
 * La numerazione è basata sul numeratorCode della configurazione tipo documento.
 * Documenti con stesso numeratorCode condividono la serie numerica.
 * 
 * @param documentTypeId - ID configurazione tipo documento
 * @param organizationId - ID organizzazione
 * @param tx - Prisma Client (transazione o singleton)
 * @returns Numero progressivo come stringa (es. "000001")
 */
async function generateDocumentNumber(
  documentTypeId: string,
  organizationId: string,
  tx: Prisma.TransactionClient | typeof prisma
): Promise<string> {
  // 1. Recupera configurazione tipo documento
  const docType = await tx.documentTypeConfig.findUnique({
    where: { id: documentTypeId },
    select: { numeratorCode: true },
  });

  if (!docType) {
    throw new Error(`Tipo documento con ID ${documentTypeId} non trovato`);
  }

  // 2. Trova ultimo documento per questa serie numerica (numeratorCode)
  const lastDoc = await tx.document.findFirst({
    where: {
      organizationId,
      documentType: {
        numeratorCode: docType.numeratorCode,
      },
    },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  // 3. Genera numero progressivo
  const nextNumber = lastDoc 
    ? parseInt(lastDoc.number, 10) + 1 
    : 1;

  // 4. Formatta con padding (6 cifre: 000001, 000002, etc.)
  return nextNumber.toString().padStart(6, '0');
}

/**
 * Server Action universale per creazione documenti
 * 
 * FUNZIONALITÀ:
 * - Supporta qualsiasi tipo di documento (Fattura, DDT, Carico, etc.)
 * - Snapshot immutabile di Entity e Product
 * - Calcoli Decimal.js con arrotondamento fiscale
 * - Numerazione progressiva basata su numeratorCode
 * - Integrazione automatica magazzino (se configurato)
 * - Logica magazzino a cascata (riga → prodotto → documento)
 * 
 * LOGICA MAGAZZINO A CASCATA:
 * 1. Priorità 1: line.warehouseId (se specificato sulla riga)
 * 2. Priorità 2: product.defaultWarehouseId (se presente nel prodotto)
 * 3. Priorità 3: document.mainWarehouseId (magazzino predefinito documento)
 * 
 * FLUSSO:
 * 1. Autenticazione e validazione
 * 2. Recupero configurazione tipo documento
 * 3. Recupero Entity e snapshot dati cliente
 * 4. Per ogni riga: recupero Product, snapshot, determinazione warehouseId
 * 5. Calcoli Decimal per totali (imponibile, IVA, lordo)
 * 6. Generazione numerazione progressiva
 * 7. Creazione documento in transazione
 * 8. Integrazione magazzino (se inventoryMovement = true e manageStock = true)
 * 
 * @param input - Dati documento da creare
 * @returns Documento creato o errore
 */
export async function createDocumentAction(
  input: CreateDocumentInput
): Promise<ActionResult<{
  id: string;
  number: string;
  date: Date;
  grossTotal: string;
}>> {
  try {
    // 1. ✅ Autenticazione e contesto organizzazione
    const ctx = await getAuthContext();

    // 2. ✅ Validazione input con Zod
    const validatedData = createDocumentSchema.parse(input);

    // 3. ✅ Recupera configurazione tipo documento e verifica appartenenza
    const documentType = await prisma.documentTypeConfig.findUnique({
      where: { id: validatedData.documentTypeId },
      include: {
        organization: {
          select: { id: true },
        },
      },
    });

    if (!documentType) {
      return {
        success: false,
        error: 'Tipo documento non trovato',
      };
    }

    // ✅ Verifica che il tipo documento appartenga all'organizzazione
    verifyOrganizationAccess(ctx, documentType);

    // ✅ Verifica che il tipo documento sia attivo
    if (!documentType.active) {
      return {
        success: false,
        error: 'Tipo documento non attivo',
      };
    }

    // ✅ Valida magazzini (se specificati) e verifica appartenenza all'organizzazione
    if (validatedData.mainWarehouseId) {
      const mainWarehouse = await prisma.warehouse.findUnique({
        where: { id: validatedData.mainWarehouseId },
        select: { id: true, organizationId: true },
      });

      if (!mainWarehouse) {
        return {
          success: false,
          error: 'Magazzino principale non trovato',
        };
      }

      verifyOrganizationAccess(ctx, mainWarehouse);
    }

    // Valida warehouseId delle righe (se specificati)
    const warehouseIds = validatedData.lines
      .map((line) => line.warehouseId)
      .filter((id): id is string => id !== undefined && id !== null);

    if (warehouseIds.length > 0) {
      const warehouses = await prisma.warehouse.findMany({
        where: {
          id: { in: warehouseIds },
        },
        select: { id: true, organizationId: true },
      });

      // Verifica che tutti i magazzini esistano
      if (warehouses.length !== warehouseIds.length) {
        return {
          success: false,
          error: 'Uno o più magazzini specificati nelle righe non esistono',
        };
      }

      // Verifica che tutti i magazzini appartengano all'organizzazione
      for (const warehouse of warehouses) {
        verifyOrganizationAccess(ctx, warehouse);
      }
    }

    // 4. ✅ Recupera Entity (se specificata) e verifica appartenenza
    let entitySnapshot: {
      customerNameSnapshot: string;
      customerVatSnapshot: string | null;
      customerFiscalCodeSnapshot: string | null;
      customerAddressSnapshot: string;
      customerSdiSnapshot: string | null;
      customerCity: string;
      customerProvince: string;
      customerZip: string;
      customerCountry: string;
    } | null = null;

    if (validatedData.entityId) {
      const entity = await prisma.entity.findUnique({
        where: { id: validatedData.entityId },
        select: {
          id: true,
          organizationId: true,
          businessName: true,
          vatNumber: true,
          fiscalCode: true,
          address: true,
          city: true,
          province: true,
          zipCode: true,
          country: true,
          sdiCode: true,
        },
      });

      if (!entity) {
        return {
          success: false,
          error: 'Entità (cliente/fornitore) non trovata',
        };
      }

      // ✅ Verifica appartenenza all'organizzazione
      verifyOrganizationAccess(ctx, entity);

      // ✅ Snapshot dati Entity (indirizzo da sede se entityAddressId fornito)
      let addressSnapshot = {
        customerAddressSnapshot: entity.address || '',
        customerCity: entity.city || '',
        customerProvince: entity.province || '',
        customerZip: entity.zipCode || '',
        customerCountry: entity.country || 'IT',
      };
      if (validatedData.entityAddressId) {
        const addr = await prisma.entityAddress.findFirst({
          where: { id: validatedData.entityAddressId, entityId: validatedData.entityId },
        });
        if (addr) {
          const addrLine = [addr.street, addr.receiverName].filter(Boolean).join(' - ');
          addressSnapshot = {
            customerAddressSnapshot: addrLine || addr.street,
            customerCity: addr.city,
            customerProvince: addr.province,
            customerZip: addr.zipCode,
            customerCountry: addr.country || 'IT',
          };
        }
      }
      entitySnapshot = {
        customerNameSnapshot: entity.businessName,
        customerVatSnapshot: entity.vatNumber,
        customerFiscalCodeSnapshot: entity.fiscalCode,
        customerSdiSnapshot: entity.sdiCode,
        ...addressSnapshot,
      };
    } else {
      // Se non c'è entityId, usa valori di default (per documenti interni)
      entitySnapshot = {
        customerNameSnapshot: '',
        customerVatSnapshot: null,
        customerFiscalCodeSnapshot: null,
        customerAddressSnapshot: '',
        customerSdiSnapshot: null,
        customerCity: '',
        customerProvince: '',
        customerZip: '',
        customerCountry: 'IT',
      };
    }

    // 4.1. ✅ Snapshot destinazione di consegna (Regola Snapshot: sempre copiati su Document)
    type ShippingSnapshot = {
      shippingNominative: string | null;
      shippingReceiverName: string | null;
      shippingStreet: string | null;
      shippingCity: string | null;
      shippingZipCode: string | null;
      shippingProvince: string | null;
      shippingCountry: string | null;
      shippingAddressId: string | null;
    };
    let shippingSnapshot: ShippingSnapshot = {
      shippingNominative: null,
      shippingReceiverName: null,
      shippingStreet: null,
      shippingCity: null,
      shippingZipCode: null,
      shippingProvince: null,
      shippingCountry: null,
      shippingAddressId: null,
    };
    const hasManualShipping =
      (validatedData.shippingStreet?.trim() ?? '') !== '' ||
      (validatedData.shippingCity?.trim() ?? '') !== '' ||
      (validatedData.shippingReceiverName?.trim() ?? '') !== '' ||
      (validatedData.shippingNominative?.trim() ?? '') !== '';
    if (validatedData.shippingAddressId && validatedData.entityId) {
      const addr = await prisma.entityAddress.findFirst({
        where: {
          id: validatedData.shippingAddressId,
          entityId: validatedData.entityId,
        },
      });
      if (addr) {
        const entityForVerify = await prisma.entity.findUnique({
          where: { id: addr.entityId },
          select: { organizationId: true },
        });
        if (entityForVerify) {
          verifyOrganizationAccess(ctx, entityForVerify);
          shippingSnapshot = {
            shippingNominative: addr.nominative,
            shippingReceiverName: addr.receiverName,
            shippingStreet: addr.street,
            shippingCity: addr.city,
            shippingZipCode: addr.zipCode,
            shippingProvince: addr.province,
            shippingCountry: addr.country || 'IT',
            shippingAddressId: addr.id,
          };
        }
      }
    } else if (hasManualShipping) {
      shippingSnapshot = {
        shippingNominative: (validatedData.shippingNominative?.trim() ?? '') || null,
        shippingReceiverName: (validatedData.shippingReceiverName?.trim() ?? '') || null,
        shippingStreet: (validatedData.shippingStreet?.trim() ?? '') || null,
        shippingCity: (validatedData.shippingCity?.trim() ?? '') || null,
        shippingZipCode: (validatedData.shippingZipCode?.trim() ?? '') || null,
        shippingProvince: (validatedData.shippingProvince?.trim() ?? '') || null,
        shippingCountry: (validatedData.shippingCountry?.trim() ?? '') || 'IT',
        shippingAddressId: null,
      };
    }

    // 5. ✅ Prepara righe documento con snapshot e calcoli
    const documentLinesData: Array<{
      productId: string | null;
      productCode: string;
      description: string;
      unitPrice: Decimal;
      quantity: Decimal;
      vatRateId: string | null;
      vatRate: Decimal;
      netAmount: Decimal;
      vatAmount: Decimal;
      grossAmount: Decimal;
      warehouseId?: string | null; // Per passare al servizio stock
    }> = [];

    // Totali documento (accumulatori)
    let netTotal = new Decimal(0);
    let vatTotal = new Decimal(0);
    let grossTotal = new Decimal(0);

    // Per ogni riga input, recupera prodotto e calcola totali
    for (const lineInput of validatedData.lines) {
      // ✅ Recupera prodotto (se productId presente) e verifica appartenenza
      let product: {
        id: string;
        code: string;
        name: string;
        description: string | null;
        price: Decimal;
        vatRateId: string | null;
        type: { manageStock: boolean } | null;
        defaultWarehouseId: string | null;
        organizationId: string;
      } | null = null;

      if (lineInput.productId) {
        const productData = await prisma.product.findUnique({
          where: { id: lineInput.productId },
          include: {
            type: {
              select: { manageStock: true },
            },
          },
        });

        if (!productData) {
          return {
            success: false,
            error: `Prodotto con ID ${lineInput.productId} non trovato`,
          };
        }

        // ✅ Verifica appartenenza all'organizzazione
        verifyOrganizationAccess(ctx, productData);

        product = {
          id: productData.id,
          code: productData.code,
          name: productData.name,
          description: productData.description,
          price: toDecimal(productData.price),
          vatRateId: productData.vatRateId,
          type: productData.type,
          defaultWarehouseId: productData.defaultWarehouseId,
          organizationId: productData.organizationId,
        };
      }

      // ✅ Snapshot dati prodotto (usa input o dati prodotto)
      const productCode = lineInput.productCode;
      const description = lineInput.description;
      const unitPrice = toDecimal(lineInput.unitPrice);
      const quantity = toDecimal(lineInput.quantity);
      const vatRate = toDecimal(lineInput.vatRate);

      // ✅ Calcola totali riga con Decimal.js
      const lineTotals = calculateLineTotal(quantity, unitPrice, vatRate);

      // ✅ Accumula totali documento
      netTotal = netTotal.plus(lineTotals.netAmount);
      vatTotal = vatTotal.plus(lineTotals.vatAmount);
      grossTotal = grossTotal.plus(lineTotals.grossAmount);

      // ✅ Risolvi warehouseId a cascata (riga → prodotto → documento) per movimenti magazzino
      const resolvedWarehouseId =
        lineInput.warehouseId ??
        product?.defaultWarehouseId ??
        validatedData.mainWarehouseId ??
        null;

      // ✅ Prepara dati riga documento
      documentLinesData.push({
        productId: product?.id || null,
        productCode,
        description,
        unitPrice,
        quantity,
        vatRateId: product?.vatRateId || null,
        vatRate,
        netAmount: lineTotals.netAmount,
        vatAmount: lineTotals.vatAmount,
        grossAmount: lineTotals.grossAmount,
        warehouseId: resolvedWarehouseId, // Passato a processDocumentLineStock per generare movimento
      });
    }

    // 6. ✅ Crea documento in transazione (obbligatoria per atomicità)
    const document = await prisma.$transaction(async (tx) => {
      // 6.1. Determina numero documento
      let documentNumber: string;
      
      if (validatedData.number) {
        // Numero fornito dall'utente: valida che non ci siano duplicati
        // Recupera configurazione tipo documento per ottenere numeratorCode
        const docType = await tx.documentTypeConfig.findUnique({
          where: { id: validatedData.documentTypeId },
          select: { numeratorCode: true },
        });

        if (!docType) {
          throw new Error('Tipo documento non trovato');
        }

        // Verifica che non esista già un documento con stesso numero e stesso numeratorCode
        const existingDoc = await tx.document.findFirst({
          where: {
            organizationId: ctx.organizationId,
            number: validatedData.number,
            documentType: {
              numeratorCode: docType.numeratorCode,
            },
          },
        });

        if (existingDoc) {
          throw new Error(`Numero documento ${validatedData.number} già esistente per questa serie numerica (${docType.numeratorCode})`);
        }

        // Formatta numero con padding (6 cifre)
        documentNumber = validatedData.number.padStart(6, '0');
      } else {
        // Numero non fornito: genera automaticamente
        documentNumber = await generateDocumentNumber(
          validatedData.documentTypeId,
          ctx.organizationId,
          tx
        );
      }

      // 6.2. Determina categoria documento (per compatibilità con enum)
      // Mappa codice tipo documento a categoria enum
      const categoryMap: Record<string, 'QUOTE' | 'ORDER' | 'DELIVERY_NOTE' | 'INVOICE' | 'CREDIT_NOTE'> = {
        'QUOTE': 'QUOTE',
        'ORDER': 'ORDER',
        'ORD_CLIENTE': 'ORDER',
        'ORD_FORNITORE': 'ORDER',
        'DDT': 'DELIVERY_NOTE',
        'CAF': 'DELIVERY_NOTE',
        'INVOICE': 'INVOICE',
        'FAI': 'INVOICE',
        'FAD': 'INVOICE',
        'FAC': 'INVOICE',
        'NC': 'CREDIT_NOTE',
        'NDC': 'CREDIT_NOTE',
        'NCF': 'CREDIT_NOTE',
      };

      const category = categoryMap[documentType.code] || 'INVOICE';

      // 6.3. Crea documento con snapshot (cliente + destinazione consegna)
      const createdDocument = await tx.document.create({
        data: {
          organizationId: ctx.organizationId,
          documentTypeId: validatedData.documentTypeId,
          category,
          number: documentNumber,
          date: validatedData.date,
          entityId: validatedData.entityId || null,
          ...entitySnapshot,
          ...shippingSnapshot,
          netTotal: netTotal.toDecimalPlaces(2),
          vatTotal: vatTotal.toDecimalPlaces(2),
          grossTotal: grossTotal.toDecimalPlaces(2),
          notes: validatedData.notes || null,
          paymentTerms: validatedData.paymentTerms || null,
          paymentConditionId: validatedData.paymentConditionId || null,
          // ✅ Codici per fatture verso PA
          codiceCIG: validatedData.codiceCIG || null,
          codiceCUP: validatedData.codiceCUP || null,
        },
      });

      // 6.4. Crea righe documento e processa magazzino
      const createdLines = [];
      for (const lineData of documentLinesData) {
        const createdLine = await tx.documentLine.create({
          data: {
            documentId: createdDocument.id,
            productId: lineData.productId,
            productCode: lineData.productCode,
            description: lineData.description,
            unitPrice: lineData.unitPrice.toDecimalPlaces(2),
            quantity: lineData.quantity.toDecimalPlaces(4),
            vatRateId: lineData.vatRateId,
            vatRate: lineData.vatRate.toDecimalPlaces(4),
            netAmount: lineData.netAmount.toDecimalPlaces(2),
            vatAmount: lineData.vatAmount.toDecimalPlaces(2),
            grossAmount: lineData.grossAmount.toDecimalPlaces(2),
          },
        });

        createdLines.push({
          line: createdLine,
          warehouseId: lineData.warehouseId, // Priorità 1: warehouseId della riga
        });
      }

      // 6.5. ✅ Genera scadenze pagamento (se paymentConditionId presente)
      if (validatedData.paymentConditionId) {
        // Recupera condizione di pagamento e verifica appartenenza
        const paymentCondition = await tx.paymentCondition.findUnique({
          where: { id: validatedData.paymentConditionId },
          select: {
            id: true,
            organizationId: true,
            daysToFirstDue: true,
            gapBetweenDues: true,
            numberOfDues: true,
            isEndOfMonth: true,
          },
        });

        if (!paymentCondition) {
          throw new Error('Condizione di pagamento non trovata');
        }

        // ✅ Verifica che appartenga all'organizzazione corrente
        verifyOrganizationAccess(ctx, paymentCondition);

        // Calcola scadenze usando il calcolatore
        const deadlines = calculateDeadlines(
          grossTotal,
          {
            daysToFirstDue: paymentCondition.daysToFirstDue,
            gapBetweenDues: paymentCondition.gapBetweenDues,
            numberOfDues: paymentCondition.numberOfDues,
            isEndOfMonth: paymentCondition.isEndOfMonth,
          },
          validatedData.date instanceof Date ? validatedData.date : new Date(validatedData.date)
        );

        // Crea PaymentDeadline per ogni scadenza calcolata
        for (const deadline of deadlines) {
          await tx.paymentDeadline.create({
            data: {
              documentId: createdDocument.id,
              dueDate: deadline.dueDate,
              amount: deadline.amount,
              status: 'PENDING',
              paidAmount: new Decimal(0),
            },
          });
        }
      }

      // 6.6. ✅ Integrazione magazzino (se configurato)
      // Processa movimenti magazzino per ogni riga creata
      for (const { line, warehouseId } of createdLines) {
        // Crea riga documento con warehouseId opzionale per passare al servizio stock
        const documentLineWithWarehouse = {
          ...line,
          warehouseId, // Priorità 1: warehouseId della riga
        };

        // Chiama servizio stock (gestisce logica a cascata e verifica inventoryMovement/manageStock)
        // Il servizio determina il warehouseId finale con priorità:
        // 1. line.warehouseId (se specificato)
        // 2. product.defaultWarehouseId (se presente)
        // 3. documentMainWarehouseId (fallback)
        await processDocumentLineStock(
          tx,
          documentLineWithWarehouse,
          documentType,
          validatedData.mainWarehouseId || null, // Priorità 3: mainWarehouseId documento
          createdDocument.id,
          documentNumber,
          ctx.organizationId
        );
      }

      return createdDocument;
    });

    // 7. ✅ Revalidazione cache Next.js
    revalidatePath('/documents');
    revalidatePath(`/documents/${document.id}`);

    return {
      success: true,
      data: {
        id: document.id,
        number: document.number,
        date: document.date,
        grossTotal: document.grossTotal.toString(),
      },
    };
  } catch (error) {
    console.error('Errore creazione documento:', error);

    // Gestione errori specifici
    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Gestione errori Zod (validazione)
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ path: string[]; message: string }> };
      const firstError = zodError.issues[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    // Gestione errori Prisma (es. unique constraint violation)
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint') || error.message.includes('organizationId_number')) {
        return {
          success: false,
          error: 'Numero documento già esistente per questa organizzazione',
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante la creazione del documento',
    };
  }
}

/**
 * Elimina un documento esistente
 * 
 * MULTITENANT: Verifica che il documento appartenga all'organizzazione corrente
 * 
 * FUNZIONALITÀ:
 * - Elimina tutti i movimenti di magazzino collegati al documento
 * - Elimina tutte le righe del documento
 * - Elimina il documento stesso
 * 
 * NOTA: L'eliminazione è CASCADE - tutti i dati collegati vengono eliminati automaticamente.
 * 
 * @param id - ID del documento da eliminare
 * @returns Result con successo o errore
 */
export async function deleteDocumentAction(
  id: string
): Promise<ActionResult<{ id: string; number: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();

    // 2. Recupera documento per verifica esistenza e accesso
    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        organizationId: true,
        documentType: {
          select: {
            code: true,
            description: true,
          },
        },
      },
    });

    if (!document) {
      return {
        success: false,
        error: 'Documento non trovato',
      };
    }

    // 3. ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, document);

    // 4. Elimina documento e tutti i dati collegati in una transazione
    // NOTA: Prisma elimina automaticamente le righe (DocumentLine) per CASCADE
    // Ma dobbiamo eliminare manualmente i movimenti di magazzino
    await prisma.$transaction(async (tx) => {
      // 4a. Elimina tutti i movimenti di magazzino collegati al documento
      await tx.stockMovement.deleteMany({
        where: {
          documentId: id,
          organizationId: ctx.organizationId,
        },
      });

      // 4b. Elimina tutte le righe del documento
      await tx.documentLine.deleteMany({
        where: {
          documentId: id,
        },
      });

      // 4c. Elimina il documento stesso
      await tx.document.delete({
        where: { id },
      });
    });

    // 5. Revalida le pagine interessate
    revalidatePath('/documents');
    revalidatePath(`/documents/${id}`);

    return {
      success: true,
      data: {
        id: document.id,
        number: document.number,
      },
    };
  } catch (error) {
    console.error('Errore eliminazione documento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione del documento',
    };
  }
}

/**
 * Genera e scarica l'XML Fattura Elettronica (formato FatturaPA) per un documento
 * 
 * DISTINZIONE:
 * - "Fattura Elettronica" = documento fiscale in formato XML (B2B, B2C, B2PA)
 * - "FatturaPA" = formato XML standard (stesso tracciato per tutti)
 * - Il documento diventa "FatturaPA" solo se destinatario è una PA
 * 
 * FUNZIONALITÀ:
 * - Genera XML conforme al tracciato FatturaPA versione 1.2.1
 * - Validazione P.IVA e Codice Fiscale prima di generare
 * - Usa SOLO dati snapshot (immutabilità garantita)
 * - Multi-tenancy: verifica che documento appartenga all'organizzazione
 * 
 * REQUISITI:
 * - Il documento deve essere una Fattura (INVOICE) o Nota di Credito (CREDIT_NOTE)
 * - Organization deve avere P.IVA valida
 * - Cliente deve avere P.IVA o Codice Fiscale validi
 * - Deve essere presente Codice Destinatario (SDI) o PEC
 * 
 * @param documentId - ID del documento da convertire in XML
 * @returns XML string pronto per il download o errore
 * 
 * @example
 * ```typescript
 * const result = await downloadInvoiceXMLAction('doc_123');
 * if (result.success) {
 *   // Crea blob e scarica
 *   const blob = new Blob([result.data.xml], { type: 'application/xml' });
 *   const url = URL.createObjectURL(blob);
 *   const a = document.createElement('a');
 *   a.href = url;
 *   a.download = result.data.filename;
 *   a.click();
 * }
 * ```
 */
export async function downloadInvoiceXMLAction(
  documentId: string
): Promise<ActionResult<{ xml: string; filename: string }>> {
  try {
    // 1. ✅ Autenticazione e contesto organizzazione
    const ctx = await getAuthContext();

    // 2. ✅ Genera XML usando servizio business
    const xml = await generateInvoiceXML(documentId, ctx.organizationId);

    // 3. ✅ Recupera numero documento per nome file
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { number: true, category: true },
    });

    if (!document) {
      return {
        success: false,
        error: 'Documento non trovato',
      };
    }

    // 4. Genera nome file: FATTURA_000001.xml o NOTA_CREDITO_000001.xml
    const prefix = document.category === 'CREDIT_NOTE' ? 'NOTA_CREDITO' : 'FATTURA';
    const filename = `${prefix}_${document.number}.xml`;

    return {
      success: true,
      data: {
        xml,
        filename,
      },
    };
  } catch (error) {
    console.error('Errore generazione XML FatturaPA:', error);

    // Gestione errori specifici InvoiceXMLError
    if (error instanceof InvoiceXMLError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Gestione errori ForbiddenError
    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Gestione errori generici
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante la generazione dell\'XML FatturaPA',
    };
  }
}
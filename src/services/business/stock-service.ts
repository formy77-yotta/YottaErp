import { Decimal } from 'decimal.js';
import { PrismaClient, MovementType, DocumentTypeConfig, DocumentLine } from '@prisma/client';
import { toDecimal } from '@/lib/decimal-utils';
import { prisma as defaultPrisma } from '@/lib/prisma';

/**
 * Servizio di Gestione Magazzino
 * 
 * REGOLA FONDAMENTALE: Calculated Stock Rule
 * La giacenza NON è un campo statico, ma viene calcolata come somma algebrica
 * di tutti i movimenti in StockMovement.
 * 
 * Questo servizio gestisce:
 * - Creazione movimenti magazzino da righe documento
 * - Calcolo giacenza attuale (somma algebrica movimenti)
 * 
 * IMPORTANTE:
 * - Usa sempre Decimal.js per calcoli (MAI number)
 * - I movimenti sono immutabili (non si modificano, solo si creano)
 * - La giacenza si aggiorna automaticamente quando si aggiungono movimenti
 */

/**
 * Mappa il tipo documento e il segno operazione al MovementType
 * 
 * LOGICA DI MAPPATURA:
 * - Il code del DocumentTypeConfig identifica il tipo documento (es. "DDT", "FAI", "OF")
 * - Il operationSignStock determina se è carico (+1) o scarico (-1)
 * - La combinazione determina il MovementType specifico
 * 
 * @param documentTypeCode - Codice tipo documento (es. "DDT", "FAI", "OF", "NC")
 * @param operationSignStock - Segno operazione (+1 carico, -1 scarico)
 * @returns MovementType corrispondente
 * 
 * @example
 * ```typescript
 * mapDocumentTypeToMovementType('DDT', -1); // SCARICO_DDT
 * mapDocumentTypeToMovementType('FAI', -1); // SCARICO_VENDITA
 * mapDocumentTypeToMovementType('OF', 1); // CARICO_FORNITORE
 * mapDocumentTypeToMovementType('NC', 1); // RESO_CLIENTE
 * ```
 */
function mapDocumentTypeToMovementType(
  documentTypeCode: string,
  operationSignStock: number
): MovementType {
  // Normalizza il codice in maiuscolo per confronto case-insensitive
  const code = documentTypeCode.toUpperCase();

  // Se è un carico (operationSignStock = +1)
  if (operationSignStock === 1) {
    // Ordini fornitore → Carico fornitore
    if (code === 'OF' || code === 'ORD_FORNITORE') {
      return MovementType.CARICO_FORNITORE;
    }
    // Note credito → Reso cliente (carico)
    if (code === 'NC' || code === 'NDC' || code === 'NCF') {
      return MovementType.RESO_CLIENTE;
    }
    // Resi fornitore → Carico fornitore
    if (code === 'RESO_FORNITORE') {
      return MovementType.CARICO_FORNITORE;
    }
    // Default per carichi generici
    return MovementType.CARICO_FORNITORE;
  }

  // Se è uno scarico (operationSignStock = -1)
  if (operationSignStock === -1) {
    // DDT → Scarico DDT
    if (code === 'DDT' || code === 'CAF') {
      return MovementType.SCARICO_DDT;
    }
    // Fatture → Scarico vendita
    if (code === 'FAI' || code === 'FAD' || code === 'FAC') {
      return MovementType.SCARICO_VENDITA;
    }
    // Resi fornitore → Scarico (reso a fornitore)
    if (code === 'RESO_FORNITORE') {
      return MovementType.RESO_FORNITORE;
    }
    // Default per scarichi generici
    return MovementType.SCARICO_VENDITA;
  }

  // Fallback (non dovrebbe mai arrivare qui se validazione corretta)
  throw new Error(
    `Impossibile mappare tipo documento ${documentTypeCode} con segno ${operationSignStock}`
  );
}

/**
 * Processa una riga documento e crea il movimento di magazzino se necessario
 * 
 * CALCULATED STOCK RULE:
 * Questa funzione rispetta rigorosamente la regola della giacenza calcolata:
 * - Non aggiorna mai direttamente un campo "stock" nel Product
 * - Crea solo nuovi record in StockMovement
 * - La giacenza viene calcolata dinamicamente sommando tutti i movimenti
 * 
 * LOGICA MAGAZZINO PER RIGA:
 * - Se la riga ha un warehouseId specifico, usa quello
 * - Se la riga NON ha warehouseId, usa il mainWarehouseId del documento (default)
 * - Se anche il documento non ha mainWarehouseId, non crea movimento (errore logico)
 * 
 * FLUSSO:
 * 1. Determina warehouseId: line.warehouseId ?? document.mainWarehouseId
 * 2. Verifica se il tipo documento movimenta magazzino (inventoryMovement)
 * 3. Verifica se il prodotto gestisce magazzino (product.type.manageStock)
 * 4. Calcola quantità algebrica: line.quantity * config.operationSignStock
 * 5. Crea record StockMovement con tracciabilità documento
 * 
 * @param tx - Prisma Client transazione (deve essere eseguito dentro una transazione)
 * @param line - Riga documento da processare (deve includere warehouseId opzionale)
 * @param config - Configurazione tipo documento
 * @param documentMainWarehouseId - ID magazzino predefinito del documento (opzionale)
 * @param documentId - ID documento origine (per tracciabilità)
 * @param documentNumber - Numero documento (per ricerca)
 * @param organizationId - ID organizzazione (MULTITENANT)
 * @returns StockMovement creato, o null se non necessario
 * 
 * @throws {Error} Se productId non valido o prodotto non trovato
 * @throws {Error} Se warehouseId non determinabile (né riga né documento)
 * 
 * @example
 * ```typescript
 * await prisma.$transaction(async (tx) => {
 *   const document = await tx.document.create({ data: { mainWarehouseId: '...', ... } });
 *   
 *   for (const line of document.lines) {
 *     await processDocumentLineStock(
 *       tx,
 *       line,
 *       documentTypeConfig,
 *       document.mainWarehouseId, // Default per tutte le righe
 *       document.id,
 *       document.number,
 *       organizationId
 *     );
 *   }
 * });
 * ```
 */
export async function processDocumentLineStock(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>,
  line: DocumentLine & { warehouseId?: string | null },
  config: DocumentTypeConfig,
  documentMainWarehouseId: string | null | undefined,
  documentId: string,
  documentNumber: string,
  organizationId: string
): Promise<{ id: string; quantity: Decimal } | null> {
  // 1. ✅ Verifica se il tipo documento movimenta magazzino
  if (!config.inventoryMovement) {
    // Tipo documento non movimenta magazzino (es. Preventivo, Ordine non confermato)
    return null;
  }

  // 2. ✅ Verifica se la riga ha un prodotto associato (articolo codificato)
  // REGOLA: Articoli non codificati (senza productId) non movimentano magazzino
  if (!line.productId || line.productId.trim() === '') {
    // Riga senza prodotto codificato (es. descrizione libera) → nessun movimento
    return null;
  }

  // 3. ✅ Determina warehouseId con logica a cascata:
  //    Priorità 1: warehouseId della riga (se specificato)
  //    Priorità 2: defaultWarehouseId del prodotto (se presente)
  //    Priorità 3: mainWarehouseId del documento (fallback)
  
  // Recupera il prodotto per ottenere defaultWarehouseId e verificare manageStock
  const product = await tx.product.findUnique({
    where: { id: line.productId },
    select: {
      defaultWarehouseId: true,
      type: {
        select: {
          manageStock: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error(`Prodotto con ID ${line.productId} non trovato`);
  }

  // 4. ✅ Verifica se il prodotto gestisce magazzino
  if (!product.type?.manageStock) {
    // Prodotto non gestito a magazzino (es. servizio) → nessun movimento
    return null;
  }

  // Determina warehouseId finale con priorità
  const warehouseId = line.warehouseId || product.defaultWarehouseId || documentMainWarehouseId;
  
  if (!warehouseId) {
    // Nessun magazzino specificato (né riga, né prodotto, né documento)
    // Non creiamo movimento (potrebbe essere un documento senza movimentazione magazzino)
    return null;
  }

  // 5. ✅ Verifica che operationSignStock sia definito (dovrebbe essere sempre se inventoryMovement = true)
  if (config.operationSignStock === null || config.operationSignStock === undefined) {
    throw new Error(
      `Tipo documento ${config.code} ha inventoryMovement=true ma operationSignStock non definito`
    );
  }

  // 6. ✅ Calcola quantità algebrica: line.quantity * operationSignStock
  // IMPORTANTE: La quantità in StockMovement è algebrica:
  // - Positiva per carichi (es. +10 pezzi)
  // - Negativa per scarichi (es. -10 pezzi)
  // Il segno viene determinato da operationSignStock:
  // - operationSignStock = +1 → carico → quantità positiva
  // - operationSignStock = -1 → scarico → quantità negativa
  const lineQuantity = toDecimal(line.quantity);
  const signedQuantity = lineQuantity.mul(config.operationSignStock);

  // 7. ✅ Mappa tipo movimento dal codice documento e segno operazione
  const movementType = mapDocumentTypeToMovementType(
    config.code,
    config.operationSignStock
  );

  // 8. ✅ Crea record StockMovement
  // REGOLA: Ogni movimento è immutabile e tracciabile al documento origine
  const stockMovement = await tx.stockMovement.create({
    data: {
      organizationId,
      productId: line.productId,
      warehouseId,
      quantity: signedQuantity,
      type: movementType,
      documentTypeId: config.id,
      documentId,
      documentNumber,
      // notes e userId possono essere aggiunti in futuro se necessario
    },
  });

  return {
    id: stockMovement.id,
    quantity: signedQuantity,
  };
}

/**
 * Calcola la giacenza attuale di un prodotto
 * 
 * CALCULATED STOCK RULE:
 * La giacenza NON è un campo nel Product, ma viene calcolata dinamicamente
 * come somma algebrica di tutti i movimenti in StockMovement.
 * 
 * FORMULA:
 * Giacenza = SUM(quantity) WHERE productId = ? [AND warehouseId = ?]
 * 
 * IMPORTANTE:
 * - Usa Decimal.js per evitare errori di arrotondamento
 * - La quantità è algebrica: positiva per carichi, negativa per scarichi
 * - Se non ci sono movimenti, la giacenza è 0
 * 
 * @param productId - ID prodotto
 * @param warehouseId - ID magazzino (opzionale, se non specificato calcola giacenza totale)
 * @param organizationId - ID organizzazione (MULTITENANT)
 * @param prisma - Prisma Client (default: prisma singleton)
 * @returns Giacenza attuale come Decimal
 * 
 * @example
 * ```typescript
 * // Giacenza totale (tutti i magazzini)
 * const totalStock = await getStock(productId, undefined, organizationId);
 * 
 * // Giacenza per magazzino specifico
 * const warehouseStock = await getStock(productId, warehouseId, organizationId);
 * ```
 */
export async function getStock(
  productId: string,
  organizationId: string,
  warehouseId?: string,
  prismaClient?: PrismaClient
): Promise<Decimal> {
  // Usa il client passato o il singleton globale
  const prisma = prismaClient || defaultPrisma;

  // Query movimenti per questo prodotto
  const movements = await prisma.stockMovement.findMany({
    where: {
      organizationId,
      productId,
      ...(warehouseId && { warehouseId }), // Filtra per magazzino se specificato
    },
    select: {
      quantity: true, // Solo la quantità, non serve il resto
    },
  });

  // Calcola somma algebrica usando Decimal.js
  // IMPORTANTE: Usa Decimal per evitare errori di arrotondamento
  const stock = movements.reduce(
    (acc, movement) => {
      // Converte Prisma Decimal a Decimal.js
      const quantity = toDecimal(movement.quantity.toString());
      return acc.plus(quantity);
    },
    new Decimal(0) // Valore iniziale: 0
  );

  return stock;
}

/**
 * Calcola la giacenza per più prodotti contemporaneamente
 * 
 * Utile per ottimizzare query quando serve la giacenza di più prodotti.
 * 
 * @param productIds - Array di ID prodotti
 * @param organizationId - ID organizzazione (MULTITENANT)
 * @param warehouseId - ID magazzino (opzionale)
 * @param prismaClient - Prisma Client (opzionale)
 * @returns Mappa productId -> giacenza (Decimal)
 * 
 * @example
 * ```typescript
 * const stocks = await getStocks(['prod1', 'prod2'], organizationId);
 * console.log(stocks['prod1']); // Decimal con giacenza prodotto 1
 * ```
 */
export async function getStocks(
  productIds: string[],
  organizationId: string,
  warehouseId?: string,
  prismaClient?: PrismaClient
): Promise<Record<string, Decimal>> {
  const prisma = prismaClient || defaultPrisma;

  // Query aggregata per tutti i prodotti
  const movements = await prisma.stockMovement.groupBy({
    by: ['productId'],
    where: {
      organizationId,
      productId: { in: productIds },
      ...(warehouseId && { warehouseId }),
    },
    _sum: {
      quantity: true,
    },
  });

  // Converti in mappa productId -> giacenza
  const stocks: Record<string, Decimal> = {};

  // Inizializza tutti i prodotti a 0
  for (const productId of productIds) {
    stocks[productId] = new Decimal(0);
  }

  // Popola con valori calcolati
  for (const movement of movements) {
    if (movement.productId && movement._sum.quantity) {
      stocks[movement.productId] = toDecimal(movement._sum.quantity.toString());
    }
  }

  return stocks;
}

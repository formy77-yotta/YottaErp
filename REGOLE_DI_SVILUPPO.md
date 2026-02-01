# Regole di Sviluppo - YottaErp

## 📋 Indice
1. [Linguaggio e Comunicazione](#linguaggio-e-comunicazione)
2. [Stack Tecnologico](#stack-tecnologico)
3. [🏗️ REGOLE ARCHITETTURALI ERP (MANDATORIE)](#regole-architetturali-erp)
   - [Gestione Fiscale e Numerica](#1-gestione-fiscale-e-numerica)
   - [Immutabilità dei Documenti](#2-immutabilit-dei-documenti-snapshot-rule)
   - [Gestione Magazzino](#3-gestione-magazzino-calculated-stock)
   - [Validazione Italiana](#4-validazione-italiana)
   - [Multitenant](#5-multitenant-isolamento-organizzazioni)
   - [Struttura Cartelle](#6-struttura-cartelle)
4. [Ingegneria del Software](#ingegneria-del-software)
   - [Database First](#database-first)
   - [Type-Safety Assoluta](#type-safety-assoluta)
   - [Regola delle 150 Righe](#regola-delle-150-righe)
   - [Documentazione Anti-Amnesia](#documentazione-anti-amnesia)
   - [Modularità](#modularit)
5. [Convenzioni di Naming](#convenzioni-di-naming)
6. [Principi di Codice](#principi-di-codice)
7. [React Best Practices](#react-best-practices)
8. [Testing](#testing)
9. [Documentazione](#documentazione)
10. [Git e Versioning](#git-e-versioning)
11. [Security](#security)
12. [Performance](#performance)
13. [Code Review](#code-review)
14. [Checklist ERP](#checklist-erp)

---

## Linguaggio e Comunicazione

- **Italiano sempre**: Tutta la documentazione, commenti e comunicazione devono essere in italiano
- **Terminologia tecnica**: Utilizzare termini tecnici in inglese quando appropriato (es. "hook", "component", "props")
- **Chiarezza**: Comunicazione chiara, concisa e professionale
- **Contesto**: Fornire sempre il contesto necessario per comprendere decisioni architetturali

---

## Stack Tecnologico

### Frontend
- **TypeScript** (strict mode obbligatorio)
- **React** 18+ con hooks moderni
- **Next.js 14** con App Router e Server Actions
- **Zod** per validazione schemi

### Backend
- **Node.js** runtime
- **Prisma ORM** per database
- **PostgreSQL** database relazionale

### Librerie Critiche ERP
- **decimal.js** - OBBLIGATORIA per calcoli monetari
- **Zod** - Validazione client e server
- **Prisma Client** - Type-safe database access

### Tooling
- **Git** per version control
- **ESLint** per linting
- **Prettier** per formatting
- **TypeScript** compiler in strict mode

---

# 🏗️ REGOLE ARCHITETTURALI ERP (MANDATORIE)

## 1. ⚠️ GESTIONE FISCALE E NUMERICA (PILASTRO FONDAMENTALE)

### REGOLA ASSOLUTA: MAI USARE `number` PER VALORI MONETARI

**Problema:** JavaScript `number` usa floating-point (IEEE 754), che causa errori di arrotondamento:
```javascript
0.1 + 0.2 // = 0.30000000000000004 ❌
19.99 * 1.22 // = 24.387800000000002 ❌
```

Questi errori sono **INACCETTABILI** in un sistema ERP dove la precisione fiscale è obbligatoria per legge.

### ❌ VIETATO

```typescript
// ❌ MAI fare questo!
const price: number = 19.99;
const vatRate: number = 0.22;
const total = price * (1 + vatRate); // Errore di arrotondamento!

// ❌ VIETATO anche nei tipi Prisma
model Product {
  price Float // ❌ NO!
  vat   Float // ❌ NO!
}
```

### ✅ OBBLIGATORIO

```typescript
import { Decimal } from 'decimal.js';

// ✅ CORRETTO: Usa sempre Decimal per valori monetari
const price = new Decimal('19.99');
const vatRate = new Decimal('0.22');
const total = price.mul(vatRate.plus(1)); // Preciso al centesimo!
```

### Database (Prisma Schema)

```prisma
model Product {
  id          String   @id @default(cuid())
  
  // ✅ CORRETTO: Decimal con precisione specifica
  price       Decimal  @db.Decimal(12, 2)  // Prezzi: 12 cifre totali, 2 decimali
  weight      Decimal  @db.Decimal(12, 4)  // Quantità/Pesi: 4 decimali
  vatRate     Decimal  @db.Decimal(5, 4)   // Aliquote: es. 0.2200 (22%)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Precisione:**
- `Decimal(12, 2)` per valute: max 9.999.999.999,99 con 2 decimali
- `Decimal(12, 4)` per quantità: max 99.999.999,9999 con 4 decimali
- `Decimal(5, 4)` per aliquote: max 9,9999 (es. 0.2200 = 22%)

### Arrotondamento Fiscale

```typescript
import { Decimal } from 'decimal.js';

// ✅ Configurazione globale (da mettere in src/lib/decimal-utils.ts)
Decimal.set({ rounding: Decimal.ROUND_HALF_UP }); // Sempre ROUND_HALF_UP per conformità fiscale

/**
 * Calcola l'importo IVA da un importo netto
 * 
 * @param netAmount - Importo netto (senza IVA)
 * @param vatRate - Aliquota IVA (es. 0.22 per 22%)
 * @returns Importo IVA arrotondato a 2 decimali
 */
export function calculateVAT(netAmount: Decimal, vatRate: Decimal): Decimal {
  return netAmount.mul(vatRate).toDecimalPlaces(2);
}

/**
 * Calcola l'importo lordo (netto + IVA)
 */
export function calculateGross(netAmount: Decimal, vatRate: Decimal): Decimal {
  const vat = calculateVAT(netAmount, vatRate);
  return netAmount.plus(vat).toDecimalPlaces(2);
}

/**
 * Scorporo IVA: da importo lordo calcola netto e IVA
 * 
 * LOGICA DI BUSINESS:
 * Se un cliente paga 122€ con IVA 22%:
 * - Netto = 122 / 1.22 = 100.00
 * - IVA = 122 - 100 = 22.00
 */
export function extractVAT(grossAmount: Decimal, vatRate: Decimal): {
  net: Decimal;
  vat: Decimal;
} {
  const divisor = new Decimal(1).plus(vatRate);
  const net = grossAmount.div(divisor).toDecimalPlaces(2);
  const vat = grossAmount.minus(net).toDecimalPlaces(2);
  return { net, vat };
}

/**
 * Conversione sicura da string/number a Decimal
 */
export function toDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value.toString());
}
```

### Validazione Zod per Decimal

```typescript
import { z } from 'zod';
import { Decimal } from 'decimal.js';

// Schema di base per Decimal
export const decimalSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Formato numerico non valido')
  .transform((val) => new Decimal(val));

// Schema per prezzi (positivi, max 2 decimali)
export const priceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Prezzo non valido (max 2 decimali)')
  .transform((val) => new Decimal(val))
  .refine((val) => val.greaterThanOrEqualTo(0), 'Il prezzo deve essere positivo');

// Schema per quantità (positive, max 4 decimali)
export const quantitySchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, 'Quantità non valida (max 4 decimali)')
  .transform((val) => new Decimal(val))
  .refine((val) => val.greaterThan(0), 'La quantità deve essere maggiore di zero');

// Schema per aliquote IVA
export const vatRateSchema = z
  .string()
  .regex(/^0\.\d{1,4}$/, 'Aliquota IVA non valida')
  .transform((val) => new Decimal(val))
  .refine((val) => val.greaterThanOrEqualTo(0) && val.lessThanOrEqualTo(1), 
    'Aliquota deve essere tra 0 e 1');

// Schema per riga fattura
export const invoiceLineSchema = z.object({
  quantity: quantitySchema,
  unitPrice: priceSchema,
  vatRate: vatRateSchema,
});
```

---

## 2. 📸 IMMUTABILITÀ DEI DOCUMENTI (SNAPSHOT RULE)

### PRINCIPIO FONDAMENTALE

**Ogni documento fiscale (Preventivo, Ordine, DDT, Fattura) è una FOTOGRAFIA IMMUTABILE del momento in cui è stato generato.**

Se domani il prezzo di un prodotto cambia o un cliente aggiorna il suo indirizzo, i documenti già emessi devono continuare a mostrare i dati originali.

### ❌ ERRORE CRITICO - Design Sbagliato

```typescript
// ❌ MAI fare questo!
model InvoiceLine {
  id         String   @id
  invoiceId  String
  productId  String   // ❌ Solo il riferimento
  product    Product  @relation(fields: [productId], references: [id])
  quantity   Decimal  @db.Decimal(12, 4)
  // ❌ MANCANO: descrizione, prezzo unitario, aliquota IVA
}

// PROBLEMA: Se il prezzo del prodotto cambia, la fattura mostra il prezzo nuovo!
// PROBLEMA: Se il prodotto viene cancellato, la fattura non può più essere visualizzata!
```

**Perché è sbagliato:**
1. **Integrità storica violata**: I documenti passati cambiano quando cambiano i dati master
2. **Vincoli di foreign key**: Non puoi cancellare un prodotto referenziato da fatture
3. **Non conforme a normativa**: Le fatture devono essere immutabili per legge

### ✅ DESIGN CORRETTO - Snapshot dei Dati

```prisma
model InvoiceLine {
  id                  String   @id @default(cuid())
  invoiceId           String
  
  // SNAPSHOT COMPLETO del prodotto al momento della fattura
  productId           String?  // ✅ Riferimento opzionale (per statistiche/tracciabilità)
  productCode         String   // ✅ Codice articolo al momento della fattura
  description         String   // ✅ Descrizione al momento della fattura
  unitPrice           Decimal  @db.Decimal(12, 2) // ✅ Prezzo al momento della fattura
  quantity            Decimal  @db.Decimal(12, 4)
  vatRate             Decimal  @db.Decimal(5, 4)  // ✅ Aliquota IVA al momento della fattura
  
  // Campi calcolati (per performance e denormalizzazione)
  netAmount           Decimal  @db.Decimal(12, 2) // quantity * unitPrice
  vatAmount           Decimal  @db.Decimal(12, 2) // netAmount * vatRate
  grossAmount         Decimal  @db.Decimal(12, 2) // netAmount + vatAmount
  
  // Relazioni
  invoice             Invoice  @relation(fields: [invoiceId], references: [id])
  product             Product? @relation(fields: [productId], references: [id]) // Opzionale
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model Invoice {
  id                  String   @id @default(cuid())
  number              String   @unique // Numero fattura progressivo
  date                DateTime
  
  // SNAPSHOT COMPLETO del cliente al momento della fattura
  customerId          String?  // ✅ Riferimento opzionale
  customerName        String   // ✅ Ragione sociale al momento
  customerVatNumber   String   // ✅ P.IVA al momento
  customerFiscalCode  String?  // ✅ Codice Fiscale al momento
  customerAddress     String   // ✅ Indirizzo completo al momento
  customerCity        String
  customerProvince    String
  customerZip         String
  customerCountry     String   @default("IT")
  
  // Totali documento
  netTotal            Decimal  @db.Decimal(12, 2)
  vatTotal            Decimal  @db.Decimal(12, 2)
  grossTotal          Decimal  @db.Decimal(12, 2)
  
  // Metadati
  notes               String?  @db.Text
  paymentTerms        String?
  
  // Relazioni
  lines               InvoiceLine[]
  customer            Customer? @relation(fields: [customerId], references: [id])
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@index([number])
  @@index([date])
  @@index([customerId])
}
```

### Logica di Creazione Documento con Snapshot

```typescript
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/prisma';

/**
 * Crea una fattura da un ordine, facendo SNAPSHOT di tutti i dati
 * 
 * LOGICA DI BUSINESS:
 * 1. Recupera ordine con tutti i dati correlati
 * 2. Crea snapshot dei dati cliente (così se domani cambia indirizzo, la fattura resta uguale)
 * 3. Crea snapshot delle righe prodotto (così se domani cambia prezzo, la fattura resta uguale)
 * 4. Calcola tutti i totali con Decimal.js
 * 5. Genera numero fattura progressivo
 * 6. Salva tutto in transazione atomica
 */
export async function createInvoiceFromOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { 
      customer: true, 
      lines: { include: { product: true } } 
    }
  });
  
  if (!order) {
    throw new Error('Ordine non trovato');
  }
  
  if (!order.customer) {
    throw new Error('Cliente non associato all\'ordine');
  }
  
  // ✅ SNAPSHOT dei dati cliente (copia tutti i dati, non fare riferimento)
  const customerSnapshot = {
    customerId: order.customer.id,
    customerName: order.customer.businessName,
    customerVatNumber: order.customer.vatNumber,
    customerFiscalCode: order.customer.fiscalCode,
    customerAddress: order.customer.address,
    customerCity: order.customer.city,
    customerProvince: order.customer.province,
    customerZip: order.customer.zipCode,
    customerCountry: order.customer.country,
  };
  
  // ✅ SNAPSHOT delle righe prodotto con calcoli
  const linesSnapshot = order.lines.map(line => {
    const quantity = new Decimal(line.quantity.toString());
    const unitPrice = new Decimal(line.unitPrice.toString());
    const vatRate = new Decimal(line.vatRate.toString());
    
    const netAmount = quantity.mul(unitPrice).toDecimalPlaces(2);
    const vatAmount = netAmount.mul(vatRate).toDecimalPlaces(2);
    const grossAmount = netAmount.plus(vatAmount).toDecimalPlaces(2);
    
    return {
      productId: line.product?.id,
      productCode: line.product?.code || 'N/A',
      description: line.description, // Dal ordine, non dal prodotto!
      unitPrice: line.unitPrice,      // Dal ordine, non dal prodotto!
      quantity: line.quantity,
      vatRate: line.vatRate,          // Dal ordine, non dal prodotto!
      netAmount,
      vatAmount,
      grossAmount,
    };
  });
  
  // Calcola totali fattura
  const netTotal = linesSnapshot.reduce(
    (sum, line) => sum.plus(line.netAmount), 
    new Decimal(0)
  );
  const vatTotal = linesSnapshot.reduce(
    (sum, line) => sum.plus(line.vatAmount), 
    new Decimal(0)
  );
  const grossTotal = netTotal.plus(vatTotal);
  
  // Genera numero fattura progressivo
  const invoiceNumber = await generateInvoiceNumber();
  
  // ✅ Salva in transazione atomica
  return await prisma.invoice.create({
    data: {
      number: invoiceNumber,
      date: new Date(),
      ...customerSnapshot,
      netTotal,
      vatTotal,
      grossTotal,
      lines: { 
        create: linesSnapshot 
      },
    },
    include: {
      lines: true
    }
  });
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastInvoice = await prisma.invoice.findFirst({
    where: { number: { startsWith: `${year}/` } },
    orderBy: { number: 'desc' }
  });
  
  const lastNumber = lastInvoice 
    ? parseInt(lastInvoice.number.split('/')[1]) 
    : 0;
  
  return `${year}/${String(lastNumber + 1).padStart(5, '0')}`;
}
```

---

## 3. 📦 GESTIONE MAGAZZINO (CALCULATED STOCK)

### PRINCIPIO FONDAMENTALE

**La giacenza di magazzino NON è un campo statico, è un CALCOLO derivato dalla somma algebrica di tutti i movimenti.**

### ❌ ERRORE CRITICO - Campo Statico

```prisma
// ❌ MAI fare questo!
model Product {
  id       String  @id
  name     String
  stock    Int     // ❌ Campo statico = disallineamenti garantiti!
}

// PROBLEMI:
// 1. Se il DDT viene creato ma lo stock non viene aggiornato → disallineamento
// 2. Se una transazione fallisce a metà → stock inconsistente
// 3. Non c'è storico dei movimenti → impossibile audit
// 4. Non puoi sapere PERCHÉ lo stock è cambiato
```

### ✅ DESIGN CORRETTO - Stock Calcolato

```prisma
model Product {
  id              String          @id @default(cuid())
  code            String          @unique
  name            String
  description     String?         @db.Text
  
  // ❌ NESSUN campo 'stock' o 'quantity'!
  // La giacenza è CALCOLATA dalla tabella StockMovement
  
  // Dati di base prodotto
  price           Decimal         @db.Decimal(12, 2)
  vatRate         Decimal         @db.Decimal(5, 4)
  
  // Relazioni
  stockMovements  StockMovement[]
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@index([code])
}

model Warehouse {
  id              String          @id @default(cuid())
  code            String          @unique
  name            String
  address         String?
  
  stockMovements  StockMovement[]
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model StockMovement {
  id              String          @id @default(cuid())
  productId       String
  warehouseId     String
  
  // Quantità algebrica:
  // + per CARICHI (acquisti, resi da cliente, rettifiche in positivo)
  // - per SCARICHI (vendite, DDT, rettifiche in negativo)
  quantity        Decimal         @db.Decimal(12, 4)
  
  // Tipo movimento (enum)
  type            MovementType
  
  // Documento origine (opzionale, per tracciabilità)
  documentType    String?         // "DDT", "INVOICE", "PURCHASE_ORDER"
  documentId      String?
  documentNumber  String?
  
  // Metadati
  notes           String?         @db.Text
  userId          String?         // Chi ha fatto il movimento
  
  // Timestamp
  createdAt       DateTime        @default(now())
  
  // Relazioni
  product         Product         @relation(fields: [productId], references: [id])
  warehouse       Warehouse       @relation(fields: [warehouseId], references: [id])
  
  @@index([productId])
  @@index([warehouseId])
  @@index([createdAt])
  @@index([documentId])
}

enum MovementType {
  CARICO_INIZIALE       // Carico iniziale inventario
  CARICO_FORNITORE      // Acquisto da fornitore
  SCARICO_VENDITA       // Vendita con fattura
  SCARICO_DDT           // Scarico con DDT
  RETTIFICA_INVENTARIO  // Rettifica da inventario fisico
  RESO_CLIENTE          // Reso da cliente (carico)
  RESO_FORNITORE        // Reso a fornitore (scarico)
  TRASFERIMENTO_USCITA  // Trasferimento tra magazzini (uscita)
  TRASFERIMENTO_ENTRATA // Trasferimento tra magazzini (entrata)
}
```

### Calcolo Giacenza

```typescript
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/prisma';

/**
 * Calcola la giacenza attuale di un prodotto
 * 
 * LOGICA DI BUSINESS:
 * La giacenza è la somma algebrica di tutti i movimenti di magazzino:
 * - Movimenti positivi (carichi) aumentano la giacenza
 * - Movimenti negativi (scarichi) diminuiscono la giacenza
 * 
 * @param productId - ID del prodotto
 * @param warehouseId - ID del magazzino (opzionale, se omesso calcola su tutti i magazzini)
 * @returns Giacenza attuale come Decimal
 */
export async function getProductStock(
  productId: string, 
  warehouseId?: string
): Promise<Decimal> {
  const movements = await prisma.stockMovement.findMany({
    where: {
      productId,
      ...(warehouseId && { warehouseId }),
    },
  });
  
  // Somma algebrica di tutti i movimenti
  const stock = movements.reduce(
    (acc, movement) => acc.plus(new Decimal(movement.quantity.toString())),
    new Decimal(0)
  );
  
  return stock;
}

/**
 * Verifica se c'è giacenza sufficiente per uno scarico
 * 
 * @throws Error se giacenza insufficiente
 */
export async function checkStockAvailability(
  productId: string,
  warehouseId: string,
  requiredQuantity: Decimal
): Promise<void> {
  const currentStock = await getProductStock(productId, warehouseId);
  
  if (currentStock.lessThan(requiredQuantity)) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { code: true, name: true }
    });
    
    throw new Error(
      `Giacenza insufficiente per ${product?.code} - ${product?.name}. ` +
      `Disponibile: ${currentStock.toString()}, Richiesto: ${requiredQuantity.toString()}`
    );
  }
}

/**
 * Ottiene giacenze di tutti i prodotti raggruppate per magazzino
 */
export async function getStockReport(warehouseId?: string) {
  const movements = await prisma.stockMovement.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    include: {
      product: true,
      warehouse: true,
    },
  });
  
  // Raggruppa per prodotto e magazzino
  const stockMap = new Map<string, Map<string, Decimal>>();
  
  for (const movement of movements) {
    if (!stockMap.has(movement.productId)) {
      stockMap.set(movement.productId, new Map());
    }
    
    const warehouseMap = stockMap.get(movement.productId)!;
    const currentQty = warehouseMap.get(movement.warehouseId) || new Decimal(0);
    const newQty = currentQty.plus(new Decimal(movement.quantity.toString()));
    warehouseMap.set(movement.warehouseId, newQty);
  }
  
  return stockMap;
}
```

### Generazione Automatica Movimenti

```typescript
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/prisma';

/**
 * Crea un DDT e genera automaticamente i movimenti di magazzino
 * 
 * LOGICA DI BUSINESS:
 * Quando si crea un DDT:
 * 1. Verifica giacenza disponibile per ogni riga
 * 2. Crea il documento DDT
 * 3. Per ogni riga, crea un movimento di scarico in StockMovement
 * 4. Tutto in una transazione atomica (o tutto o niente)
 */
export async function createDeliveryNote(data: {
  customerId: string;
  warehouseId: string;
  lines: Array<{
    productId: string;
    quantity: Decimal;
    unitPrice: Decimal;
    vatRate: Decimal;
  }>;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verifica giacenze disponibili
    for (const line of data.lines) {
      await checkStockAvailability(
        line.productId, 
        data.warehouseId, 
        line.quantity
      );
    }
    
    // 2. Recupera dati customer e products per snapshot
    const customer = await tx.customer.findUnique({
      where: { id: data.customerId }
    });
    
    if (!customer) throw new Error('Cliente non trovato');
    
    // 3. Crea DDT con snapshot
    const ddtNumber = await generateDDTNumber(tx);
    
    const ddt = await tx.deliveryNote.create({
      data: {
        number: ddtNumber,
        date: new Date(),
        warehouseId: data.warehouseId,
        // Snapshot cliente
        customerId: customer.id,
        customerName: customer.businessName,
        customerAddress: customer.address,
        customerCity: customer.city,
        // ... altri campi
        lines: {
          create: await Promise.all(
            data.lines.map(async (line) => {
              const product = await tx.product.findUnique({
                where: { id: line.productId }
              });
              
              if (!product) throw new Error(`Prodotto ${line.productId} non trovato`);
              
              const netAmount = line.quantity.mul(line.unitPrice).toDecimalPlaces(2);
              const vatAmount = netAmount.mul(line.vatRate).toDecimalPlaces(2);
              const grossAmount = netAmount.plus(vatAmount).toDecimalPlaces(2);
              
              return {
                // Snapshot prodotto
                productId: product.id,
                productCode: product.code,
                description: product.name,
                unitPrice: line.unitPrice,
                quantity: line.quantity,
                vatRate: line.vatRate,
                netAmount,
                vatAmount,
                grossAmount,
              };
            })
          )
        }
      },
      include: { lines: true }
    });
    
    // 4. Per ogni riga, genera movimento di scarico magazzino
    for (const line of data.lines) {
      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          warehouseId: data.warehouseId,
          // ✅ Quantità NEGATIVA = scarico
          quantity: new Decimal(line.quantity.toString()).neg(),
          type: 'SCARICO_DDT',
          documentType: 'DDT',
          documentId: ddt.id,
          documentNumber: ddt.number,
          notes: `Scarico per DDT ${ddt.number}`,
        },
      });
    }
    
    return ddt;
  });
}

/**
 * Registra un carico merce da fornitore
 */
export async function createPurchaseReceipt(data: {
  supplierId: string;
  warehouseId: string;
  lines: Array<{
    productId: string;
    quantity: Decimal;
    unitPrice: Decimal;
  }>;
}) {
  return await prisma.$transaction(async (tx) => {
    const receipt = await tx.purchaseReceipt.create({
      data: {
        // ... dati documento
      }
    });
    
    // Per ogni riga, genera movimento di carico
    for (const line of data.lines) {
      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          warehouseId: data.warehouseId,
          // ✅ Quantità POSITIVA = carico
          quantity: line.quantity,
          type: 'CARICO_FORNITORE',
          documentType: 'PURCHASE_RECEIPT',
          documentId: receipt.id,
        },
      });
    }
    
    return receipt;
  });
}
```

---

## 4. 🇮🇹 VALIDAZIONE ITALIANA

### P.IVA Italiana (11 cifre numeriche)

```typescript
import { z } from 'zod';

/**
 * Validazione P.IVA italiana secondo algoritmo ufficiale
 * 
 * LOGICA:
 * - 11 cifre numeriche
 * - L'ultima cifra è un check digit calcolato con algoritmo specifico
 * - Cifre in posizione pari vengono raddoppiate
 * - Se il raddoppio > 9, si sottrae 9
 */
export const italianVatNumberSchema = z
  .string()
  .regex(/^\d{11}$/, 'P.IVA deve contenere esattamente 11 cifre')
  .refine(validateItalianVAT, 'P.IVA non valida');

export function validateItalianVAT(vat: string): boolean {
  // Verifica formato
  if (!/^\d{11}$/.test(vat)) return false;
  
  let sum = 0;
  
  // Somma le prime 10 cifre con algoritmo
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(vat[i]);
    
    // Le cifre in posizione dispari (1, 3, 5, 7, 9) vengono raddoppiate
    if (i % 2 === 1) {
      digit *= 2;
      // Se il raddoppio supera 9, sottrai 9
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
  }
  
  // Il check digit è calcolato in modo che la somma totale sia multiplo di 10
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit === parseInt(vat[10]);
}

// Esempio di utilizzo
try {
  const vat = italianVatNumberSchema.parse('12345678901');
  console.log('P.IVA valida:', vat);
} catch (error) {
  console.error('P.IVA non valida:', error);
}
```

### Codice Fiscale Italiano (16 caratteri)

```typescript
/**
 * Validazione Codice Fiscale italiano
 * 
 * Formato: 6 lettere + 2 numeri + 1 lettera + 2 numeri + 1 lettera + 3 numeri + 1 lettera
 * Esempio: RSSMRA80A01H501U
 */
export const italianFiscalCodeSchema = z
  .string()
  .regex(
    /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/,
    'Formato Codice Fiscale non valido'
  )
  .refine(validateItalianFiscalCode, 'Codice Fiscale non valido');

export function validateItalianFiscalCode(cf: string): boolean {
  if (cf.length !== 16) return false;
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cf)) return false;
  
  // Tabella conversione caratteri pari
  const evenMap: Record<string, number> = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
    'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
  };
  
  // Tabella conversione caratteri dispari
  const oddMap: Record<string, number> = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
  };
  
  let sum = 0;
  
  // Calcola checksum sui primi 15 caratteri
  for (let i = 0; i < 15; i++) {
    const char = cf[i];
    // Posizioni dispari (0, 2, 4...) usano oddMap
    sum += (i % 2 === 0) ? oddMap[char] : evenMap[char];
  }
  
  // Il carattere di controllo è la lettera corrispondente a sum % 26
  const checkChar = String.fromCharCode(65 + (sum % 26));
  
  return checkChar === cf[15];
}
```

### Schema Completo Anagrafica Italiana

```typescript
import { z } from 'zod';

/**
 * Schema Zod per anagrafiche clienti/fornitori italiani
 * 
 * REGOLE:
 * - Ragione sociale obbligatoria
 * - Almeno P.IVA o Codice Fiscale (uno dei due obbligatorio)
 * - Indirizzo completo con validazione CAP italiana
 * - Provincia 2 caratteri (es. MI, RM, NA)
 */
export const italianBusinessSchema = z.object({
  businessName: z
    .string()
    .min(2, 'Ragione sociale deve contenere almeno 2 caratteri')
    .max(255, 'Ragione sociale troppo lunga'),
  
  vatNumber: italianVatNumberSchema.optional(),
  
  fiscalCode: italianFiscalCodeSchema.optional(),
  
  address: z
    .string()
    .min(5, 'Indirizzo deve contenere almeno 5 caratteri'),
  
  city: z
    .string()
    .min(2, 'Città deve contenere almeno 2 caratteri'),
  
  province: z
    .string()
    .length(2, 'Provincia deve essere 2 caratteri (es. MI, RM, NA)')
    .regex(/^[A-Z]{2}$/, 'Provincia deve essere 2 lettere maiuscole'),
  
  zipCode: z
    .string()
    .regex(/^\d{5}$/, 'CAP deve contenere esattamente 5 cifre'),
  
  country: z
    .string()
    .length(2, 'Codice paese deve essere 2 caratteri (es. IT)')
    .default('IT'),
  
  email: z
    .string()
    .email('Email non valida')
    .optional(),
  
  pec: z
    .string()
    .email('PEC non valida')
    .optional(),
  
  phone: z
    .string()
    .optional(),
  
  sdiCode: z
    .string()
    .length(7, 'Codice SDI deve essere 7 caratteri')
    .optional(),
})
.refine(
  (data) => data.vatNumber || data.fiscalCode,
  {
    message: 'Inserire almeno P.IVA o Codice Fiscale',
    path: ['vatNumber'],
  }
);

// Type inference
export type ItalianBusiness = z.infer<typeof italianBusinessSchema>;

// Esempio di utilizzo
const customerData = {
  businessName: 'Acme S.r.l.',
  vatNumber: '12345678901',
  address: 'Via Roma, 123',
  city: 'Milano',
  province: 'MI',
  zipCode: '20100',
  country: 'IT',
  email: 'info@acme.it',
  pec: 'acme@pec.it',
  sdiCode: 'ABCDEFG',
};

try {
  const validated = italianBusinessSchema.parse(customerData);
  console.log('Dati validati:', validated);
} catch (error) {
  console.error('Errori di validazione:', error);
}
```

---

## 5. 🏢 MULTITENANT (ISOLAMENTO ORGANIZZAZIONI)

### PRINCIPIO FONDAMENTALE

**YottaErp è un sistema MULTITENANT: più aziende (organizzazioni) utilizzano la stessa istanza dell'applicazione con dati completamente isolati.**

Ogni organizzazione è totalmente indipendente dalle altre:
- Non può vedere i dati di altre organizzazioni
- Non può modificare i dati di altre organizzazioni
- Ha i propri utenti, clienti, prodotti, documenti, magazzini

### Architettura Multitenant

```
┌─────────────────────────────────────────────────────────┐
│                    YottaErp (Singola Istanza)           │
├─────────────────────────────────────────────────────────┤
│  Organization 1: Acme S.r.l.                            │
│  ├─ Users: Mario (OWNER), Luigi (USER)                  │
│  ├─ Customers: 150 clienti                              │
│  ├─ Products: 500 prodotti                              │
│  ├─ Invoices: 2.000 fatture                             │
│  └─ Warehouses: 2 magazzini                             │
├─────────────────────────────────────────────────────────┤
│  Organization 2: Beta S.p.A.                            │
│  ├─ Users: Anna (OWNER), Carlo (ADMIN), Giulia (USER)  │
│  ├─ Customers: 300 clienti                              │
│  ├─ Products: 1.200 prodotti                            │
│  ├─ Invoices: 5.000 fatture                             │
│  └─ Warehouses: 3 magazzini                             │
└─────────────────────────────────────────────────────────┘
```

### Schema Database

#### ❌ ERRORE: Tabella senza organizationId

```prisma
// ❌ SBAGLIATO: Prodotti condivisi tra tutte le organizzazioni
model Product {
  id       String  @id @default(cuid())
  code     String  @unique // ❌ Unico globalmente: conflitti garantiti!
  name     String
  price    Decimal @db.Decimal(12, 2)
}

// PROBLEMA:
// - Organization 1 crea prodotto con code "PROD001"
// - Organization 2 NON può creare prodotto con lo stesso codice
// - Organization 2 può vedere/modificare prodotti di Organization 1
```

#### ✅ DESIGN CORRETTO: Ogni tabella ha organizationId

```prisma
model Organization {
  id              String    @id @default(cuid())
  businessName    String    // Ragione sociale dell'azienda ERP
  vatNumber       String?   @unique
  
  // Subscription
  plan            String    @default("FREE") // FREE, BASIC, PREMIUM
  maxUsers        Int       @default(5)
  
  // Relazioni
  users           UserOrganization[]
  products        Product[]
  entities        Entity[]
  documents       Document[]
  warehouses      Warehouse[]
  stockMovements  StockMovement[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model UserOrganization {
  id              String       @id @default(cuid())
  userId          String       // ID utente (da NextAuth/Clerk)
  organizationId  String
  role            UserRole     @default(USER) // OWNER, ADMIN, USER, READONLY
  
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([userId, organizationId]) // Un utente può avere un solo ruolo per org
  @@index([userId])
  @@index([organizationId])
}

enum UserRole {
  OWNER       // Proprietario (accesso completo, gestione subscription)
  ADMIN       // Amministratore (quasi tutto, no billing)
  USER        // Utente standard (operazioni quotidiane)
  READONLY    // Solo lettura (report, visualizzazione)
}

// ✅ CORRETTO: Ogni prodotto appartiene a un'organizzazione
model Product {
  id              String       @id @default(cuid())
  
  // ✅ MULTITENANT: Ogni prodotto appartiene a un'organizzazione
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  code            String       // Codice articolo
  name            String
  price           Decimal      @db.Decimal(12, 2)
  
  stockMovements  StockMovement[]
  
  // ✅ Codice unico PER ORGANIZZAZIONE (non globalmente)
  @@unique([organizationId, code])
  
  // ✅ Indici sempre con organizationId per performance
  @@index([organizationId])
  @@index([organizationId, name])
}

// ✅ Lo stesso vale per TUTTE le tabelle
model Entity {
  id              String       @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  businessName    String
  vatNumber       String?
  
  @@unique([organizationId, vatNumber]) // P.IVA unica per organizzazione
  @@index([organizationId])
}

model Document {
  id              String       @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  number          String
  type            DocumentType
  
  @@unique([organizationId, number]) // Numero fattura unico per organizzazione
  @@index([organizationId])
  @@index([organizationId, type])
}

model Warehouse {
  id              String       @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  code            String
  name            String
  
  @@unique([organizationId, code])
  @@index([organizationId])
}

model StockMovement {
  id              String       @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  productId       String
  warehouseId     String
  quantity        Decimal      @db.Decimal(12, 4)
  
  @@index([organizationId])
  @@index([organizationId, productId])
  @@index([organizationId, warehouseId])
}
```

### Logica Applicativa: Row-Level Security

**REGOLA ASSOLUTA**: Ogni query DEVE filtrare per `organizationId`.

#### ❌ VULNERABILITÀ CRITICA

```typescript
// ❌ PERICOLOSISSIMO: Restituisce prodotti di TUTTE le organizzazioni!
export async function getProducts() {
  return await prisma.product.findMany();
  // Un utente di Organization 1 vede prodotti di Organization 2!
}

// ❌ PERICOLOSISSIMO: Nessun controllo organizzazione
export async function deleteProduct(productId: string) {
  return await prisma.product.delete({
    where: { id: productId }
  });
  // Un utente di Organization 1 può cancellare prodotti di Organization 2!
}
```

#### ✅ SICUREZZA CORRETTA

```typescript
/**
 * Context: Informazioni sull'utente autenticato e organizzazione corrente
 * 
 * DEVE essere passato a TUTTE le funzioni che accedono al database
 */
interface AuthContext {
  userId: string;           // ID utente autenticato
  organizationId: string;   // Organizzazione corrente
  role: UserRole;           // Ruolo utente in questa organizzazione
}

// ✅ Helper per ottenere il contesto (da NextAuth, Clerk, ecc.)
export async function getAuthContext(): Promise<AuthContext> {
  const session = await getServerSession();
  
  if (!session?.user) {
    throw new UnauthorizedError('Utente non autenticato');
  }
  
  // Recupera organizzazione corrente dalla sessione/cookie
  const organizationId = session.user.currentOrganizationId;
  
  if (!organizationId) {
    throw new Error('Nessuna organizzazione selezionata');
  }
  
  // Verifica che l'utente appartenga all'organizzazione
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId
      }
    }
  });
  
  if (!membership) {
    throw new ForbiddenError('Accesso negato a questa organizzazione');
  }
  
  return {
    userId: session.user.id,
    organizationId,
    role: membership.role
  };
}

// ✅ CORRETTO: Sempre filtrare per organizationId
export async function getProducts(ctx: AuthContext) {
  return await prisma.product.findMany({
    where: {
      organizationId: ctx.organizationId // ✅ Isolamento garantito!
    },
    orderBy: { name: 'asc' }
  });
}

// ✅ CORRETTO: Verifica appartenenza prima di modificare
export async function deleteProduct(ctx: AuthContext, productId: string) {
  // Verifica che il prodotto appartenga all'organizzazione corrente
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { organizationId: true }
  });
  
  if (!product) {
    throw new NotFoundError('Prodotto non trovato');
  }
  
  if (product.organizationId !== ctx.organizationId) {
    throw new ForbiddenError('Non puoi eliminare prodotti di altre organizzazioni');
  }
  
  // Verifica permessi ruolo
  if (ctx.role === 'READONLY') {
    throw new ForbiddenError('Non hai i permessi per eliminare prodotti');
  }
  
  return await prisma.product.delete({
    where: { id: productId }
  });
}

// ✅ CORRETTO: Create sempre con organizationId
export async function createProduct(ctx: AuthContext, data: CreateProductInput) {
  // Verifica permessi
  if (ctx.role === 'READONLY') {
    throw new ForbiddenError('Non hai i permessi per creare prodotti');
  }
  
  return await prisma.product.create({
    data: {
      ...data,
      organizationId: ctx.organizationId // ✅ Associa automaticamente all'organizzazione
    }
  });
}
```

### Server Actions con Multitenant

```typescript
// src/services/actions/product-actions.ts
'use server';

import { getAuthContext } from '@/lib/auth';
import { createProduct as createProductService } from '@/services/business/product-service';

/**
 * Server Action per creare un prodotto
 * 
 * MULTITENANT: Ottiene automaticamente l'organizzazione dal contesto
 */
export async function createProductAction(formData: FormData) {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();
    
    // 2. Valida input
    const validatedData = productSchema.parse({
      code: formData.get('code'),
      name: formData.get('name'),
      price: formData.get('price'),
    });
    
    // 3. ✅ Passa contesto al service (che filtrerà per organizationId)
    const product = await createProductService(ctx, validatedData);
    
    revalidatePath('/products');
    return { success: true, product };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { success: false, error: 'Non hai i permessi per questa operazione' };
    }
    return { success: false, error: 'Errore creazione prodotto' };
  }
}
```

### Cambio Organizzazione

Un utente può appartenere a più organizzazioni e cambiare tra esse:

```typescript
// src/services/actions/organization-actions.ts
'use server';

import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';

/**
 * Cambia l'organizzazione corrente dell'utente
 * 
 * SICUREZZA: Verifica che l'utente appartenga all'organizzazione richiesta
 */
export async function switchOrganization(organizationId: string) {
  const session = await getServerSession();
  
  if (!session?.user) {
    throw new UnauthorizedError('Utente non autenticato');
  }
  
  // Verifica membership
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId
      }
    },
    include: {
      organization: true
    }
  });
  
  if (!membership) {
    throw new ForbiddenError('Non hai accesso a questa organizzazione');
  }
  
  // Salva organizzazione corrente in cookie/sessione
  cookies().set('currentOrganizationId', organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 giorni
  });
  
  return {
    success: true,
    organization: membership.organization,
    role: membership.role
  };
}

/**
 * Ottiene lista di organizzazioni accessibili dall'utente
 */
export async function getUserOrganizations() {
  const session = await getServerSession();
  
  if (!session?.user) {
    throw new UnauthorizedError('Utente non autenticato');
  }
  
  return await prisma.userOrganization.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        select: {
          id: true,
          businessName: true,
          logoUrl: true,
          plan: true
        }
      }
    }
  });
}
```

### UI: Organization Switcher

```typescript
// src/components/common/OrganizationSwitcher.tsx
'use client';

import { useState, useEffect } from 'react';
import { switchOrganization, getUserOrganizations } from '@/services/actions/organization-actions';

export const OrganizationSwitcher = () => {
  const [organizations, setOrganizations] = useState([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  
  useEffect(() => {
    getUserOrganizations().then(setOrganizations);
  }, []);
  
  async function handleSwitch(orgId: string) {
    const result = await switchOrganization(orgId);
    if (result.success) {
      setCurrentOrgId(orgId);
      // Ricarica pagina per aggiornare tutti i dati
      window.location.reload();
    }
  }
  
  return (
    <select 
      value={currentOrgId || ''} 
      onChange={(e) => handleSwitch(e.target.value)}
    >
      {organizations.map(org => (
        <option key={org.organization.id} value={org.organization.id}>
          {org.organization.businessName} ({org.role})
        </option>
      ))}
    </select>
  );
};
```

### Testing Multitenant

```typescript
describe('Product Service (Multitenant)', () => {
  let org1: Organization;
  let org2: Organization;
  let user1Ctx: AuthContext;
  let user2Ctx: AuthContext;
  
  beforeEach(async () => {
    // Setup organizzazioni di test
    org1 = await prisma.organization.create({
      data: { businessName: 'Organization 1' }
    });
    
    org2 = await prisma.organization.create({
      data: { businessName: 'Organization 2' }
    });
    
    user1Ctx = { userId: 'user1', organizationId: org1.id, role: 'ADMIN' };
    user2Ctx = { userId: 'user2', organizationId: org2.id, role: 'ADMIN' };
  });
  
  it('should isolate products between organizations', async () => {
    // User 1 crea prodotto
    const product1 = await createProduct(user1Ctx, {
      code: 'PROD001',
      name: 'Product 1',
      price: new Decimal('100.00')
    });
    
    // User 2 crea prodotto con STESSO codice (ma in org diversa)
    const product2 = await createProduct(user2Ctx, {
      code: 'PROD001', // ✅ OK: codice unico per organizzazione
      name: 'Product 2',
      price: new Decimal('200.00')
    });
    
    // Verifica isolamento
    const org1Products = await getProducts(user1Ctx);
    const org2Products = await getProducts(user2Ctx);
    
    expect(org1Products).toHaveLength(1);
    expect(org1Products[0].id).toBe(product1.id);
    
    expect(org2Products).toHaveLength(1);
    expect(org2Products[0].id).toBe(product2.id);
  });
  
  it('should prevent cross-organization access', async () => {
    // User 1 crea prodotto
    const product = await createProduct(user1Ctx, {
      code: 'PROD001',
      name: 'Product 1',
      price: new Decimal('100.00')
    });
    
    // User 2 tenta di eliminare prodotto di User 1
    await expect(
      deleteProduct(user2Ctx, product.id)
    ).rejects.toThrow(ForbiddenError);
  });
});
```

### Checklist Multitenant

Quando crei una nuova feature, verifica:

- [ ] ✅ La tabella ha campo `organizationId`?
- [ ] ✅ Relazione `@relation` a `Organization` presente?
- [ ] ✅ `onDelete: Cascade` configurato? (se cancello org, cancello tutti i dati)
- [ ] ✅ Indice su `organizationId` presente per performance?
- [ ] ✅ Constraint `@@unique([organizationId, campo])` per unicità per org?
- [ ] ✅ Tutte le query filtrano per `organizationId`?
- [ ] ✅ Le funzioni accettano `AuthContext` come primo parametro?
- [ ] ✅ Verifiche di sicurezza implementate (controllo organizationId)?
- [ ] ✅ Test di isolamento tra organizzazioni presenti?

---

## 6. 📁 STRUTTURA CARTELLE (Next.js 14 + Prisma)

```
YottaErp/
├── prisma/
│   ├── schema.prisma           # Schema database con Decimal per valori monetari
│   ├── migrations/             # Migrazioni database
│   └── seed.ts                 # Seed iniziale per sviluppo
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── (auth)/            # Route group - Autenticazione
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/       # Route group - Dashboard principale
│   │   │   ├── customers/     # Gestione clienti
│   │   │   ├── products/      # Gestione prodotti
│   │   │   ├── invoices/      # Gestione fatture
│   │   │   ├── orders/        # Gestione ordini
│   │   │   ├── warehouse/     # Gestione magazzino
│   │   │   └── layout.tsx
│   │   ├── api/               # API routes (solo se necessario)
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   ├── common/            # Componenti riutilizzabili
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── Form/
│   │   └── features/          # Componenti specifici feature
│   │       ├── InvoiceForm.tsx
│   │       ├── ProductCard.tsx
│   │       ├── CustomerSelect.tsx
│   │       └── StockMovementList.tsx
│   ├── lib/
│   │   ├── prisma.ts          # ✅ MANDATORIO: Prisma client singleton
│   │   ├── auth.ts            # ✅ MANDATORIO: Helper autenticazione e AuthContext
│   │   ├── decimal-utils.ts   # ✅ MANDATORIO: Helper calcoli monetari con Decimal.js
│   │   └── validators.ts      # ✅ MANDATORIO: Validatori P.IVA/CF italiani
│   ├── schemas/               # ✅ MANDATORIO: Schemi Zod per validazione
│   │   ├── entity-schema.ts   # Schema per Customer, Supplier, Product
│   │   ├── document-schema.ts # Schema per Invoice, Order, DDT
│   │   └── common-schema.ts   # Schemi condivisi (decimalSchema, etc.)
│   ├── services/
│   │   ├── actions/           # ✅ MANDATORIO: Next.js Server Actions
│   │   │   ├── customer-actions.ts
│   │   │   ├── product-actions.ts
│   │   │   ├── invoice-actions.ts
│   │   │   ├── order-actions.ts
│   │   │   ├── stock-actions.ts
│   │   │   └── organization-actions.ts # ✅ MULTITENANT: Cambio organizzazione
│   │   └── business/          # Business logic pura (senza dipendenze Next.js)
│   │       ├── invoice-service.ts
│   │       ├── stock-service.ts
│   │       └── pricing-service.ts
│   ├── hooks/                 # Custom React hooks
│   │   ├── useCustomers.ts
│   │   ├── useProducts.ts
│   │   └── useDebounce.ts
│   ├── types/                 # TypeScript types globali
│   │   ├── index.ts
│   │   └── api.ts
│   ├── utils/                 # Utility generiche
│   │   ├── format.ts          # Formattazione date, valute, etc.
│   │   └── constants.ts       # Costanti globali
│   └── styles/                # Stili globali (se non usi Tailwind inline)
│       └── globals.css
├── public/                    # Assets statici
│   ├── images/
│   └── fonts/
├── .env                       # Variabili d'ambiente (NON committare!)
├── .env.example               # Template variabili d'ambiente
├── .gitignore
├── .cursorrules               # Regole per Cursor AI
├── REGOLE_DI_SVILUPPO.md     # Questo documento
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

### File Mandatori da Creare Subito

#### 1. `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

// Singleton pattern per Prisma Client
// In sviluppo, Next.js hot-reload può creare multiple istanze
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

#### 2. `src/lib/decimal-utils.ts`

```typescript
import { Decimal } from 'decimal.js';

// ✅ Configurazione globale arrotondamento fiscale
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

/**
 * Calcola IVA da importo netto
 */
export function calculateVAT(net: Decimal, rate: Decimal): Decimal {
  return net.mul(rate).toDecimalPlaces(2);
}

/**
 * Calcola importo lordo (netto + IVA)
 */
export function calculateGross(net: Decimal, rate: Decimal): Decimal {
  return net.plus(calculateVAT(net, rate)).toDecimalPlaces(2);
}

/**
 * Scorporo IVA da importo lordo
 */
export function extractVAT(gross: Decimal, rate: Decimal) {
  const divisor = new Decimal(1).plus(rate);
  const net = gross.div(divisor).toDecimalPlaces(2);
  const vat = gross.minus(net).toDecimalPlaces(2);
  return { net, vat };
}

/**
 * Conversione sicura a Decimal
 */
export function toDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value.toString());
}

/**
 * Formatta Decimal per visualizzazione valuta
 */
export function formatCurrency(value: Decimal, currency: string = '€'): string {
  return `${currency} ${value.toFixed(2)}`;
}
```

#### 3. `src/lib/validators.ts`

```typescript
/**
 * Validazione P.IVA italiana
 */
export function validateItalianVAT(vat: string): boolean {
  if (!/^\d{11}$/.test(vat)) return false;
  
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(vat[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(vat[10]);
}

/**
 * Validazione Codice Fiscale italiano
 */
export function validateItalianFiscalCode(cf: string): boolean {
  // Implementazione completa come sopra
  return cf.length === 16 && /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cf);
}
```

#### 3. `src/lib/validators.ts`

```typescript
/**
 * Validazione P.IVA italiana
 */
export function validateItalianVAT(vat: string): boolean {
  if (!/^\d{11}$/.test(vat)) return false;
  
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(vat[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(vat[10]);
}

/**
 * Validazione Codice Fiscale italiano
 */
export function validateItalianFiscalCode(cf: string): boolean {
  // Implementazione completa come sopra
  return cf.length === 16 && /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cf);
}
```

#### 4. `src/lib/auth.ts` (MULTITENANT)

```typescript
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

/**
 * Context autenticazione con organizationId
 */
export interface AuthContext {
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'USER' | 'READONLY';
}

/**
 * Ottiene il contesto autenticazione corrente
 * 
 * MULTITENANT: Include organizationId corrente
 */
export async function getAuthContext(): Promise<AuthContext> {
  const session = await getServerSession();
  
  if (!session?.user) {
    throw new Error('Non autenticato');
  }
  
  // Ottieni organizzazione corrente da cookie
  const organizationId = cookies().get('currentOrganizationId')?.value;
  
  if (!organizationId) {
    throw new Error('Nessuna organizzazione selezionata');
  }
  
  // Verifica membership
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId
      }
    }
  });
  
  if (!membership) {
    throw new Error('Accesso negato a questa organizzazione');
  }
  
  return {
    userId: session.user.id,
    organizationId,
    role: membership.role
  };
}
```

#### 5. `src/schemas/common-schema.ts`

```typescript
import { z } from 'zod';
import { Decimal } from 'decimal.js';

export const decimalSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Formato numerico non valido')
  .transform((val) => new Decimal(val));

export const priceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Prezzo non valido')
  .transform((val) => new Decimal(val))
  .refine((val) => val.greaterThanOrEqualTo(0), 'Il prezzo deve essere positivo');

export const quantitySchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, 'Quantità non valida')
  .transform((val) => new Decimal(val))
  .refine((val) => val.greaterThan(0), 'La quantità deve essere maggiore di zero');
```

---

# INGEGNERIA DEL SOFTWARE

## Database First

**PRINCIPIO**: Ogni nuova feature DEVE partire dallo `schema.prisma`. Non scrivere codice UI prima che il database sia allineato.

### Workflow Obbligatorio

```
1. ✅ Progetta schema database in prisma/schema.prisma
2. ✅ Crea migrazione: npx prisma migrate dev --name nome_feature
3. ✅ Genera Prisma Client: npx prisma generate
4. ✅ Crea Server Actions in services/actions/
5. ✅ Crea componenti UI che usano le Server Actions
```

**Mai saltare i passaggi o fare in ordine diverso!**

### Esempio Pratico

```prisma
// 1. PRIMA: Definisci schema
model Customer {
  id              String   @id @default(cuid())
  businessName    String
  vatNumber       String   @unique
  // ... altri campi
}
```

```bash
# 2. POI: Crea migrazione
npx prisma migrate dev --name add_customer_table
```

```typescript
// 3. INFINE: Usa tipi generati
import { Customer } from '@prisma/client';

export async function createCustomer(data: Omit<Customer, 'id'>): Promise<Customer> {
  // Prisma Client è già type-safe!
  return await prisma.customer.create({ data });
}
```

---

## Type-Safety Assoluta

**REGOLA**: Modalità strict di TypeScript SEMPRE attiva. VIETATO l'uso di `any`.

### tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Usa Tipi Generati da Prisma

```typescript
import { Customer, Product, Prisma } from '@prisma/client';

// ✅ CORRETTO: Usa tipi generati
type CustomerWithOrders = Prisma.CustomerGetPayload<{
  include: { orders: true }
}>;

// ✅ CORRETTO: Per input parziali
type CustomerCreateInput = Prisma.CustomerCreateInput;

// ❌ VIETATO: Ricreare manualmente i tipi
interface Customer {  // ❌ Prisma li genera già!
  id: string;
  name: string;
}
```

### Se Proprio Serve `unknown`

```typescript
// ✅ Se non conosci il tipo, usa unknown (non any)
function processData(data: unknown) {
  // Type guard prima di usare
  if (typeof data === 'string') {
    console.log(data.toUpperCase());
  }
}

// ✅ Zod per validare unknown a runtime
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

function createUser(data: unknown) {
  const validated = userSchema.parse(data); // Lancia errore se invalid
  // validated è type-safe qui!
}
```

---

## Regola delle 150 Righe

**PRINCIPIO**: Se un file supera le 150 righe, DEVE essere refactorato.

### Perché 150 Righe?

- ✅ File leggibile in una schermata
- ✅ Una sola responsabilità (Single Responsibility Principle)
- ✅ Facilita code review
- ✅ Riduce complessità cognitiva

### Esempio Refactoring

#### ❌ PRIMA: File troppo grande (250 righe)

```typescript
// services/invoice-service.ts (250 righe)
export async function createInvoice() {
  // 50 righe di validazione
  // 80 righe di calcoli IVA
  // 60 righe di salvataggio database
  // 60 righe di generazione PDF
}
```

#### ✅ DOPO: Separato in moduli

```typescript
// services/invoice/invoice-service.ts (80 righe)
import { validateInvoiceData } from './invoice-validator';
import { calculateInvoiceTotals } from './invoice-calculator';
import { saveInvoiceToDatabase } from './invoice-repository';
import { generateInvoicePDF } from './invoice-pdf-generator';

export async function createInvoice(data: InvoiceInput) {
  const validatedData = validateInvoiceData(data);
  const totals = calculateInvoiceTotals(validatedData);
  const invoice = await saveInvoiceToDatabase({ ...validatedData, ...totals });
  await generateInvoicePDF(invoice);
  return invoice;
}

// services/invoice/invoice-validator.ts (50 righe)
export function validateInvoiceData(data: unknown): ValidatedInvoiceData {
  // Solo validazione
}

// services/invoice/invoice-calculator.ts (60 righe)
export function calculateInvoiceTotals(data: ValidatedInvoiceData): InvoiceTotals {
  // Solo calcoli
}

// services/invoice/invoice-repository.ts (40 righe)
export async function saveInvoiceToDatabase(data: InvoiceData): Promise<Invoice> {
  // Solo salvataggio DB
}

// services/invoice/invoice-pdf-generator.ts (70 righe)
export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  // Solo generazione PDF
}
```

---

## Documentazione Anti-Amnesia

**PRINCIPIO**: Commenti JSDoc devono spiegare il "PERCHÉ" (logica di business), non il "COSA" (ovvio dal codice).

### ❌ Commenti Inutili

```typescript
// ❌ Commento che non aggiunge informazione
/**
 * Calcola il totale
 */
function calculateTotal(a: Decimal, b: Decimal): Decimal {
  return a.plus(b); // Ovvio dal codice!
}
```

### ✅ Documentazione Utile

```typescript
/**
 * Calcola l'IVA con lo scorporo, secondo la normativa italiana.
 * 
 * LOGICA DI BUSINESS:
 * Quando un cliente paga 122€ con IVA al 22%, dobbiamo calcolare:
 * - Imponibile = 122 / 1.22 = 100.00€
 * - IVA = 122 - 100 = 22.00€
 * 
 * L'arrotondamento ROUND_HALF_UP è obbligatorio per legge italiana.
 * Se si usa ROUND_DOWN, l'Agenzia delle Entrate può contestare la fattura!
 * 
 * @param grossAmount - Importo lordo (IVA inclusa)
 * @param vatRate - Aliquota IVA (es. 0.22 per 22%)
 * @returns Oggetto con imponibile e IVA separati
 * 
 * @see https://www.agenziaentrate.gov.it/...
 */
export function extractVAT(grossAmount: Decimal, vatRate: Decimal): {
  net: Decimal;
  vat: Decimal;
} {
  const divisor = new Decimal(1).plus(vatRate);
  const net = grossAmount.div(divisor).toDecimalPlaces(2);
  const vat = grossAmount.minus(net).toDecimalPlaces(2);
  return { net, vat };
}

/**
 * Rigenera la giacenza di magazzino da zero partendo dai movimenti.
 * 
 * QUANDO USARE:
 * - Dopo un import massivo di dati
 * - In caso di sospetta inconsistenza tra movimenti e giacenza
 * - Durante la chiusura di fine anno (inventario)
 * 
 * ATTENZIONE:
 * Questa operazione può richiedere diversi minuti per grandi quantità di dati.
 * Non eseguire durante l'orario di lavoro se il database ha >100k movimenti.
 * 
 * @param productId - ID del prodotto (ometti per rigenerare tutto il magazzino)
 * @returns Numero di prodotti processati
 */
export async function regenerateStock(productId?: string): Promise<number> {
  // ... implementazione
}
```

---

## Modularità

**PRINCIPIO**: Separa nettamente UI (Components) dalla logica (Server Actions e Business Logic).

### Architettura a Strati

```
┌─────────────────────────────────────┐
│  UI Layer (Client/Server Components) │
│  - InvoiceForm.tsx                   │
│  - ProductCard.tsx                   │
└──────────────┬──────────────────────┘
               │ chiama
┌──────────────▼──────────────────────┐
│  Server Actions Layer                │
│  - invoice-actions.ts                │
│  - product-actions.ts                │
│  (validazione Zod + chiamate service)│
└──────────────┬──────────────────────┘
               │ chiama
┌──────────────▼──────────────────────┐
│  Business Logic Layer                │
│  - invoice-service.ts                │
│  - stock-service.ts                  │
│  (logica pura, no dipendenze Next.js)│
└──────────────┬──────────────────────┘
               │ usa
┌──────────────▼──────────────────────┐
│  Data Access Layer                   │
│  - Prisma Client                     │
└─────────────────────────────────────┘
```

### Esempio Pratico

```typescript
// ❌ SBAGLIATO: Logica mista nel componente
'use client';

export function InvoiceForm() {
  async function handleSubmit() {
    // ❌ Validazione nel componente
    if (!data.customer) return;
    
    // ❌ Calcoli nel componente
    const total = data.lines.reduce((sum, line) => 
      sum + line.quantity * line.price, 0
    );
    
    // ❌ Chiamata diretta al database
    await prisma.invoice.create({ data: { total } });
  }
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

```typescript
// ✅ CORRETTO: Separazione a strati

// 1. Component (src/components/features/InvoiceForm.tsx)
'use client';

import { createInvoiceAction } from '@/services/actions/invoice-actions';

export function InvoiceForm() {
  async function handleSubmit(formData: FormData) {
    // Delega tutto alla Server Action
    const result = await createInvoiceAction(formData);
    
    if (result.success) {
      toast.success('Fattura creata');
    } else {
      toast.error(result.error);
    }
  }
  
  return <form action={handleSubmit}>...</form>;
}

// 2. Server Action (src/services/actions/invoice-actions.ts)
'use server';

import { invoiceSchema } from '@/schemas/document-schema';
import { createInvoice } from '@/services/business/invoice-service';

export async function createInvoiceAction(formData: FormData) {
  try {
    // Validazione con Zod
    const rawData = Object.fromEntries(formData);
    const validatedData = invoiceSchema.parse(rawData);
    
    // Delega business logic al service
    const invoice = await createInvoice(validatedData);
    
    revalidatePath('/invoices');
    return { success: true, invoice };
  } catch (error) {
    return { success: false, error: 'Errore creazione fattura' };
  }
}

// 3. Business Logic (src/services/business/invoice-service.ts)
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { calculateInvoiceTotals } from './invoice-calculator';

export async function createInvoice(data: ValidatedInvoiceData) {
  // Calcoli business (pura logica, riutilizzabile)
  const totals = calculateInvoiceTotals(data.lines);
  
  // Snapshot dei dati
  const customerSnapshot = await getCustomerSnapshot(data.customerId);
  
  // Salvataggio database
  return await prisma.invoice.create({
    data: {
      ...customerSnapshot,
      ...totals,
      lines: { create: data.lines }
    }
  });
}
```

---

## Convenzioni di Naming

### File e Directory
- **PascalCase** per componenti React: `UserProfile.tsx`, `InvoiceList.tsx`
- **kebab-case** per utility e service: `decimal-utils.ts`, `invoice-service.ts`
- **lowercase** per directory: `components/`, `services/`, `utils/`
- **Suffissi descrittivi**:
  - `*-actions.ts` per Server Actions
  - `*-service.ts` per Business Logic
  - `*-schema.ts` per schemi Zod
  - `*-utils.ts` per utility

### Variabili e Funzioni
```typescript
// camelCase per variabili e funzioni
const userName = "Mario";
const orderTotal = new Decimal('100.00');
function calculateTotal() {}
async function fetchCustomers() {}

// PascalCase per classi, interfacce, tipi, componenti
class UserService {}
interface UserData {}
type OrderStatus = 'pending' | 'completed';
export const Button: React.FC = () => {};

// UPPER_SNAKE_CASE per costanti
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_VAT_RATE = new Decimal('0.22');
const API_BASE_URL = process.env.API_URL;
```

### Naming Significativo
```typescript
// ❌ Nomi poco chiari
const d = new Date();
const temp = customers.filter(c => c.t === 'A');
function proc(data: any) {}

// ✅ Nomi auto-esplicativi
const currentDate = new Date();
const activeCustomers = customers.filter(c => c.status === 'ACTIVE');
function processInvoicePayment(invoice: Invoice) {}
```

---

## Principi di Codice

### Clean Code
- **Funzioni piccole**: Max 20-30 righe, un solo livello di astrazione
- **Nomi descrittivi**: Il codice deve leggere come prosa
- **DRY (Don't Repeat Yourself)**: Se copi lo stesso codice 3 volte, estrailo in una funzione
- **KISS (Keep It Simple, Stupid)**: La soluzione più semplice è spesso la migliore
- **YAGNI (You Aren't Gonna Need It)**: Non implementare funzionalità "per il futuro"
- **SOLID principles**: Specialmente Single Responsibility

### TypeScript Best Practices
```typescript
// ✅ Sempre tipizzare parametri e return types
function calculateDiscount(price: Decimal, percentage: number): Decimal {
  return price.mul(percentage).div(100);
}

// ✅ Usare interfacce per oggetti complessi
interface CreateInvoiceInput {
  customerId: string;
  date: Date;
  lines: InvoiceLine[];
}

// ✅ Type guards per type narrowing
function isInvoice(doc: Invoice | Order): doc is Invoice {
  return 'invoiceNumber' in doc;
}

// ✅ Generics per riutilizzabilità
function paginate<T>(items: T[], page: number, size: number): T[] {
  return items.slice(page * size, (page + 1) * size);
}
```

### Gestione Errori
```typescript
// ✅ Sempre gestire errori esplicitamente
try {
  const result = await createInvoice(data);
  return result;
} catch (error) {
  // Log strutturato
  logger.error('Errore creazione fattura', {
    customerId: data.customerId,
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  
  // Errore personalizzato con context
  throw new InvoiceCreationError('Impossibile creare fattura', {
    cause: error,
    customerId: data.customerId
  });
}

// ✅ Validazione input all'ingresso
function processInvoice(data: unknown) {
  // Valida PRIMA di elaborare
  const validated = invoiceSchema.parse(data);
  
  // Qui validated è type-safe
  return calculateTotals(validated);
}
```

### Async/Await
```typescript
// ✅ Preferire async/await a Promise chains
async function fetchInvoiceWithCustomer(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true }
  });
  
  if (!invoice) {
    throw new NotFoundError('Fattura non trovata');
  }
  
  return invoice;
}

// ✅ Promise.all per operazioni parallele
async function fetchDashboardData() {
  const [customers, products, recentInvoices] = await Promise.all([
    prisma.customer.count(),
    prisma.product.count(),
    prisma.invoice.findMany({ take: 10, orderBy: { date: 'desc' } })
  ]);
  
  return { customers, products, recentInvoices };
}

// ❌ Evitare async in loop
for (const product of products) {
  await updateProduct(product); // ❌ Lento!
}

// ✅ Usa Promise.all
await Promise.all(
  products.map(product => updateProduct(product))
);
```

---

## React Best Practices

### Componenti

```typescript
// ✅ Props interface con suffisso Props
interface InvoiceCardProps {
  invoice: Invoice;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

// ✅ Named export (non default)
export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onEdit,
  onDelete,
  className
}) => {
  return (
    <div className={className}>
      <h3>{invoice.number}</h3>
      {onEdit && <button onClick={onEdit}>Modifica</button>}
      {onDelete && <button onClick={onDelete}>Elimina</button>}
    </div>
  );
};

// ✅ Destructuring props per leggibilità
// ✅ Valori di default per props opzionali
```

### Server vs Client Components (Next.js 14)

```typescript
// ✅ Server Component (default, no 'use client')
// Usare per: fetch dati, SEO, performance
export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany();
  
  return (
    <div>
      <h1>Fatture</h1>
      <InvoiceList invoices={invoices} />
    </div>
  );
}

// ✅ Client Component (con 'use client')
// Usare per: interattività, useState, useEffect, eventi
'use client';

export const InvoiceForm = () => {
  const [formData, setFormData] = useState({});
  
  function handleSubmit() {
    // Gestione evento
  }
  
  return <form onSubmit={handleSubmit}>...</form>;
};
```

### Hooks

```typescript
// ✅ Custom hooks iniziano con 'use'
export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchCustomers().then(setCustomers).finally(() => setLoading(false));
  }, []);
  
  return { customers, loading };
}

// ✅ useMemo per calcoli costosi
const expensiveCalculation = useMemo(() => {
  return calculateInvoiceTotals(lines);
}, [lines]); // Solo quando lines cambia

// ✅ useCallback per funzioni passate a figli
const handleDelete = useCallback((id: string) => {
  deleteInvoice(id);
}, []); // Stabile tra render
```

---

## Testing

### Requisiti Minimi
- **Coverage 80%** per business logic critica (calcoli IVA, snapshot, stock)
- **Test per ogni feature** prima del merge
- **AAA pattern**: Arrange, Act, Assert
- **Test fast**: Test unitari < 100ms, integration < 1s

### Naming Convention

```typescript
describe('InvoiceService', () => {
  describe('createInvoice', () => {
    it('should create invoice with correct VAT calculation', async () => {
      // Arrange: Setup
      const orderData = createMockOrder();
      
      // Act: Execute
      const invoice = await createInvoice(orderData);
      
      // Assert: Verify
      expect(invoice.vatTotal).toBe(new Decimal('22.00'));
      expect(invoice.grossTotal).toBe(new Decimal('122.00'));
    });
    
    it('should throw error when customer not found', async () => {
      // Arrange
      const invalidData = { customerId: 'non-existent' };
      
      // Act & Assert
      await expect(createInvoice(invalidData)).rejects.toThrow('Cliente non trovato');
    });
    
    it('should create snapshot of customer data', async () => {
      // Arrange
      const order = await createMockOrder();
      const customerBefore = await prisma.customer.findUnique({ where: { id: order.customerId } });
      
      // Act
      const invoice = await createInvoice(order);
      
      // Change customer data
      await prisma.customer.update({
        where: { id: order.customerId },
        data: { businessName: 'New Name' }
      });
      
      // Assert: Invoice should still have old name (snapshot!)
      expect(invoice.customerName).toBe(customerBefore!.businessName);
      expect(invoice.customerName).not.toBe('New Name');
    });
  });
});
```

### Test Decimal.js

```typescript
import { Decimal } from 'decimal.js';

describe('Decimal calculations', () => {
  it('should calculate VAT correctly', () => {
    const net = new Decimal('100.00');
    const rate = new Decimal('0.22');
    const vat = calculateVAT(net, rate);
    
    // ✅ Usa .equals() per confrontare Decimal
    expect(vat.equals(new Decimal('22.00'))).toBe(true);
    
    // ❌ NON usare .toBe() con Decimal
    // expect(vat).toBe(new Decimal('22.00')); // Fallisce!
  });
});
```

---

## Documentazione

### JSDoc per Funzioni Complesse

Vedi sezione "Documentazione Anti-Amnesia" sopra.

### README

Ogni modulo/cartella importante deve avere un README:

```markdown
# Invoice Service

Gestisce la creazione e manipolazione delle fatture.

## Regole di Business

1. **Snapshot Rule**: I dati cliente e prodotto vengono copiati nella fattura
2. **VAT Calculation**: IVA calcolata con Decimal.js e ROUND_HALF_UP
3. **Numero Fattura**: Progressivo annuale formato YYYY/NNNNN

## Utilizzo

\`\`\`typescript
import { createInvoice } from './invoice-service';

const invoice = await createInvoice({
  customerId: 'cust_123',
  lines: [{ productId: 'prod_456', quantity: 2, ... }]
});
\`\`\`

## Test

\`\`\`bash
npm test invoice-service
\`\`\`
```

---

## Git e Versioning

### Branch Strategy

```
main/master     → Codice in produzione (protetto)
develop         → Branch di sviluppo principale
feature/*       → Nuove funzionalità (es. feature/invoice-pdf)
bugfix/*        → Fix di bug (es. bugfix/vat-calculation)
hotfix/*        → Fix urgenti su produzione (es. hotfix/critical-security)
release/*       → Preparazione release (es. release/v1.2.0)
```

### Commit Messages (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Tipi:**
- `feat`: Nuova funzionalità
- `fix`: Bug fix
- `docs`: Documentazione
- `style`: Formattazione (non cambia logica)
- `refactor`: Refactoring
- `test`: Test
- `chore`: Manutenzione, dipendenze

**Esempi:**

```
feat(invoices): add PDF generation for invoices

Implemented PDF generation using pdfmake library.
Includes company logo, customer data snapshot, and line items.

Closes #123

---

fix(vat): correct VAT calculation rounding

Changed from ROUND_DOWN to ROUND_HALF_UP to comply
with Italian fiscal regulations.

BREAKING CHANGE: Existing invoices may show different VAT amounts

---

docs(readme): update installation instructions

---

chore(deps): upgrade prisma to v5.8.0
```

### Pull Request

- **Titolo chiaro**: Descrivi COSA fa la PR
- **Descrizione dettagliata**: Spiega PERCHÉ serve
- **Link issue/ticket**: `Closes #123`, `Fixes #456`
- **Screenshot**: Per modifiche UI
- **Checklist**:
  ```markdown
  - [ ] Test passati
  - [ ] Documentazione aggiornata
  - [ ] Nessun `console.log` dimenticato
  - [ ] Segue regole ERP (Decimal, Snapshot, etc.)
  - [ ] Code review richiesta
  ```

---

## Security

### Best Practices

- **MAI committare secrets**: Usa `.env` (aggiunto a `.gitignore`)
- **Variabili d'ambiente**: Per DB, API keys, etc.
- **Validazione input**: SEMPRE con Zod server-side
- **SQL Injection**: Prisma protegge automaticamente (usa query parametrizzate)
- **XSS**: Next.js escapa automaticamente, ma attenzione a `dangerouslySetInnerHTML`
- **CSRF**: Next.js Server Actions hanno protezione integrata
- **Rate Limiting**: Implementare per API pubbliche
- **HTTPS**: Obbligatorio in produzione

### Esempio .env

```bash
# .env (NON committare!)
DATABASE_URL="postgresql://user:password@localhost:5432/yottaerp"
NEXTAUTH_SECRET="super-secret-key-change-me"
NEXTAUTH_URL="http://localhost:3000"

# .env.example (Committare questo!)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### GDPR e Dati Personali

- **Consenso esplicito** per trattamento dati
- **Right to be forgotten**: Implementare soft delete o anonymization
- **Data minimization**: Raccogliere solo dati necessari
- **Audit log**: Tracciare accessi a dati sensibili
- **Encryption at rest**: Per dati particolarmente sensibili

---

## Performance

### Frontend

```typescript
// ✅ Lazy loading componenti pesanti
const InvoicePDFViewer = dynamic(() => import('./InvoicePDFViewer'), {
  loading: () => <Spinner />,
  ssr: false // Non rendere server-side se non serve
});

// ✅ Virtualization per liste lunghe
import { useVirtualizer } from '@tanstack/react-virtual';

function ProductList({ products }: { products: Product[] }) {
  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map(item => (
        <ProductCard key={item.key} product={products[item.index]} />
      ))}
    </div>
  );
}

// ✅ React.memo per componenti puri
export const ProductCard = React.memo(({ product }: { product: Product }) => {
  return <div>{product.name}</div>;
});
```

### Backend

```typescript
// ✅ Query ottimizzate con Prisma
const invoices = await prisma.invoice.findMany({
  where: { customerId },
  include: { 
    lines: {
      select: { // Select solo campi necessari
        id: true,
        description: true,
        grossAmount: true
      }
    }
  },
  take: 20, // Pagination
  skip: page * 20,
  orderBy: { date: 'desc' }
});

// ✅ Indici database
// In schema.prisma:
model Invoice {
  // ...
  @@index([customerId]) // Per query WHERE customerId
  @@index([date])       // Per ordinamento/filtro date
  @@index([number])     // Per ricerca numero fattura
}

// ✅ Caching con Redis (per dati letti spesso)
import { redis } from '@/lib/redis';

async function getCustomer(id: string) {
  const cached = await redis.get(`customer:${id}`);
  if (cached) return JSON.parse(cached);
  
  const customer = await prisma.customer.findUnique({ where: { id } });
  await redis.set(`customer:${id}`, JSON.stringify(customer), 'EX', 3600); // 1 ora
  
  return customer;
}
```

---

## Code Review

### 🚨 CHECKLIST ERP MANDATORIA

Quando crei o revisioni codice, verifica:

- [ ] **✅ Decimal.js**: Tutti i valori monetari usano `Decimal`, MAI `number`
- [ ] **✅ Snapshot Rule**: I documenti copiano dati, non usano JOIN per dati storici
- [ ] **✅ Calculated Stock**: La giacenza è calcolata da `StockMovement`, non un campo
- [ ] **✅ Validazione Italiana**: P.IVA e CF validati con algoritmi corretti
- [ ] **✅ Arrotondamento**: Tutti i calcoli IVA usano `ROUND_HALF_UP`
- [ ] **✅ Multitenant**: Tabella ha `organizationId` e tutte le query lo filtrano
- [ ] **✅ AuthContext**: Funzioni accettano `AuthContext` e verificano organizationId
- [ ] **✅ Isolamento**: Test verificano isolamento tra organizzazioni
- [ ] **✅ Database First**: Lo schema Prisma è stato aggiornato prima del codice
- [ ] **✅ Type-Safe**: No `any`, strict mode attivo, tipi Prisma utilizzati
- [ ] **✅ File Size**: Nessun file supera 150 righe (o è giustificato)
- [ ] **✅ JSDoc**: Funzioni complesse hanno commenti che spiegano il "perché"
- [ ] **✅ Modularità**: UI separata da logica, Server Actions correttamente usate
- [ ] **✅ Testing**: Test per logica business critica presenti
- [ ] **✅ Security**: Nessun secret committato, input validato
- [ ] **✅ Performance**: Query ottimizzate, indici presenti se necessario

### Checklist Generale

- [ ] Codice leggibile e comprensibile
- [ ] Segue convenzioni di naming
- [ ] Nessun `console.log` dimenticato
- [ ] Gestione errori implementata
- [ ] Documentazione adeguata
- [ ] Test passati
- [ ] No regressioni
- [ ] Commit message descrittivo

### Cosa Evitare

❌ Codice commentato/debug  
❌ `console.log` in produzione  
❌ `any` in TypeScript  
❌ **`number` per valori monetari (USA `Decimal`!)**  
❌ **JOIN per dati storici in documenti (USA snapshot!)**  
❌ **Campo `stock` statico nel database (USA calculated stock!)**  
❌ **Query senza filtro `organizationId` (VULNERABILITÀ MULTITENANT!)**  
❌ **Tabelle senza campo `organizationId` (ERRORE ARCHITETTURALE!)**  
❌ Funzioni > 150 righe senza giustificazione  
❌ Duplicazione codice (DRY!)  
❌ Magic numbers (usa costanti)  
❌ Nomi variabili poco chiari (`temp`, `data`, `x`)  
❌ Mancanza di gestione errori  
❌ Logica business nei componenti UI  
❌ Query non ottimizzate (N+1 problem)

---

## 🔄 Aggiornamenti

Questo documento è vivo e deve essere aggiornato quando:
- Emergono nuovi pattern o best practices
- Il team decide nuove convenzioni
- Si adottano nuovi tool o tecnologie
- Si identificano problemi ricorrenti

**Ultimo aggiornamento:** 2026-02-01  
**Prossima revisione:** Trimestrale (Maggio 2026)

---

## 📞 Contatti e Supporto

Per domande o proposte di modifica a queste regole:
- **Team Lead**: [Nome]
- **Tech Lead**: [Nome]
- **Canale Slack**: #yottaerp-dev

**Processo di modifica regole:**
1. Apri issue su GitHub con proposta
2. Discussione nel team
3. Approvazione Tech Lead
4. Aggiornamento documento
5. Comunicazione a tutto il team

---

## 📚 Risorse Aggiuntive

### Documentazione Ufficiale
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Decimal.js Docs](https://mikemcl.github.io/decimal.js/)
- [Zod Docs](https://zod.dev/)

### Guide Interne
- [Setup Ambiente Sviluppo](./docs/setup.md)
- [Guida Deploy](./docs/deploy.md)
- [Troubleshooting Comuni](./docs/troubleshooting.md)

### Riferimenti Normativi
- [Agenzia delle Entrate - Fatturazione Elettronica](https://www.agenziaentrate.gov.it/portale/web/guest/schede/comunicazioni/fatture-e-corrispettivi)
- [Validazione P.IVA](https://ec.europa.eu/taxation_customs/vies/)

---

## 🎯 Priorità Progetto

1. **Sicurezza Multitenant** - Isolamento completo tra organizzazioni
2. **Correttezza Fiscale** - Calcoli monetari precisi con Decimal.js
3. **Integrità Dati** - Snapshot immutabili per documenti
4. **Correttezza Funzionale** - Il codice deve funzionare correttamente
5. **Leggibilità** - Deve essere comprensibile da altri sviluppatori
6. **Manutenibilità** - Deve essere facilmente modificabile
7. **Performance** - Deve essere efficiente
8. **Eleganza** - Deve essere pulito e ben strutturato

---

*Ricorda: Queste regole esistono per mantenere qualità e consistenza in un sistema ERP mission-critical che deve gestire dati fiscali accurati e conformi alla normativa italiana. In caso di dubbi, chiedi al team prima di procedere!*

---

**Versione:** 1.0.0  
**Data:** 2026-02-01  
**Autori:** Team YottaErp

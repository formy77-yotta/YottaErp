# Struttura dei report (stampa PDF)

Questo documento descrive come sono strutturati i **report PDF** in YottaErp: modelli di stampa, configurazione (config V2), pipeline di rendering modulare e flusso dal documento al PDF.

---

## 1. Cosa sono i report

- **Stampa PDF dei documenti** (preventivi, ordini, DDT, fatture, note di credito): layout grafico configurabile tramite **Modelli di stampa** (PrintTemplate). Ogni modello ha una **config** (JSON) in formato **V2** (baseLayout, sezioni, colori, tabella, stili condizionali).
- **Fattura Elettronica (XML FatturaPA)** ha un tracciato separato (vedi servizi dedicati).

---

## 2. Architettura

```
Organization
    ├── PrintTemplate (modelli di stampa)
    │       └── config: JSON (PrintTemplateConfigV2)
    │
    └── DocumentTypeConfig (tipi documento)
            └── templateId → PrintTemplate (opzionale)

Document
    ├── documentTypeId → DocumentTypeConfig
    ├── dati snapshot (cliente, totali, note)
    └── lines → DocumentLine
```

- Per generare il PDF si usa il template associato al tipo documento (o un default).
- I dati passano al renderer come **snapshot** (nessun accesso al DB nel motore PDF).
- La config è sempre in **formato modulare** (baseLayout, sezioni, colori, tabella). In lettura viene normalizzata con `parseTemplateConfigV2()` (default dove mancano campi).

---

## 3. Snapshot documento

Definiti in **`src/lib/pdf/document-snapshot.ts`**.

### DocumentSnapshot

| Campo | Descrizione |
|-------|-------------|
| `number`, `date`, `documentTypeDescription` | Identificativo e tipo |
| `customerNameSnapshot`, `customerVatSnapshot`, `customerAddressSnapshot` | Destinatario |
| `customerCity`, `customerProvince`, `customerZip`, `customerCountry` | Località |
| `netTotal`, `vatTotal`, `grossTotal` | Totali (stringhe per Decimal) |
| `notes`, `paymentTerms` | Opzionali |
| `lines` | DocumentLineSnapshot[] |

### DocumentLineSnapshot

| Campo | Descrizione |
|-------|-------------|
| `productCode`, `description` | Articolo |
| `unitPrice`, `quantity`, `vatRate` | Prezzi e quantità (stringhe) |
| `netAmount`, `vatAmount`, `grossAmount` | Importi riga |
| `productType` | Opzionale; usato per stili condizionali (es. `SERVICE`, `GOODS`) |

---

## 4. Configurazione modello (PrintTemplateConfigV2)

Schema Zod in **`src/lib/pdf/config-schema-v2.ts`**.

- **baseLayout**: `invoice-standard` | `invoice-modern` | `invoice-minimal` | `ddt-standard` | `ddt-minimal` | `order-standard`.
- **sections**: visibilità (showHeader, showRecipient, showTable, showTotals, showNotes, showFooter, showWatermark, showLogo).
- **header**: variant, logoPosition (left | center | right), showDate, colori opzionali.
- **table**: variant, **columns** (showSku, showDescription, showQuantity, showUnitPrice, showDiscount, showVatRate, showNetAmount, showVatAmount, showGrossAmount), **style** (headerColor, stripedRows, showBorders, fontSize).
- **conditionalStyles**: array di regole (target row/cell, condition, value, backgroundColor, color opzionale).
- **colors**: primary, secondary, text (hex).
- **customSections** (opzionale): per estensioni future.

Config salvata in DB viene sempre letta con **`parseTemplateConfigV2(config)`**: i campi mancanti sono sostituiti dai default dello schema.

---

## 5. Pipeline di rendering

1. **Config**: da DB (migrata a V2 se necessario) → `PrintTemplateConfigV2`.
2. **Layout**: `getLayoutComponent(config.baseLayout)` in **`src/lib/pdf/template-registry.ts`** restituisce il componente layout (InvoiceStandard, InvoiceModern, DDTMinimal, ecc.).
3. **Rendering**: **`src/lib/pdf/render-document.ts`**  
   - `renderDocumentPDF({ document, templateConfig, organization })` → `Blob` PDF.  
   - `generatePreviewURL(...)` → object URL per anteprima.
4. Il layout compone i **componenti** in `src/components/pdf/components/` (Header, RecipientBlock, Table, Totals, Footer) e riceve `document`, `config`, `organization`.

Nessun accesso al database nel renderer; tutto arriva da snapshot e config.

---

## 6. Component library e layout

- **Componenti** (`src/components/pdf/components/`): StandardHeader, StandardRecipient, StandardTable, StandardTotals, StandardFooter. Props tipizzate, formattazione italiana (date, decimali).
- **Layout** (`src/components/pdf/layouts/`): InvoiceStandardLayout, InvoiceModernLayout, DDTMinimalLayout. Compongono i componenti in base a `config.sections` e `config.baseLayout`.

---

## 7. UI modelli di stampa

- **Lista**: `/settings/templates` — elenco modelli, pulsante “Nuovo modello”.
- **Nuovo**: `/settings/templates/new` — **TemplateWizard** (4 step: layout, colori, sezioni, tabella) + **TemplatePreviewPdf** (anteprima live). Salvataggio con `createTemplateAction`.
- **Modifica**: `/settings/templates/[id]/edit` — stesso wizard con config iniziale (migrata a V2) + anteprima. Salvataggio con `updateTemplateAction`.

L’anteprima usa **TemplatePreviewPdf**: riceve la config (V1 o V2, migrata internamente), costruisce il layout dal registry e genera il PDF con `@react-pdf/renderer`.

---

## 8. File principali

| Ruolo | File |
|-------|------|
| Tipi snapshot | `src/lib/pdf/document-snapshot.ts` |
| Schema config V2 | `src/lib/pdf/config-schema-v2.ts` |
| Re-export e report blocks | `src/lib/pdf/schema.ts` |
| Component library PDF | `src/components/pdf/components/` (Header, Table, RecipientBlock, Totals, Footer) |
| Layout base | `src/components/pdf/layouts/` |
| Registry layout | `src/lib/pdf/template-registry.ts` |
| Pipeline rendering | `src/lib/pdf/render-document.ts` |
| Documento esempio | `src/components/features/templates/sample-document.ts` |
| Anteprima PDF (client) | `src/components/features/templates/TemplatePreviewPdf.tsx` |
| Wizard modelli | `src/components/features/templates/TemplateWizard.tsx` |
| Form modifica | `src/components/features/templates/EditTemplateForm.tsx` |
| AI config da prompt | `src/app/_actions/template-ai.ts` |
| Server actions | `src/services/actions/template-actions.ts` |
| Associazione tipo ↔ template | `DocumentTypeConfig.templateId` (Prisma) |

---

## 9. Multi-tenancy

PrintTemplate e DocumentTypeConfig hanno `organizationId`. La generazione PDF usa solo dati dell’organizzazione del documento e del template.

Per sicurezza e multi-tenancy: `MULTITENANT_REPORT.md`, `SECURITY_REPORT.md`.

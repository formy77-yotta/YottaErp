# PDF Component Library

Componenti riutilizzabili per generazione PDF con @react-pdf/renderer.

## Struttura

```
components/
├── Header/
│   ├── StandardHeader.tsx   (layout classico)
│   ├── ModernHeader.tsx    (layout moderno con barra colorata)
│   ├── MinimalHeader.tsx   (layout minimal)
│   └── types.ts
├── RecipientBlock/
│   ├── StandardRecipient.tsx
│   └── types.ts
├── Table/
│   ├── StandardTable.tsx   (configurabile con colonne)
│   ├── CompactTable.tsx   (layout compatto 3 colonne)
│   ├── DetailedTable.tsx  (layout con dettagli expanded)
│   └── types.ts
├── Totals/
│   └── StandardTotals.tsx
├── Footer/
│   └── StandardFooter.tsx
└── Watermark/
    └── Watermark.tsx
```

## Utilizzo

```typescript
import {
  StandardHeader,
  ModernHeader,
  StandardRecipient,
  StandardTable,
  CompactTable,
  DetailedTable,
  StandardTotals,
  StandardFooter,
  Watermark,
} from '@/components/pdf/components';

<StandardHeader
  organizationName="Acme Inc"
  title="Fattura"
  number="2025-001"
  date={new Date().toISOString()}
  config={{ logoPosition: 'left', showDate: true }}
/>

<StandardTable
  lines={documentLines}
  columns={{ showSku: true, showDescription: true, ... }}
  style={{ headerColor: '#1e40af', stripedRows: true, ... }}
/>

<StandardTotals
  netTotal="100.00"
  vatTotal="22.00"
  grossTotal="122.00"
/>
```

## Personalizzazione

Ogni componente accetta props tipizzate per personalizzare:

- Colori (hex)
- Visibilità elementi
- Posizionamento
- Stili condizionali (solo Table)

## Formattazione

Usa gli helper in `src/lib/pdf/format-utils.ts`:

- `formatDate()` – date in locale italiano
- `formatDecimalItalian()` – numeri con virgola decimale e punto migliaia
- `formatCurrency()` – valuta in euro (€ 1.234,56)
- `getContrastColor()` – colore testo per accessibilità su sfondo

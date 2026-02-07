# Build Check - Simulazione Vercel

Questo documento spiega come simulare localmente il build di Vercel per identificare errori prima del deploy.

## 🎯 Script Disponibili

### Type Checking

```bash
# Verifica solo i tipi TypeScript (veloce)
npm run type-check

# Verifica tipi in modalità watch (rileva errori mentre modifichi)
npm run type-check:watch
```

### Build Completo

```bash
# Build normale (usa cache)
npm run build

# Build con type check preliminare
npm run build:check

# Build pulito (simula Vercel - rimuove cache)
npm run build:vercel

# Build completamente pulito (rimuove anche cache node_modules)
npm run build:clean
```

### Pulizia Cache

```bash
# Rimuove solo .next
npm run clean

# Rimuove .next e node_modules/.cache
npm run clean:all
```

## 🔍 Come Usare

### Prima di Fare Commit

**Raccomandato**: Esegui sempre `npm run build:vercel` prima di fare commit:

```bash
npm run build:vercel
```

Questo comando:
1. ✅ Rimuove la cache `.next` (come fa Vercel)
2. ✅ Genera Prisma Client
3. ✅ Esegue type checking TypeScript rigoroso
4. ✅ Compila il progetto con Next.js

### Durante lo Sviluppo

Per verificare rapidamente errori di tipo:

```bash
npm run type-check
```

Oppure in modalità watch (rileva errori in tempo reale):

```bash
npm run type-check:watch
```

## ⚠️ Differenze tra Locale e Vercel

### Locale (sviluppo)
- Next.js può essere più permissivo con alcuni errori
- La cache può nascondere alcuni problemi
- TypeScript potrebbe non rilevare tutti gli errori
- Il pre-rendering può essere saltato o meno rigoroso

### Vercel (produzione)
- Build completamente pulito (nessuna cache)
- TypeScript checking rigoroso
- **Pre-rendering obbligatorio** di tutte le pagine (incluso `global-error.tsx`)
- Tutti gli errori bloccano il build
- Errori di pre-rendering bloccano il build anche se la pagina funziona in runtime

## 🛠️ Troubleshooting

### Errore: "Cannot read properties of null (reading 'useContext')" durante il build

**Problema**: Questo errore si verifica quando Next.js cerca di pre-renderizzare `global-error.tsx` durante il build. Anche se il componente è statico, Next.js cerca comunque di pre-renderizzarlo e questo può causare problemi con il context di React.

**Soluzione (Raccomandata)**: 
**Rimuovi completamente `src/app/global-error.tsx`** - è opzionale in Next.js e non è necessario per il funzionamento dell'applicazione. Gli errori possono essere gestiti con `error.tsx` nelle route specifiche.

**Perché rimuoverlo?**
- È opzionale in Next.js
- Viene sempre pre-renderizzato durante il build, anche se è un client component
- Può causare problemi con il context di React durante il pre-rendering
- `error.tsx` nelle route è sufficiente per gestire gli errori

**Se proprio devi tenerlo** (non raccomandato):
1. Assicurati che non usi React hooks (`useState`, `useEffect`, `useContext`, ecc.)
2. Non dipenda da provider o context esterni
3. Usa solo `window.location` invece di `router` per la navigazione
4. Aggiungi `export const dynamic = 'force-dynamic'` nel file stesso
5. Prefissa parametri non usati con `_` (es. `reset: _reset`)

**Nota**: Anche con queste precauzioni, `global-error.tsx` può ancora causare problemi durante il pre-rendering su Vercel. La soluzione migliore è rimuoverlo completamente.

### Build funziona in locale ma fallisce su Vercel

1. **Pulisci la cache**:
   ```bash
   npm run clean:all
   npm run build:vercel
   ```

2. **Verifica i tipi**:
   ```bash
   npm run type-check
   ```

3. **Controlla errori comuni**:
   - Import non utilizzati
   - Type mismatch (es. `string` vs `Decimal`)
   - Variabili non utilizzate
   - Problemi con `server-only` imports
   - `global-error.tsx` che causa errori durante il pre-rendering (rimuoverlo se non necessario)
   - Client components che usano `useContext` durante il pre-rendering

### Errori TypeScript non rilevati in locale

Assicurati di usare:
```bash
npm run type-check
```

Invece di fare affidamento solo su `npm run dev` che può essere più permissivo.

## 📝 Best Practices

1. **Sempre prima del commit**: `npm run build:vercel`
2. **Durante lo sviluppo**: `npm run type-check:watch` in un terminale separato
3. **Dopo modifiche importanti**: `npm run build:clean` per essere sicuri

## 🔗 Riferimenti

- [Next.js TypeScript](https://nextjs.org/docs/app/building-your-application/configuring/typescript)
- [Vercel Build Process](https://vercel.com/docs/concepts/builds-and-deployments/builds)

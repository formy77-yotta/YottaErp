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

### Vercel (produzione)
- Build completamente pulito (nessuna cache)
- TypeScript checking rigoroso
- Tutti gli errori bloccano il build

## 🛠️ Troubleshooting

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

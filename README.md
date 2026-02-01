# YottaErp - Sistema Gestionale ERP

Sistema ERP completo sviluppato con Next.js 14, TypeScript, Prisma e PostgreSQL, conforme alle normative fiscali italiane.

## 🏗️ Architettura

Il progetto segue rigorose regole architetturali ERP:

- **Gestione Fiscale**: Uso di `decimal.js` per tutti i calcoli monetari (MAI `number`)
- **Immutabilità Documenti**: Snapshot dei dati nelle fatture/DDT
- **Stock Calcolato**: Giacenza calcolata da movimenti, non campo statico
- **Validazione Italiana**: P.IVA e Codice Fiscale con algoritmi ufficiali

## 📚 Stack Tecnologico

### Frontend
- **Next.js 14** - App Router, Server Components, Server Actions
- **React 18** - Hooks moderni
- **TypeScript** - Strict mode
- **Tailwind CSS** - Styling
- **shadcn/ui** - Componenti UI

### Backend
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Database relazionale

### Librerie Core
- **decimal.js** - Calcoli monetari precisi (OBBLIGATORIO)
- **Zod** - Validazione schemi
- **React Hook Form** - Gestione form
- **date-fns** - Manipolazione date

## 🚀 Setup Progetto

### Prerequisiti

- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

### 1. Clona Repository

\`\`\`bash
git clone <repository-url>
cd YottaErp
\`\`\`

### 2. Installa Dipendenze

\`\`\`bash
npm install
\`\`\`

### 3. Configura Database

Copia `.env.example` in `.env` e configura la stringa di connessione PostgreSQL:

\`\`\`bash
cp .env.example .env
\`\`\`

Modifica `.env`:

\`\`\`env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/yottaerp?schema=public"
\`\`\`

### 4. Esegui Migrazioni Database

\`\`\`bash
# Crea il database e applica le migrazioni
npx prisma migrate dev --name init

# Genera Prisma Client
npx prisma generate
\`\`\`

### 5. (Opzionale) Seed Database

\`\`\`bash
npx prisma db seed
\`\`\`

### 6. Avvia Server Sviluppo

\`\`\`bash
npm run dev
\`\`\`

Apri [http://localhost:3000](http://localhost:3000) nel browser.

## 📁 Struttura Progetto

\`\`\`
YottaErp/
├── prisma/
│   ├── schema.prisma        # Schema database con Decimal per valori monetari
│   ├── migrations/          # Migrazioni database
│   └── seed.ts             # Seed dati iniziali
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/        # Route group autenticazione
│   │   ├── (dashboard)/   # Route group dashboard
│   │   └── layout.tsx
│   ├── components/
│   │   ├── common/        # Componenti riutilizzabili
│   │   ├── features/      # Componenti specifici feature
│   │   └── ui/            # Componenti shadcn/ui
│   ├── lib/
│   │   ├── prisma.ts      # ✅ Prisma client singleton
│   │   ├── decimal-utils.ts # ✅ Helper calcoli monetari
│   │   ├── validators.ts   # ✅ Validatori P.IVA/CF
│   │   └── utils.ts       # Utility generiche
│   ├── schemas/           # ✅ Schemi Zod per validazione
│   │   ├── common-schema.ts
│   │   ├── entity-schema.ts
│   │   └── document-schema.ts
│   └── services/
│       └── actions/       # ✅ Next.js Server Actions
├── .cursorrules           # Regole per Cursor AI
├── REGOLE_DI_SVILUPPO.md # Documentazione regole progetto
└── package.json
\`\`\`

## 🎯 Regole di Sviluppo

**LEGGI SEMPRE**: [REGOLE_DI_SVILUPPO.md](./REGOLE_DI_SVILUPPO.md)

### Regole Fondamentali

1. **MAI usare `number` per valori monetari** - Usa sempre `Decimal` da `decimal.js`
2. **Snapshot Rule** - I documenti devono copiare i dati, non referenziarli
3. **Calculated Stock** - La giacenza è calcolata, non memorizzata
4. **Database First** - Partire sempre da `schema.prisma`
5. **Type-Safety Assoluta** - TypeScript strict mode, no `any`
6. **File < 150 righe** - Refactoring obbligatorio oltre 150 righe

## 🔒 Sicurezza

- **MAI** committare il file `.env`
- Usare variabili d'ambiente per configurazioni sensibili
- Validazione input sempre server-side con Zod
- Rate limiting su API pubbliche

## 🧪 Testing

\`\`\`bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
\`\`\`

## 📝 Script Disponibili

\`\`\`bash
npm run dev          # Avvia server sviluppo
npm run build        # Build per produzione
npm run start        # Avvia server produzione
npm run lint         # Esegue ESLint
npm run type-check   # Verifica tipi TypeScript
\`\`\`

## 📦 Prisma Commands

\`\`\`bash
npx prisma studio              # Apri Prisma Studio (GUI database)
npx prisma migrate dev         # Crea nuova migrazione
npx prisma migrate deploy      # Applica migrazioni in produzione
npx prisma db push             # Sincronizza schema senza migrazioni
npx prisma db pull             # Introspect database esistente
npx prisma generate            # Genera Prisma Client
\`\`\`

## 🤝 Contribuire

1. Leggi [REGOLE_DI_SVILUPPO.md](./REGOLE_DI_SVILUPPO.md)
2. Crea un branch per la feature: `git checkout -b feature/nome-feature`
3. Commit seguendo Conventional Commits: `feat(invoices): add PDF generation`
4. Push e apri Pull Request

## 📄 Licenza

[Inserire licenza]

## 👥 Team

YottaCore S.r.l.

---

**Nota**: Questo progetto implementa un sistema ERP conforme alla normativa fiscale italiana. I calcoli IVA e la gestione documenti seguono rigorosi standard di precisione e immutabilità.

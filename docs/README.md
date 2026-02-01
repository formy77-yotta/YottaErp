# 📚 Documentazione YottaErp

Indice completo della documentazione del sistema ERP.

## 🎯 Quick Start

Se sei nuovo, inizia da qui:

1. **[SUPER_ADMIN_SETUP.md](../SUPER_ADMIN_SETUP.md)** - Guida setup iniziale
2. **[CHECKLIST_SETUP.md](../CHECKLIST_SETUP.md)** - Checklist verifiche
3. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Architettura sistema

## 📖 Documentazione Completa

### Gestione Organizzazioni (Super Admin)

- **[SUPER_ADMIN_ORGANIZATIONS.md](./SUPER_ADMIN_ORGANIZATIONS.md)**
  - Documentazione completa gestione organizzazioni
  - Server Actions API reference
  - Schema Zod reference
  - UI Components reference
  - Troubleshooting guide

### Regole di Sviluppo

- **[REGOLE_DI_SVILUPPO.md](../REGOLE_DI_SVILUPPO.md)**
  - Stack tecnologico
  - Regole architetturali ERP
  - Best practices TypeScript
  - Convenzioni naming
  - Git workflow

### Sicurezza

- **[SECURITY_REPORT.md](../SECURITY_REPORT.md)**
  - Report sicurezza sistema
  - Vulnerabilità note
  - Mitigazioni applicate

- **[prisma/SECURITY_RLS.md](../prisma/SECURITY_RLS.md)**
  - Row Level Security (RLS)
  - Policies PostgreSQL
  - Isolamento multitenant

### Migrazione Multitenant

- **[MULTITENANT_MIGRATION.md](../MULTITENANT_MIGRATION.md)**
  - Guida migrazione a multitenant
  - Step by step
  - Rollback strategy

## 🛠️ Scripts Utility

### Test e Verifica

```bash
# Test connessione database
npx tsx test-db-connection.ts

# Test RLS security
npx tsx test-rls-security.ts

# Test Super Admin
npx tsx scripts/test-super-admin.ts
```

### Prisma

```bash
# Genera client Prisma
npx prisma generate

# Esegui migrazioni
npx prisma migrate dev

# Apri Prisma Studio
npx prisma studio

# Reset database (ATTENZIONE!)
npx prisma migrate reset
```

### Development

```bash
# Avvia server development
npm run dev

# Build production
npm run build

# Start production
npm start

# Lint codice
npm run lint
```

## 📂 Struttura Progetto

```
YottaErp/
│
├── docs/                           # Documentazione
│   ├── README.md                   # Questo file
│   └── SUPER_ADMIN_ORGANIZATIONS.md
│
├── examples/                       # Esempi codice
│   ├── middleware-admin-protection.ts
│   └── access-denied-page.tsx
│
├── scripts/                        # Scripts utility
│   └── test-super-admin.ts
│
├── prisma/                         # Database
│   ├── schema.prisma
│   ├── migrations/
│   ├── SECURITY_RLS.md
│   └── seed.ts
│
├── src/                            # Codice sorgente
│   ├── app/                        # Next.js App Router
│   ├── components/                 # React components
│   ├── lib/                        # Utilities
│   ├── schemas/                    # Zod schemas
│   └── services/                   # Business logic
│
├── SUPER_ADMIN_SETUP.md            # Setup guide
├── CHECKLIST_SETUP.md              # Checklist
├── ARCHITECTURE.md                 # Architettura
├── REGOLE_DI_SVILUPPO.md           # Regole
├── SECURITY_REPORT.md              # Security
└── MULTITENANT_MIGRATION.md        # Migrazione
```

## 🎓 Learning Path

### 1. Nuovo Developer

Percorso consigliato per chi si unisce al progetto:

1. Leggi **[REGOLE_DI_SVILUPPO.md](../REGOLE_DI_SVILUPPO.md)**
2. Studia **[ARCHITECTURE.md](../ARCHITECTURE.md)**
3. Esegui **[CHECKLIST_SETUP.md](../CHECKLIST_SETUP.md)**
4. Sperimenta con **scripts/test-super-admin.ts**
5. Leggi codice in **src/app/(admin)/organizations/page.tsx**

### 2. Super Admin

Se devi gestire organizzazioni:

1. Leggi **[SUPER_ADMIN_SETUP.md](../SUPER_ADMIN_SETUP.md)**
2. Segui **[CHECKLIST_SETUP.md](../CHECKLIST_SETUP.md)**
3. Consulta **[SUPER_ADMIN_ORGANIZATIONS.md](./SUPER_ADMIN_ORGANIZATIONS.md)**

### 3. Security Expert

Se devi verificare sicurezza:

1. Leggi **[SECURITY_REPORT.md](../SECURITY_REPORT.md)**
2. Leggi **[prisma/SECURITY_RLS.md](../prisma/SECURITY_RLS.md)**
3. Esegui **test-rls-security.ts**
4. Review codice **src/lib/auth.ts**

### 4. Database Admin

Se devi gestire database:

1. Studia **prisma/schema.prisma**
2. Leggi **[MULTITENANT_MIGRATION.md](../MULTITENANT_MIGRATION.md)**
3. Consulta **prisma/SECURITY_RLS.md**
4. Usa **Prisma Studio** per visualizzare dati

## 🔍 Ricerca Rapida

### Come faccio a...

**...creare una nuova organizzazione?**
→ [SUPER_ADMIN_ORGANIZATIONS.md § Come Usare](./SUPER_ADMIN_ORGANIZATIONS.md#come-usare)

**...validare una P.IVA italiana?**
→ [REGOLE_DI_SVILUPPO.md § Validazione Italiana](../REGOLE_DI_SVILUPPO.md#validazione-italiana)

**...implementare una nuova feature?**
→ [REGOLE_DI_SVILUPPO.md § Principi di Codice](../REGOLE_DI_SVILUPPO.md#principi-di-codice)

**...proteggere una route?**
→ [examples/middleware-admin-protection.ts](../examples/middleware-admin-protection.ts)

**...gestire valori monetari?**
→ [REGOLE_DI_SVILUPPO.md § Gestione Fiscale](../REGOLE_DI_SVILUPPO.md#gestione-fiscale-e-numerica)

**...implementare snapshot documenti?**
→ [REGOLE_DI_SVILUPPO.md § Snapshot Rule](../REGOLE_DI_SVILUPPO.md#immutabilità-dei-documenti)

**...calcolare giacenza magazzino?**
→ [REGOLE_DI_SVILUPPO.md § Calculated Stock](../REGOLE_DI_SVILUPPO.md#gestione-magazzino)

## 📝 Convenzioni Documentazione

Quando aggiungi documentazione:

1. **Usa Markdown** con sintassi standard
2. **Titoli chiari** e gerarchici (H1 → H6)
3. **Code blocks** con syntax highlighting
4. **Esempi pratici** sempre inclusi
5. **Link interni** per riferimenti incrociati
6. **Emoji** per facilitare scansione visuale
7. **Diagrammi** quando utili (ASCII art o Mermaid)
8. **Checklist** per guide operative

## 🔄 Aggiornamenti

Questa documentazione viene aggiornata:

- ✅ Quando si aggiunge una nuova feature
- ✅ Quando si modifica architettura
- ✅ Quando si trovano bug/issue
- ✅ Quando si ricevono feedback utenti
- ✅ Mensilmente per review generale

## 🆘 Supporto

Se non trovi quello che cerchi:

1. **Cerca** in tutta la cartella `/docs`
2. **Consulta** gli esempi in `/examples`
3. **Esegui** gli script in `/scripts`
4. **Leggi** i commenti nel codice
5. **Chiedi** al team

## 📊 Statistiche Documentazione

- **File documentazione:** 8
- **Guide operative:** 3
- **Esempi codice:** 2
- **Scripts utility:** 3
- **Totale righe:** ~2,500+

---

**Mantenuta da:** YottaErp Development Team  
**Ultimo aggiornamento:** 2026-02-01  
**Versione:** 1.0.0

---

## 🎉 Contribuire

Per contribuire alla documentazione:

1. **Fork** del repository
2. **Aggiungi/Modifica** documentazione
3. **Verifica** markdown con linter
4. **Testa** eventuali esempi di codice
5. **Pull Request** con descrizione chiara

### Guidelines Contribuzione

- ✅ Scrivi in **italiano** (commenti codice in inglese ok)
- ✅ Usa **esempi pratici** e **screenshots** quando possibile
- ✅ Mantieni **stile consistente** con documentazione esistente
- ✅ Aggiungi **link** a questa pagina se crei nuovo file
- ✅ Aggiorna **indice** quando aggiungi sezioni

Grazie per contribuire a rendere YottaErp migliore! 🚀

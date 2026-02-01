# ✅ Checklist Setup Super Admin Organizations

Usa questa checklist per verificare che tutto sia configurato correttamente.

## 📋 Pre-requisiti

- [ ] Node.js installato (v18+)
- [ ] Database PostgreSQL configurato
- [ ] Prisma schema applicato (`npx prisma migrate dev`)
- [ ] Dipendenze installate (`npm install`)

## 🔧 Configurazione Iniziale

### 1. File di Configurazione

- [ ] Crea `.env.local` nella root del progetto
- [ ] Aggiungi `DATABASE_URL` con la tua stringa di connessione
- [ ] Aggiungi `SUPER_ADMIN_IDS` (user IDs separati da virgola)
- [ ] Aggiungi `DEV_BYPASS_AUTH=true` (SOLO per development!)

Esempio `.env.local`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/yottaerp"
SUPER_ADMIN_IDS="user_1,user_2"
DEV_BYPASS_AUTH="true"
```

⚠️ **IMPORTANTE SICUREZZA:**
- In development: `DEV_BYPASS_AUTH="true"` permette accesso senza autenticazione
- In production: RIMUOVI `DEV_BYPASS_AUTH` e usa user ID reali in `SUPER_ADMIN_IDS`
- Leggi `SECURITY_SUPER_ADMIN_SETUP.md` per dettagli completi

### 2. Verifica Database

- [ ] Esegui `npx prisma generate`
- [ ] Esegui `npx prisma migrate dev`
- [ ] Verifica tabella `Organization` creata
- [ ] Esegui test: `npx tsx scripts/test-super-admin.ts`

### 3. Test Connessione

Esegui lo script di test:
```bash
npx tsx scripts/test-super-admin.ts
```

Dovresti vedere:
- ✅ Connessione database OK
- ✅ Conteggio organizzazioni (0 o più)
- ✅ Statistiche globali

## 🔒 Sicurezza e Middleware

- [ ] Verifica che `src/middleware.ts` esista
- [ ] Verifica che `src/app/access-denied/page.tsx` esista
- [ ] Leggi `SECURITY_SUPER_ADMIN_SETUP.md` per configurazione completa
- [ ] Testa accesso senza autenticazione (dovrebbe redirect a /access-denied)
- [ ] Testa accesso con Super Admin (dovrebbe funzionare)

## 🚀 Avvio Applicazione

- [ ] Avvia il server: `npm run dev`
- [ ] Apri browser: `http://localhost:3000`
- [ ] Naviga a: `/organizations`

## 🧪 Test Funzionalità

### Test 1: Accesso Dashboard
- [ ] La pagina `/organizations` si carica senza errori
- [ ] Vedi le 4 cards statistiche in alto
- [ ] Vedi il pulsante "Nuova Organizzazione"
- [ ] Se nessuna org presente, vedi empty state

### Test 2: Creazione Organizzazione
- [ ] Clicca "Nuova Organizzazione"
- [ ] Si apre dialog modale con form
- [ ] Compila i campi:
  - Ragione Sociale: `Test S.r.l.`
  - P.IVA: `12345678901` (11 cifre qualsiasi per test)
  - Piano: `FREE`
- [ ] Clicca "Crea Organizzazione"
- [ ] Vedi toast notifica successo
- [ ] L'organizzazione appare nella tabella

### Test 3: Validazione P.IVA
- [ ] Crea nuova organizzazione
- [ ] Inserisci P.IVA invalida: `00000000000`
- [ ] Verifica errore validazione rosso sotto il campo
- [ ] Inserisci P.IVA duplicata (stessa del test 2)
- [ ] Verifica messaggio errore "P.IVA già presente"

### Test 4: Validazione Codice Fiscale
- [ ] Crea nuova organizzazione
- [ ] Inserisci CF: `RSSMRA80A01H501U`
- [ ] Verifica che accetti il formato corretto
- [ ] Inserisci CF invalido: `INVALID`
- [ ] Verifica errore validazione

### Test 5: Validazione Indirizzo
- [ ] Crea nuova organizzazione
- [ ] Compila solo "Indirizzo" senza città
- [ ] Tenta di salvare
- [ ] Verifica errore: "Devi compilare tutti i campi indirizzo"

### Test 6: Modifica Organizzazione
- [ ] Clicca icona matita (✏️) su un'organizzazione
- [ ] Si apre dialog con dati precompilati
- [ ] Modifica ragione sociale
- [ ] Clicca "Aggiorna Organizzazione"
- [ ] Verifica aggiornamento in tabella

### Test 7: Toggle Stato
- [ ] Usa lo switch "Attiva" su un'organizzazione
- [ ] Verifica cambio immediato
- [ ] Verifica toast notifica
- [ ] Riattiva l'organizzazione

### Test 8: Statistiche
- [ ] Verifica che le cards mostrino:
  - Totale organizzazioni
  - Organizzazioni attive
  - Utenti totali (se hai creato utenti)
  - Documenti totali
- [ ] Verifica badge conteggi nella tabella

## 🔒 Test Sicurezza (Opzionale)

### Test 9: Protezione Route
Se hai implementato il middleware:
- [ ] Crea file `src/middleware.ts` (vedi `examples/middleware-admin-protection.ts`)
- [ ] Imposta `NODE_ENV=production` nel `.env.local`
- [ ] Rimuovi il tuo userId da `SUPER_ADMIN_IDS`
- [ ] Riavvia server
- [ ] Tenta accesso a `/organizations`
- [ ] Verifica redirect a `/access-denied`

## 📊 Verifica Tabella Database

Usa Prisma Studio per verificare i dati:
```bash
npx prisma studio
```

- [ ] Apri tabella `Organization`
- [ ] Verifica record creati
- [ ] Verifica campi:
  - `businessName` popolato
  - `vatNumber` o `fiscalCode` popolato
  - `plan` = FREE/BASIC/PREMIUM
  - `active` = true/false
  - `createdAt` e `updatedAt` timestamp corretti

## 🐛 Troubleshooting

### Problema: Pagina non si carica
**Soluzione:**
- [ ] Verifica server in esecuzione (`npm run dev`)
- [ ] Controlla console browser (F12) per errori JavaScript
- [ ] Controlla console server per errori backend

### Problema: "Accesso negato"
**Soluzione:**
- [ ] Verifica `NODE_ENV=development` in `.env.local`
- [ ] In production, aggiungi userId in `SUPER_ADMIN_IDS`
- [ ] Riavvia server dopo modifiche `.env.local`

### Problema: Errore database
**Soluzione:**
- [ ] Verifica `DATABASE_URL` corretta
- [ ] Esegui `npx prisma migrate dev`
- [ ] Esegui `npx prisma generate`
- [ ] Verifica database in esecuzione

### Problema: P.IVA non valida non dà errore
**Soluzione:**
- [ ] Verifica file `src/lib/validators.ts` presente
- [ ] Verifica import in `src/schemas/organization-schema.ts`
- [ ] Controlla console per warning Zod

### Problema: Toast non appare
**Soluzione:**
- [ ] Toast appare per 5 secondi in alto a destra
- [ ] Controlla se coperto da altri elementi
- [ ] Verifica CSS Tailwind caricato

## 📚 File di Riferimento

Consulta questi file per maggiori dettagli:

- [ ] **Setup completo:** `SUPER_ADMIN_SETUP.md`
- [ ] **Documentazione:** `docs/SUPER_ADMIN_ORGANIZATIONS.md`
- [ ] **Esempio middleware:** `examples/middleware-admin-protection.ts`
- [ ] **Esempio access denied:** `examples/access-denied-page.tsx`
- [ ] **Script test:** `scripts/test-super-admin.ts`

## ✅ Completamento

Una volta completati tutti i test:

- [ ] Tutti i test funzionali passano ✅
- [ ] Validazioni P.IVA/CF funzionano ✅
- [ ] CRUD completo funziona ✅
- [ ] Statistiche corrette ✅
- [ ] UI responsive ✅
- [ ] Toast notifiche funzionano ✅

## 🎉 Prossimi Passi

Dopo aver completato la checklist:

1. **Proteggi le route** con middleware (opzionale ma consigliato)
2. **Crea organizzazioni reali** per il tuo ERP
3. **Aggiungi utenti** alle organizzazioni
4. **Inizia a usare** il sistema multitenant

## 💡 Tips

- In **development**, tutti sono Super Admin per facilitare testing
- In **production**, configura attentamente `SUPER_ADMIN_IDS`
- **Non eliminare** organizzazioni con documenti, disattivale
- **Backup database** prima di operazioni critiche
- Usa lo **script test** regolarmente per verificare integrità dati

---

**Congratulazioni! 🎉**

Se hai completato tutti i punti, il sistema Super Admin Organizations è pronto per la produzione!

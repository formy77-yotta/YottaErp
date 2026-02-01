# 🔐 Documentazione Sicurezza Database - YottaErp

## Panoramica

YottaErp utilizza **PostgreSQL su Supabase** con una strategia di sicurezza basata su **Row Level Security (RLS)** per proteggere i dati sensibili aziendali.

## Architettura Sicurezza

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (Next.js)                     │
│  - Componenti React                                          │
│  - NO accesso diretto al database                            │
└────────────────────┬────────────────────────────────────────┘
                     │ Chiama Server Actions
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Next.js Server Actions)             │
│  - Autenticazione/Autorizzazione applicativa                │
│  - Business Logic                                            │
│  - Usa Prisma con credenziali SERVICE_ROLE                   │
└────────────────────┬────────────────────────────────────────┘
                     │ Connection String Admin
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE PostgreSQL + RLS ABILITATO             │
│                                                              │
│  ✅ Prisma (service_role) → BYPASSA RLS → ACCESSO COMPLETO  │
│  ❌ API Pubbliche → BLOCCATE DA RLS → NESSUN ACCESSO        │
└─────────────────────────────────────────────────────────────┘
```

## 🛡️ Strategia RLS Implementata

### Migrazione: `20260201152812_enable_rls_security`

Questa migrazione implementa una **strategia "Deny All"** per bloccare completamente l'accesso pubblico tramite le API REST/GraphQL di Supabase.

#### Tabelle Protette

Tutte le 7 tabelle del sistema hanno RLS abilitato:

1. ✅ **Entity** - Anagrafiche clienti/fornitori
2. ✅ **VatRate** - Aliquote IVA
3. ✅ **Product** - Prodotti e servizi
4. ✅ **Warehouse** - Magazzini
5. ✅ **StockMovement** - Movimenti di magazzino
6. ✅ **Document** - Documenti commerciali (fatture, DDT, ordini, preventivi)
7. ✅ **DocumentLine** - Righe documento

#### Policy Applicate

Ogni tabella ha una policy denominata **"Deny All Public Access - [NomeTabella]"**:

```sql
CREATE POLICY "Deny All Public Access - Entity" 
  ON "Entity" 
  FOR ALL 
  USING (false);  -- ❌ NEGA SEMPRE l'accesso pubblico
```

**Cosa significa `USING (false)`?**
- La condizione `false` nega SEMPRE l'accesso
- Vale per: SELECT, INSERT, UPDATE, DELETE
- Blocca qualsiasi richiesta tramite API Supabase pubbliche

## 🔑 Come Funziona Prisma?

### Prisma BYPASSA RLS

Prisma usa la connection string con ruolo **`service_role`** (equivalente a `postgres` superuser) che:

- ✅ **Bypassa automaticamente RLS**
- ✅ Ha accesso completo a tutte le tabelle
- ✅ Può eseguire qualsiasi operazione CRUD

**Configurazione in `.env`:**

```env
# DIRECT_URL usa il ruolo service_role che bypassa RLS
DIRECT_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
```

### Perché è Sicuro?

1. **Prisma gira SOLO sul server** (Next.js Server Actions)
2. La connection string con credenziali admin **NON è mai esposta al browser**
3. Il frontend chiama Server Actions che:
   - Autenticano l'utente
   - Verificano i permessi
   - Eseguono business logic
   - Chiamano Prisma SOLO se autorizzato

## 🧪 Verifica Sicurezza

### 1. Verifica RLS su Supabase Dashboard

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Database → Tables → seleziona una tabella (es. `Entity`)
3. Tab **"RLS policies"**
4. Verifica che:
   - ✅ RLS sia **ENABLED** (interruttore verde in alto)
   - ✅ Esista policy: `Deny All Public Access - Entity`

### 2. Test API Pubbliche (DEVONO Fallire)

Prova a chiamare le API REST di Supabase:

```bash
# Sostituisci [YOUR-PROJECT-REF] e [YOUR-ANON-KEY]
curl https://[YOUR-PROJECT-REF].supabase.co/rest/v1/Entity \
  -H "apikey: [YOUR-ANON-KEY]" \
  -H "Authorization: Bearer [YOUR-ANON-KEY]"
```

**Risultato Atteso:**
```json
[]  // Array vuoto (RLS blocca l'accesso)
```

oppure:

```json
{
  "code": "PGRST200",
  "message": "..."
}
```

**⚠️ SE ricevi dati reali → RLS NON È CONFIGURATO CORRETTAMENTE!**

### 3. Test Prisma (DEVE Funzionare)

```bash
npx tsx test-db-connection.ts
```

**Risultato Atteso:**
```
✅ Connessione a Supabase riuscita!
📊 Informazioni database: [...]
```

## 🚀 Applicare la Migrazione

### Metodo 1: Via Prisma (RACCOMANDATO)

```bash
# Applica la migrazione al database
npx prisma migrate deploy

# Oppure in sviluppo:
npx prisma migrate dev
```

Prisma rileverà automaticamente la migrazione `20260201152812_enable_rls_security` e la applicherà.

### Metodo 2: Via SQL Editor di Supabase

Se preferisci applicare manualmente:

1. Vai su Supabase Dashboard → **SQL Editor**
2. Copia il contenuto di:
   ```
   prisma/migrations/20260201152812_enable_rls_security/migration.sql
   ```
3. Incolla nell'editor SQL
4. Clicca **"Run"**

### Verifica Applicazione

```bash
# Controlla che la migrazione sia applicata
npx prisma migrate status
```

**Output Atteso:**
```
Database schema is up to date!
```

## 🔮 Evoluzioni Future

### Scenario: Portale Clienti con Accesso Limitato

Se in futuro vorrai dare ai clienti accesso controllato ai loro dati (es. vedere le proprie fatture):

#### 1. Implementa Supabase Auth

```typescript
// Nel frontend
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Login cliente
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'cliente@example.com',
  password: 'password123',
});
```

#### 2. Aggiungi Colonna `user_id` alle Tabelle

```sql
ALTER TABLE "Document" ADD COLUMN user_id UUID REFERENCES auth.users(id);
```

#### 3. Modifica Policy per Accesso Controllato

```sql
-- Rimuovi policy Deny All
DROP POLICY "Deny All Public Access - Document" ON "Document";

-- Crea policy che permette accesso solo ai propri documenti
CREATE POLICY "Users can read own documents" 
  ON "Document" 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" 
  ON "Document" 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
```

#### 4. Multi-Tenancy: Accesso per Organizzazione

```sql
-- Aggiungi colonna organization_id
ALTER TABLE "Document" ADD COLUMN organization_id UUID;

-- Policy basata su appartenenza organizzazione
CREATE POLICY "Users can access organization documents" 
  ON "Document" 
  FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );
```

## 📚 Risorse

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Prisma + Supabase Guide](https://supabase.com/docs/guides/integrations/prisma)

## ⚠️ Checklist Sicurezza

Quando distribuisci in produzione, verifica:

- [ ] ✅ RLS abilitato su TUTTE le tabelle
- [ ] ✅ Policy "Deny All" applicate
- [ ] ✅ Credenziali `.env` NON committate su Git
- [ ] ✅ `DIRECT_URL` usa connection string con ruolo admin
- [ ] ✅ API pubbliche Supabase restituiscono array vuoto
- [ ] ✅ Prisma si connette senza errori
- [ ] ✅ Server Actions implementano autenticazione/autorizzazione
- [ ] ✅ Frontend NON ha accesso diretto a credenziali database
- [ ] ✅ HTTPS abilitato in produzione
- [ ] ✅ Rate limiting configurato su API Next.js

## 🆘 Troubleshooting

### Problema: Prisma non si connette dopo RLS

**Sintomo:** Errore "permission denied" da Prisma

**Causa:** Stai usando `anon` key invece di `service_role`

**Soluzione:** Verifica `.env`:
```env
# ❌ SBAGLIATO (usa anon key)
DIRECT_URL="postgresql://postgres.xxx:[ANON-KEY]@..."

# ✅ CORRETTO (usa password service_role)
DIRECT_URL="postgresql://postgres.xxx:[SERVICE-ROLE-PASSWORD]@..."
```

### Problema: API pubbliche ancora funzionano

**Sintomo:** GET /rest/v1/Entity restituisce dati

**Causa:** RLS non abilitato o policy non applicate

**Soluzione:**
```sql
-- Verifica RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- rowsecurity deve essere TRUE

-- Verifica policy
SELECT * FROM pg_policies WHERE schemaname = 'public';
-- Deve mostrare le policy "Deny All"
```

---

**Ultima revisione:** 2026-02-01  
**Versione migrazione RLS:** `20260201152812_enable_rls_security`

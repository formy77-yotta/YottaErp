# 🏢 Implementazione Multitenant - YottaErp

**Data:** 2026-02-01  
**Versione:** 2.0.0  
**Tipo modifica:** Breaking Change - Aggiunta supporto multitenant

---

## 📋 Sommario Modifiche

YottaErp è stato aggiornato per supportare **multitenant completo**. Ogni azienda (organizzazione) ha ora i propri dati completamente isolati.

### ✅ Cosa è Stato Fatto

#### 1. **Schema Database (prisma/schema.prisma)**
- ✅ Aggiunto modello `Organization` (rappresenta un'azienda che usa l'ERP)
- ✅ Aggiunto modello `UserOrganization` (associa utenti a organizzazioni con ruoli)
- ✅ Aggiunto enum `UserRole` (OWNER, ADMIN, USER, READONLY)
- ✅ Aggiunto campo `organizationId` a **TUTTE** le tabelle:
  - `Entity` (clienti/fornitori)
  - `Product` (prodotti)
  - `VatRate` (aliquote IVA)
  - `Warehouse` (magazzini)
  - `StockMovement` (movimenti magazzino)
  - `Document` (documenti commerciali)
- ✅ Aggiornati indici per includere `organizationId`
- ✅ Modificati constraint di unicità per essere per-organizzazione:
  - `Product.code` ora unico per organizzazione (non globalmente)
  - `Document.number` ora unico per organizzazione
  - `Entity.vatNumber` ora unico per organizzazione
  - `Warehouse.code` ora unico per organizzazione
  - `VatRate.name` ora unico per organizzazione

#### 2. **Codice Applicativo**

**Nuovi File Creati:**
- ✅ `src/lib/auth.ts` - Gestione autenticazione e AuthContext multitenant
  - `getAuthContext()` - Ottiene userId, organizationId, role
  - `requireRole()` - Verifica permessi
  - `verifyOrganizationAccess()` - Previene accesso cross-organization
  - Helper: `isOwner()`, `canWrite()`, ecc.

- ✅ `src/services/actions/organization-actions.ts` - Server Actions per organizzazioni
  - `switchOrganization()` - Cambio organizzazione
  - `getUserOrganizations()` - Lista organizzazioni accessibili
  - `createOrganization()` - Crea nuova organizzazione
  - `inviteUser()` - Invita utente in organizzazione
  - `removeUserFromOrganization()` - Rimuove utente

**File Aggiornati:**
- ✅ `src/services/actions/customer-actions.ts` - Aggiunto supporto multitenant
  - Tutte le funzioni ora usano `getAuthContext()`
  - Verifica automatica `organizationId`
  - Check permessi con `canWrite()`

#### 3. **Documentazione**

**Aggiornato: `REGOLE_DI_SVILUPPO.md`**
- ✅ Aggiunta sezione completa **"5. MULTITENANT (ISOLAMENTO ORGANIZZAZIONI)"**
  - Principi architetturali
  - Esempi di errori comuni e soluzioni corrette
  - Row-Level Security spiegata
  - Gestione AuthContext
  - Server Actions multitenant
  - Testing multitenant
  - Checklist completa

- ✅ Aggiornata checklist code review per includere verifiche multitenant
- ✅ Aggiornate priorità progetto (Sicurezza Multitenant al #1)

#### 4. **Migrazione Database**

- ✅ Creata migrazione `prisma/migrations/20260201_add_multitenant_support/migration.sql`
  - Crea tabelle `Organization` e `UserOrganization`
  - Aggiunge `organizationId` a tutte le tabelle
  - **GESTISCE DATI ESISTENTI**: Crea org di default e associa dati esistenti
  - Aggiorna tutti gli indici e constraint

---

## 🔧 Come Applicare le Modifiche

### 1. Aggiorna Prisma Client

```bash
npx prisma generate
```

### 2. Applica Migrazione Database

```bash
npx prisma migrate deploy
```

**NOTA IMPORTANTE**: Se hai già dati nel database, la migrazione:
1. Crea un'organizzazione chiamata "Organizzazione Predefinita"
2. Associa tutti i dati esistenti a questa organizzazione
3. Puoi rinominarla successivamente tramite dashboard

### 3. Verifica Migrazione

```bash
npx prisma studio
```

Controlla che:
- Tabella `Organization` esista e contenga almeno un record
- Tutte le tabelle abbiano il campo `organizationId` popolato

---

## 🚀 Come Usare il Multitenant nel Codice

### ✅ SEMPRE Usare AuthContext

```typescript
// ❌ SBAGLIATO - No filtro organizationId
export async function getProducts() {
  return await prisma.product.findMany();
}

// ✅ CORRETTO - Con AuthContext
import { getAuthContext } from '@/lib/auth';

export async function getProducts() {
  const ctx = await getAuthContext(); // Include organizationId
  
  return await prisma.product.findMany({
    where: { organizationId: ctx.organizationId } // ✅ Isolamento!
  });
}
```

### ✅ Verificare Permessi

```typescript
import { getAuthContext, canWrite, requireRole } from '@/lib/auth';

export async function deleteProduct(productId: string) {
  const ctx = await getAuthContext();
  
  // Verifica permessi di scrittura
  if (!canWrite(ctx)) {
    throw new Error('Non hai i permessi per eliminare prodotti');
  }
  
  // Oppure richiedi ruoli specifici
  requireRole(ctx, ['OWNER', 'ADMIN']);
  
  // Verifica che il prodotto appartenga all'organizzazione
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { organizationId: true }
  });
  
  verifyOrganizationAccess(ctx, product);
  
  // Ora puoi eliminare in sicurezza
  return await prisma.product.delete({
    where: { id: productId }
  });
}
```

### ✅ Creare Nuove Entità

```typescript
export async function createProduct(data: CreateProductInput) {
  const ctx = await getAuthContext();
  
  return await prisma.product.create({
    data: {
      ...data,
      organizationId: ctx.organizationId // ✅ Associa automaticamente
    }
  });
}
```

---

## 🧪 Testing

### Test Isolamento

```typescript
describe('Product Service (Multitenant)', () => {
  it('should isolate products between organizations', async () => {
    const org1 = await createTestOrganization('Org 1');
    const org2 = await createTestOrganization('Org 2');
    
    const ctx1 = { userId: 'user1', organizationId: org1.id, role: 'ADMIN' };
    const ctx2 = { userId: 'user2', organizationId: org2.id, role: 'ADMIN' };
    
    // Crea prodotto in org1
    await createProduct(ctx1, { code: 'PROD001', name: 'Product 1' });
    
    // Crea prodotto con STESSO codice in org2 (deve funzionare!)
    await createProduct(ctx2, { code: 'PROD001', name: 'Product 2' });
    
    // Verifica isolamento
    const org1Products = await getProducts(ctx1);
    const org2Products = await getProducts(ctx2);
    
    expect(org1Products).toHaveLength(1);
    expect(org2Products).toHaveLength(1);
    expect(org1Products[0].name).toBe('Product 1');
    expect(org2Products[0].name).toBe('Product 2');
  });
});
```

---

## ⚠️ Breaking Changes

### 1. **Tutte le query devono filtrare per organizationId**

Se hai codice esistente che fa query dirette a Prisma, **DEVI aggiornarlo**:

```typescript
// PRIMA (NON FUNZIONA PIÙ)
const products = await prisma.product.findMany();

// DOPO (CORRETTO)
const ctx = await getAuthContext();
const products = await prisma.product.findMany({
  where: { organizationId: ctx.organizationId }
});
```

### 2. **Unicità cambiata**

Ora questi campi sono unici **per organizzazione**, non globalmente:
- `Product.code`
- `Document.number`
- `Entity.vatNumber`
- `Warehouse.code`
- `VatRate.name`

Due organizzazioni possono avere prodotti/documenti/clienti con lo stesso codice/numero.

### 3. **Server Actions richiedono AuthContext**

Tutte le Server Actions ora chiamano `getAuthContext()` all'inizio.

---

## 📚 Prossimi Passi

### TODO Immediati

- [ ] Implementare UI per Organization Switcher (componente dropdown)
- [ ] Implementare pagina di gestione organizzazione (/settings/organization)
- [ ] Implementare pagina di gestione team (/settings/team)
- [ ] Integrare con NextAuth o Clerk per autenticazione reale
- [ ] Implementare inviti utente via email
- [ ] Aggiungere gestione subscription/billing per organizzazioni
- [ ] Implementare export dati per organizzazione

### TODO Futuri

- [ ] Audit log per tracciare modifiche cross-organizzazione (se admin di sistema)
- [ ] Dashboard amministrazione multi-org (super admin)
- [ ] Limiti per piano (FREE: 500 fatture/anno, ecc.)
- [ ] Backup automatici per organizzazione
- [ ] Analytics per organizzazione

---

## 🆘 Supporto e Domande

Per domande sull'implementazione multitenant:
1. Consulta `REGOLE_DI_SVILUPPO.md` sezione 5
2. Vedi esempi in `src/services/actions/customer-actions.ts`
3. Vedi helper in `src/lib/auth.ts`
4. Apri issue su GitHub se serve aiuto

---

## 🔐 Checklist Sicurezza Multitenant

Prima di fare merge/deploy, verifica:

- [ ] ✅ Ogni tabella ha `organizationId`
- [ ] ✅ Ogni query filtra per `organizationId`
- [ ] ✅ Ogni Server Action chiama `getAuthContext()`
- [ ] ✅ Verifiche permessi implementate (`canWrite`, `requireRole`)
- [ ] ✅ Verifiche cross-organization (`verifyOrganizationAccess`)
- [ ] ✅ Test di isolamento presenti e passanti
- [ ] ✅ Indici su `organizationId` per performance
- [ ] ✅ Foreign key con `onDelete: Cascade` per cleanup automatico

---

**Versione:** 2.0.0  
**Data Rilascio:** 2026-02-01  
**Breaking Changes:** Sì - Richiede aggiornamento tutto il codice esistente

# Gestione Super Admin Organizations - Documentazione

## 📋 Panoramica

Implementazione completa del pannello Super Admin per la gestione delle organizzazioni nel sistema ERP YottaErp.

## 🏗️ Struttura Implementata

### 1. Schema Validazione Zod
**File:** `src/schemas/organization-schema.ts`

- ✅ Validazione P.IVA italiana con algoritmo checksum
- ✅ Validazione Codice Fiscale italiano con algoritmo checksum
- ✅ Validazione campi italiani (CAP, provincia, ecc.)
- ✅ Regola: almeno P.IVA o Codice Fiscale obbligatorio
- ✅ Validazione indirizzo completo (se presente uno, tutti obbligatori)
- ✅ Supporto piani: FREE, BASIC, PREMIUM

### 2. Server Actions
**File:** `src/services/actions/organization-actions.ts`

Aggiunte le seguenti funzioni Super Admin:

#### `isSuperAdmin()`
Verifica se l'utente è Super Admin.
- **Nota:** Attualmente usa `SUPER_ADMIN_IDS` da `.env` o permette tutti in development
- **TODO futuro:** Implementare con tabella `SuperAdmins` o campo in auth

#### `getOrganizations()`
Recupera TUTTE le organizzazioni con conteggi.
- **Permessi:** Solo Super Admin
- **Return:** Lista organizzazioni con conteggi (utenti, clienti, prodotti, documenti)

#### `createOrganizationAdmin(data)`
Crea una nuova organizzazione.
- **Permessi:** Solo Super Admin
- **Validazioni:**
  - Almeno P.IVA o Codice Fiscale obbligatorio
  - P.IVA unica (unique constraint)
- **Errori gestiti:** P.IVA duplicata

#### `updateOrganizationAdmin(id, data)`
Aggiorna un'organizzazione esistente.
- **Permessi:** Solo Super Admin
- **Validazioni:**
  - Verifica esistenza organizzazione
  - P.IVA unica se modificata
- **Errori gestiti:** P.IVA duplicata, organizzazione non trovata

#### `toggleOrganizationStatus(id, active)`
Attiva/Disattiva un'organizzazione.
- **Permessi:** Solo Super Admin
- **Nota:** Disattivare blocca l'accesso a TUTTI gli utenti dell'organizzazione

#### `deleteOrganization(id)` 
Elimina un'organizzazione (CASCADE).
- **Permessi:** Solo Super Admin
- **Protezione:** Impedisce eliminazione se ci sono documenti
- **Consiglio:** Disattivare invece di eliminare

### 3. Componente Form
**File:** `src/components/features/admin/OrganizationForm.tsx`

Form riutilizzabile per creazione/modifica organizzazioni.

**Caratteristiche:**
- ✅ Integrazione react-hook-form + Zod
- ✅ Validazione real-time client-side
- ✅ Gestione errori da server (es. P.IVA duplicata)
- ✅ Supporto creazione e modifica con stesso componente
- ✅ UI organizzata in sezioni logiche:
  - Dati Azienda (Ragione sociale, P.IVA, CF, Piano, Limiti)
  - Indirizzo Sede Legale
  - Contatti (Email, PEC, Telefono, SDI)
- ✅ Formattazione automatica (maiuscole per CF, provincia, SDI)
- ✅ Limitazioni lunghezza campi (P.IVA 11, CF 16, ecc.)

### 4. Pagina Admin
**File:** `src/app/(admin)/organizations/page.tsx`

Dashboard completa per gestione organizzazioni.

**Funzionalità:**
- ✅ **Cards Statistiche:**
  - Totale organizzazioni / attive
  - Utenti totali
  - Documenti totali
  - Media utenti per organizzazione

- ✅ **DataTable con:**
  - Nome organizzazione + email
  - P.IVA e Codice Fiscale
  - Località (città, provincia)
  - Piano sottoscrizione (badge colorato)
  - Conteggi: Utenti, Clienti, Prodotti, Documenti
  - Limiti (es. 5/10 utenti, 150/500 fatture)
  - Switch attiva/disattiva
  - Pulsante modifica

- ✅ **Dialog modale:**
  - Creazione nuova organizzazione
  - Modifica organizzazione esistente
  - Form integrato con validazione

- ✅ **Toast notifiche:**
  - Successo operazioni
  - Errori (es. P.IVA duplicata)

- ✅ **Stati UI:**
  - Loading con spinner
  - Empty state con CTA
  - Error state con retry

### 5. Componenti UI (shadcn/ui)
Creati manualmente i componenti mancanti:

- `src/components/ui/dialog.tsx` - Modale
- `src/components/ui/select.tsx` - Select dropdown
- `src/components/ui/switch.tsx` - Toggle switch
- `src/components/ui/textarea.tsx` - Textarea

## 🔐 Configurazione Super Admin

### Opzione 1: Variabile d'ambiente (Attuale)
Aggiungi nel tuo `.env.local`:

```env
SUPER_ADMIN_IDS=user_123,user_456,user_789
NODE_ENV=production
```

**Nota:** In `development`, TUTTI gli utenti sono considerati Super Admin per facilitare testing.

### Opzione 2: Tabella Database (Futuro)
Creare una tabella `SuperAdmin`:

```prisma
model SuperAdmin {
  id        String   @id @default(cuid())
  userId    String   @unique
  createdAt DateTime @default(now())
}
```

## 🚀 Come Usare

### 1. Accedere alla Dashboard
Naviga su: `/organizations`

**Route Group:** `(admin)` - da proteggere con middleware auth

### 2. Creare una Nuova Organizzazione
1. Clicca "Nuova Organizzazione"
2. Compila i campi obbligatori:
   - Ragione sociale *
   - P.IVA O Codice Fiscale * (almeno uno)
   - Piano di sottoscrizione *
3. Opzionalmente compila:
   - Indirizzo completo
   - Contatti (email, PEC, telefono)
   - Codice SDI per fatturazione elettronica
4. Imposta limiti:
   - Max utenti
   - Max fatture/anno
5. Clicca "Crea Organizzazione"

### 3. Modificare un'Organizzazione
1. Clicca l'icona matita (✏️) nella riga dell'organizzazione
2. Modifica i campi desiderati
3. Clicca "Aggiorna Organizzazione"

### 4. Attivare/Disattivare
- Usa lo switch "Attiva" nella tabella
- **Attenzione:** Disattivare blocca l'accesso a TUTTI gli utenti

### 5. Interpretare le Statistiche

**Badges Piano:**
- `FREE` - Grigio (secondary)
- `BASIC` - Blu (default)
- `PREMIUM` - Blu (default)

**Conteggi:**
- **Utenti:** 5/10 = 5 utenti su 10 massimi consentiti
- **Documenti:** 150/500 = 150 documenti su 500 massimi annui

## ⚠️ Regole ERP Applicate

### ✅ Validazione P.IVA
- 11 cifre numeriche
- Algoritmo checksum italiano ufficiale
- Unique constraint database

### ✅ Validazione Codice Fiscale
- 16 caratteri alfanumerici
- Formato: `RSSMRA80A01H501U`
- Algoritmo checksum italiano ufficiale

### ✅ Validazione Indirizzo
- Se presente un campo, tutti obbligatori:
  - Indirizzo (min 5 caratteri)
  - Città (min 2 caratteri)
  - Provincia (2 lettere maiuscole: MI, RM, ecc.)
  - CAP (5 cifre)

### ✅ Protezione Dati
- Impossibile eliminare organizzazioni con documenti
- Consiglio: disattivare invece di eliminare
- CASCADE: eliminare cancella TUTTI i dati associati

### ✅ Multitenant
- Ogni organizzazione è isolata
- I dati non sono condivisi tra organizzazioni
- RLS (Row Level Security) applicato

## 🎨 UI/UX

### Design System
- shadcn/ui components
- Tailwind CSS
- Lucide icons
- Responsive design (mobile-friendly)

### Palette Colori
- **Successo:** Verde (green-50, green-900)
- **Errore:** Rosso (red-50, red-900)
- **Info:** Blu (primary)
- **Neutro:** Grigio (muted, secondary)

### Iconografia
- `Building2` - Organizzazione
- `Users` - Utenti
- `FileText` - Documenti
- `Package` - Prodotti
- `UserCircle` - Clienti/Fornitori

## 🧪 Testing

### Test Manuale Suggerito

1. **Creazione con P.IVA valida:**
   - P.IVA: `12345678901` (valida se checksum corretto)
   - Verifica salvataggio e visualizzazione

2. **Creazione con P.IVA duplicata:**
   - Riutilizza la stessa P.IVA
   - Verifica messaggio errore

3. **Creazione con P.IVA invalida:**
   - P.IVA: `12345678900` (checksum errato)
   - Verifica errore validazione client-side

4. **Modifica organizzazione:**
   - Modifica ragione sociale
   - Verifica aggiornamento in lista

5. **Toggle stato:**
   - Disattiva organizzazione
   - Verifica cambio switch e badge

6. **Validazione indirizzo parziale:**
   - Compila solo "Indirizzo" senza città
   - Verifica errore validazione

## 📝 TODO Futuri

- [ ] Implementare sistema SuperAdmin con tabella dedicata
- [ ] Aggiungere filtri e ricerca nella tabella
- [ ] Aggiungere paginazione per molte organizzazioni (>100)
- [ ] Export CSV/Excel delle organizzazioni
- [ ] Grafici statistiche (evoluzione temporale)
- [ ] Log audit trail modifiche organizzazioni
- [ ] Email notifica alla creazione organizzazione
- [ ] Wizard onboarding per nuova organizzazione

## 🐛 Troubleshooting

### Errore "Accesso negato"
**Causa:** Utente non è Super Admin
**Soluzione:** 
- Development: già abilitato automaticamente
- Production: aggiungi userId in `SUPER_ADMIN_IDS`

### Errore "P.IVA già presente"
**Causa:** Unique constraint violato
**Soluzione:** 
- Verifica se P.IVA è già usata da altra organizzazione
- Modifica P.IVA o verifica i dati

### Form non si salva
**Causa:** Validazione Zod fallita
**Soluzione:**
- Controlla errori rossi sotto i campi
- Verifica campi obbligatori (ragione sociale, almeno P.IVA o CF)
- Verifica formato campi (P.IVA 11 cifre, CF 16 caratteri, ecc.)

### Switch non funziona
**Causa:** Server action fallita
**Soluzione:**
- Controlla console browser per errori
- Verifica connessione database
- Controlla permessi Super Admin

## 📚 Riferimenti

- **Prisma Schema:** `prisma/schema.prisma` - Modello `Organization`
- **Regole Sviluppo:** `REGOLE_DI_SVILUPPO.md`
- **Validators:** `src/lib/validators.ts` - Algoritmi P.IVA e CF
- **Auth Context:** `src/lib/auth.ts` - Sistema autenticazione

---

**Versione:** 1.0.0
**Data:** 2026-02-01
**Autore:** YottaErp Development Team

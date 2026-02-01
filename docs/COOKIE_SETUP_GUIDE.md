# 🔐 Cookie di Autenticazione - Setup per Testing

Questa guida ti mostra come impostare manualmente i cookie per testare il sistema di autenticazione.

## 📝 Cookie Necessari

Il sistema YottaErp usa due cookie per l'autenticazione:

1. **`userId`** - Identifica l'utente corrente
2. **`currentOrganizationId`** - Organizzazione attiva (opzionale per Super Admin)

---

## 🛠️ Come Impostare i Cookie (Chrome/Edge)

### Metodo 1: Via Browser DevTools

1. **Apri DevTools** (F12 o Ctrl+Shift+I)
2. Vai su **Console** tab
3. Copia e incolla questo codice:

```javascript
// Imposta userId (deve essere in SUPER_ADMIN_IDS nel .env)
document.cookie = "userId=user_1; path=/; max-age=86400";

// (Opzionale) Imposta organizzazione corrente
document.cookie = "currentOrganizationId=org_xyz123; path=/; max-age=86400";

// Verifica cookie impostati
console.log('Cookies:', document.cookie);
```

4. Premi **Enter**
5. Ricarica la pagina (F5)

### Metodo 2: Via Application Tab

1. **Apri DevTools** (F12)
2. Vai su **Application** tab (o **Storage** in Firefox)
3. Nel menu laterale sinistro → **Cookies** → `http://localhost:3000`
4. Click destro → **Add Cookie**
5. Compila:
   - **Name:** `userId`
   - **Value:** `user_1` (o il valore che hai in `SUPER_ADMIN_IDS`)
   - **Path:** `/`
   - **Max-Age:** `86400` (1 giorno)
6. Ricarica la pagina

---

## 🧪 Configurazione per Testing

### Scenario 1: Testing con Bypass Development

**File `.env.local`:**
```bash
DATABASE_URL="postgresql://..."
SUPER_ADMIN_IDS="user_1"
DEV_BYPASS_AUTH="true"  # ✅ Bypass attivo
```

**Risultato:**
- ✅ Tutti possono accedere a `/organizations` (no auth check)
- ⚠️ SOLO per development rapido!

---

### Scenario 2: Testing con Auth Simulata

**File `.env.local`:**
```bash
DATABASE_URL="postgresql://..."
SUPER_ADMIN_IDS="user_1,user_admin_123"
# DEV_BYPASS_AUTH="true"  # ❌ Commentato = auth attiva
```

**Imposta Cookie:**
```javascript
// Console Browser
document.cookie = "userId=user_1; path=/; max-age=86400";
```

**Risultato:**
- ✅ Solo `userId=user_1` o `userId=user_admin_123` possono accedere
- ❌ Altri userId → redirect a `/access-denied`
- ❌ Senza cookie → redirect a `/access-denied`

---

### Scenario 3: Testing Accesso Negato

**Imposta Cookie con user ID NON in SUPER_ADMIN_IDS:**
```javascript
// Console Browser
document.cookie = "userId=user_normale_non_admin; path=/; max-age=86400";
```

**Risultato:**
- ❌ Accesso a `/organizations` negato
- ➡️ Redirect a `/access-denied?reason=super_admin_required`

---

## 🔍 Debug Cookie

### Verifica Cookie Attuali

**Console Browser:**
```javascript
// Mostra tutti i cookie
console.log('All cookies:', document.cookie);

// Funzione helper per parsare cookie
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Verifica specifici
console.log('userId:', getCookie('userId'));
console.log('currentOrganizationId:', getCookie('currentOrganizationId'));
```

### Cancella Cookie

**Console Browser:**
```javascript
// Cancella singolo cookie
document.cookie = "userId=; path=/; max-age=0";
document.cookie = "currentOrganizationId=; path=/; max-age=0";

// Verifica
console.log('Cookies dopo cancellazione:', document.cookie);
```

---

## 📋 Cheatsheet Comandi Rapidi

### Setup Super Admin
```javascript
// Imposta come Super Admin (dev)
document.cookie = "userId=user_1; path=/; max-age=86400";
location.reload();
```

### Setup Utente Normale
```javascript
// Imposta come utente normale (no Super Admin)
document.cookie = "userId=user_normale; path=/; max-age=86400";
location.reload();
```

### Reset Completo
```javascript
// Cancella tutto e ricarica
document.cookie = "userId=; path=/; max-age=0";
document.cookie = "currentOrganizationId=; path=/; max-age=0";
location.reload();
```

---

## 🚀 Testing Flow Completo

### Test 1: Accesso Negato (No Auth)
```bash
1. Cancella tutti i cookie
2. Vai su: http://localhost:3000/organizations
3. Risultato: Redirect a /access-denied
```

### Test 2: Accesso Negato (User Normale)
```bash
1. Cookie: userId=user_normale
2. Vai su: http://localhost:3000/organizations
3. Risultato: Redirect a /access-denied
```

### Test 3: Accesso Consentito (Super Admin)
```bash
1. Cookie: userId=user_1 (in SUPER_ADMIN_IDS)
2. Vai su: http://localhost:3000/organizations
3. Risultato: ✅ Pagina carica correttamente
```

---

## ⚠️ Importante per Produzione

### ❌ NON usare cookie manuali in produzione!

In produzione, usa un sistema di autenticazione reale:
- **NextAuth** (raccomandato)
- **Clerk**
- **Auth0**
- **Supabase Auth**

### Migrazione Cookie → Auth Provider

Quando implementi un auth provider, il cookie `userId` sarà gestito automaticamente dal provider e il middleware leggerà da:
- NextAuth: `token.sub`
- Clerk: `auth.userId`
- Supabase: `session.user.id`

Vedi `SECURITY_SUPER_ADMIN_SETUP.md` sezione "MIGRAZIONE SISTEMI AUTH".

---

## 📚 Riferimenti

- [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [Next.js: Authentication](https://nextjs.org/docs/app/building-your-application/authentication)
- File progetto: `SECURITY_SUPER_ADMIN_SETUP.md`

---

**Creato:** 2026-02-01  
**Versione:** 1.0  
**Per:** Development e Testing locale

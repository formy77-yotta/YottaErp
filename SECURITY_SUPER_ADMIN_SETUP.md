# 🔒 Guida Sicurezza - Configurazione Super Admin

## ⚠️ PROBLEMA RISOLTO

**Il problema originale:** La pagina `/organizations` era accessibile senza autenticazione.

**Soluzione implementata:** 
- ✅ Middleware di protezione (`src/middleware.ts`)
- ✅ Verifica Super Admin lato server (Server Actions)
- ✅ Pagina Access Denied (`/access-denied`)
- ✅ Doppia protezione (middleware + Server Actions)

---

## 🛡️ Architettura Sicurezza

```
┌─────────────────┐
│ Utente tenta    │
│ /organizations  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MIDDLEWARE     │◄─── PRIMA LINEA DI DIFESA
│  verifica:      │
│  1. Cookie      │
│  2. Super Admin │
└────────┬────────┘
         │
    ❌   │  ✅
  Negato │  OK
         │
         ▼
┌─────────────────┐
│  PAGE RENDER    │
│  (Client)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SERVER ACTION  │◄─── SECONDA LINEA DI DIFESA
│  isSuperAdmin() │
│  verifica DB    │
└─────────────────┘
```

---

## 📋 CHECKLIST DI CONFIGURAZIONE

### 1. ✅ Middleware Attivo

Il file `src/middleware.ts` è stato creato e protegge automaticamente:
- `/organizations/*` → Solo Super Admin
- Tutte le route eccetto pubbliche → Autenticazione base

### 2. ✅ Server Actions Protette

Tutte le Server Actions in `organization-actions.ts` verificano:
```typescript
if (!(await isSuperAdmin())) {
  return { success: false, error: 'Accesso negato' };
}
```

### 3. 🔧 CONFIGURAZIONE NECESSARIA

**IMPORTANTE:** Devi configurare le variabili d'ambiente!

#### File `.env.local` (crea se non esiste):

```bash
# ===== DATABASE =====
DATABASE_URL="postgresql://user:password@localhost:5432/yottaerp"

# ===== SUPER ADMIN IDS =====
# Lista di userId che possono accedere a /organizations
# ESEMPIO: Se usi Clerk, prendi gli user ID da dashboard
SUPER_ADMIN_IDS="user_2xyz123abc,user_3abc456def"

# ===== DEVELOPMENT (RIMUOVI IN PRODUZIONE!) =====
# Bypass autenticazione in development (SOLO PER TESTING!)
DEV_BYPASS_AUTH="true"
```

#### Come ottenere gli user ID:

**Se usi Clerk:**
1. Vai su [dashboard.clerk.com](https://dashboard.clerk.com)
2. Users → Seleziona utente → Copia User ID
3. Aggiungi a `SUPER_ADMIN_IDS`

**Se usi NextAuth:**
1. Query database: `SELECT id FROM users WHERE email = 'admin@example.com'`
2. Aggiungi ID a `SUPER_ADMIN_IDS`

**Se usi sistema custom:**
1. Controlla dove memorizzi gli user ID (cookie, session, JWT)
2. Aggiorna `src/middleware.ts` e `organization-actions.ts` di conseguenza

---

## 🚀 TESTING DELLA SICUREZZA

### Test 1: Accesso Senza Autenticazione
```bash
# Apri browser in modalità incognito
# Vai su: http://localhost:3000/organizations
# Risultato atteso: Redirect a /access-denied
```

### Test 2: Accesso Con Utente Non-Admin
```bash
# Login con utente normale
# Vai su: http://localhost:3000/organizations
# Risultato atteso: Redirect a /access-denied
```

### Test 3: Accesso Con Super Admin
```bash
# Login con utente in SUPER_ADMIN_IDS
# Vai su: http://localhost:3000/organizations
# Risultato atteso: Pagina carica correttamente
```

### Test 4: Direct API Call (Server Action)
```bash
# Apri Console Browser (F12)
# Prova a chiamare direttamente:
fetch('/api/organizations', { method: 'GET' })

# Risultato atteso: 
# - Senza auth → { success: false, error: 'Accesso negato' }
# - Con auth non-admin → { success: false, error: 'Accesso negato' }
# - Con Super Admin → { success: true, organizations: [...] }
```

---

## 🔐 BEST PRACTICES PRODUZIONE

### ❌ RIMUOVI IN PRODUZIONE:
```bash
# Nel file .env (PRODUCTION)
# DEV_BYPASS_AUTH="true"  ❌ COMMENTA O RIMUOVI!
```

### ✅ MANTIENI IN PRODUZIONE:
```bash
# Nel file .env (PRODUCTION)
SUPER_ADMIN_IDS="user_real_id_1,user_real_id_2"  ✅ OK
```

### 🔒 Rafforza la Sicurezza:

1. **Usa HTTPS sempre** (in produzione)
2. **Cookie HttpOnly** (già implementato)
3. **Rate Limiting** per le API
4. **Audit Log** per azioni Super Admin
5. **2FA** per Super Admin (consigliato)

---

## 📝 LOGGING E MONITORING

Il middleware logga tutti i tentativi di accesso:

```typescript
// Console output:
[MIDDLEWARE] GET /organizations
[AUTH] ⚠️ Tentativo accesso senza userId cookie
[SECURITY] ❌ Tentativo accesso non autorizzato a /organizations

// O se successo:
[SECURITY] ✅ Super Admin user_123 accede a /organizations
```

**Consiglio:** In produzione, invia questi log a servizio esterno:
- Sentry
- Datadog
- CloudWatch
- LogRocket

---

## 🆘 TROUBLESHOOTING

### Problema: "Non riesco ad accedere anche se sono Super Admin"

**Soluzione:**
1. Verifica `.env.local` esista e contenga `SUPER_ADMIN_IDS`
2. Controlla che il formato sia corretto (senza spazi)
3. Controlla cookie `userId` nel browser (DevTools → Application → Cookies)
4. Verifica che `userId` cookie corrisponda a quello in `SUPER_ADMIN_IDS`

### Problema: "Tutti possono accedere in development"

**Causa:** `DEV_BYPASS_AUTH="true"` è attivo.

**Soluzione:**
- Se vuoi testare sicurezza, commenta: `# DEV_BYPASS_AUTH="true"`
- Altrimenti è normale per sviluppo rapido

### Problema: "Middleware non si attiva"

**Verifica:**
1. File `src/middleware.ts` esiste
2. È nella root di `src/` (non in sottocartelle)
3. Ha `export const config = { matcher: [...] }`
4. Riavvia dev server: `npm run dev`

---

## 🔄 MIGRAZIONE SISTEMI AUTH

### Da Cookie Custom a NextAuth:

```typescript
// src/middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      const superAdminIds = process.env.SUPER_ADMIN_IDS?.split(',') || [];
      return token?.sub && superAdminIds.includes(token.sub);
    },
  },
});

export const config = {
  matcher: ['/organizations/:path*'],
};
```

### Da Cookie Custom a Clerk:

```typescript
// src/middleware.ts
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/'],
  afterAuth(auth, req) {
    if (req.nextUrl.pathname.startsWith('/organizations')) {
      const superAdminIds = process.env.SUPER_ADMIN_IDS?.split(',') || [];
      
      if (!auth.userId || !superAdminIds.includes(auth.userId)) {
        return NextResponse.redirect(new URL('/access-denied', req.url));
      }
    }
  },
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

---

## 📚 RIFERIMENTI

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Server Actions Security](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## ✅ CHECKLIST FINALE

Prima di andare in produzione:

- [ ] `SUPER_ADMIN_IDS` configurato in `.env`
- [ ] `DEV_BYPASS_AUTH` rimosso o commentato
- [ ] Testato accesso con Super Admin
- [ ] Testato accesso negato con utente normale
- [ ] Testato accesso negato senza autenticazione
- [ ] Middleware attivo e funzionante
- [ ] Server Actions protette
- [ ] HTTPS attivo in produzione
- [ ] Logging e monitoring configurati
- [ ] Rate limiting attivo (opzionale ma consigliato)
- [ ] 2FA per Super Admin (opzionale ma consigliato)

---

**Data creazione:** 2026-02-01  
**Versione:** 1.0  
**Autore:** YottaErp Security Team

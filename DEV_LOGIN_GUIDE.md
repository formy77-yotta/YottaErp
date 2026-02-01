# 🔓 Guida Login Development

## 🎯 Come Accedere al Sistema (Development)

Al momento **non c'è un vero sistema di autenticazione** - il progetto usa cookie simulati per lo sviluppo.

Hai 3 opzioni per accedere:

---

## ✅ Opzione 1: Pagina Dev Login (CONSIGLIATO)

### 1. Avvia il server
```bash
npm run dev
```

### 2. Vai sulla pagina di login development
```
http://localhost:3000/dev-login
```

### 3. Scegli un profilo
- **Super Admin** (`dev_admin_1`) → Accesso a `/organizations`
- **Utente Normale** (`user_normale`) → Accesso negato a `/organizations`

### 4. Click sul pulsante
Il sistema imposterà automaticamente il cookie e ti reindirizzerà!

---

## 🚀 Opzione 2: Bypass Completo (Più Veloce)

### 1. Configura `.env.local`
```bash
DATABASE_URL="postgresql://..."
SUPER_ADMIN_IDS="dev_admin_1"
DEV_BYPASS_AUTH="true"  # ← Questa riga bypassa TUTTO
```

### 2. Vai direttamente su
```
http://localhost:3000/organizations
```

✅ **Funziona subito** - nessun login richiesto!

---

## 🧪 Opzione 3: Cookie Manuale (Per Testing Sicurezza)

### 1. Disabilita bypass in `.env.local`
```bash
# DEV_BYPASS_AUTH="true"  # ← Commentato
SUPER_ADMIN_IDS="dev_admin_1,user_admin_2"
```

### 2. Apri browser e vai su
```
http://localhost:3000
```

### 3. Apri Console (F12)
```javascript
// Imposta te stesso come Super Admin
document.cookie = "userId=dev_admin_1; path=/; max-age=86400";
location.reload();
```

### 4. Vai su `/organizations`
✅ Ora puoi accedere!

---

## 📋 Riepilogo Configurazioni

### Development Rapido (No Security)
```env
# .env.local
DEV_BYPASS_AUTH="true"
SUPER_ADMIN_IDS="dev_admin_1"
```
→ Tutti possono accedere a tutto

---

### Development con Sicurezza Attiva
```env
# .env.local
# DEV_BYPASS_AUTH="true"  # Commentato!
SUPER_ADMIN_IDS="dev_admin_1"
```
→ Solo `dev_admin_1` può accedere

---

### Production
```env
# .env (production)
# DEV_BYPASS_AUTH  ← NON PRESENTE!
SUPER_ADMIN_IDS="user_clerk_abc123,user_nextauth_xyz456"
```
→ Solo user ID reali da sistema auth

---

## 🔐 Implementare Autenticazione Reale

### Opzione A: NextAuth.js (Raccomandato)

```bash
npm install next-auth
```

Crea `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // TODO: Verifica credenziali con database
        const user = { id: "1", email: credentials.email };
        return user;
      }
    })
  ],
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

### Opzione B: Clerk (Più Semplice)

```bash
npm install @clerk/nextjs
```

Aggiungi in `.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Wrap app con provider:
```typescript
// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

---

### Opzione C: Supabase Auth

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

Configura client e usa hook:
```typescript
import { useUser } from '@supabase/auth-helpers-react';

export default function MyComponent() {
  const user = useUser();
  // ...
}
```

---

## 🧭 Flowchart Decisionale

```
Vuoi testare velocemente?
├─ SÌ → Usa DEV_BYPASS_AUTH="true"
│        Vai su /organizations direttamente
│
└─ NO → Vuoi testare la sicurezza?
    ├─ SÌ → Usa pagina /dev-login
    │        Oppure imposta cookie manualmente
    │
    └─ NO → Sei in production?
        └─ SÌ → Implementa NextAuth/Clerk/Supabase
                Configura SUPER_ADMIN_IDS con ID reali
```

---

## 📚 File di Riferimento

- **Pagina Login Dev:** `src/app/dev-login/page.tsx`
- **Middleware Sicurezza:** `src/middleware.ts`
- **Server Actions:** `src/services/actions/organization-actions.ts`
- **Guida Cookie:** `docs/COOKIE_SETUP_GUIDE.md`
- **Guida Sicurezza:** `SECURITY_SUPER_ADMIN_SETUP.md`

---

## 🆘 FAQ

### "Non riesco ad accedere a /organizations"

**Verifica:**
1. `.env.local` esiste con `SUPER_ADMIN_IDS`
2. Oppure `DEV_BYPASS_AUTH="true"` è attivo
3. Se usi cookie, verifica che sia impostato (F12 → Application → Cookies)

### "Cookie non funziona"

**Prova:**
```javascript
// Console browser
console.log(document.cookie); // Verifica cookie esistenti

// Cancella tutto e riprova
document.cookie = "userId=; max-age=0";
document.cookie = "userId=dev_admin_1; path=/; max-age=86400";
location.reload();
```

### "Voglio un vero login"

Implementa uno di questi:
1. **NextAuth** - Più controllo
2. **Clerk** - Più veloce da configurare
3. **Supabase Auth** - Se usi già Supabase

Vedi sezione "Implementare Autenticazione Reale" sopra.

---

**Creato:** 2026-02-01  
**Per:** Development locale  
**Prossimi step:** Implementare sistema auth reale per production

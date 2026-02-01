# 🚀 Quick Start - Sistema di Autenticazione

## 📋 In 3 Passi

### 1️⃣ Crea il primo Super Admin

```bash
npx tsx scripts/create-super-admin.ts
```

**Inserisci quando richiesto:**
- Nome: `Mario`
- Cognome: `Rossi`
- Email: `admin@yottaerp.com`
- Password: `SuperAdmin123!`

✅ Super Admin creato!

---

### 2️⃣ Avvia il server

```bash
npm run dev
```

---

### 3️⃣ Accedi

**Apri browser:** http://localhost:3000/login

**Inserisci:**
- Email: `admin@yottaerp.com`
- Password: `SuperAdmin123!`

✅ Loggato come Super Admin!

**Vai alla God Page:** http://localhost:3000/organizations

✅ **Accesso consentito!** Puoi gestire tutte le organizzazioni.

---

## 🎯 Cosa puoi fare ora

### Come Super Admin:
- ✅ Accedere a `/organizations` (God Page)
- ✅ Creare, modificare, attivare/disattivare organizzazioni
- ✅ Visualizzare statistiche globali

### Come Utente Normale:
- ✅ Registrarsi su `/register`
- ✅ Login su `/login`
- ✅ Accedere alla propria organizzazione
- ❌ **NON** può accedere a `/organizations`

---

## 📄 Pagine Disponibili

| URL | Descrizione | Chi Può Accedere |
|-----|-------------|------------------|
| `/` | Home page | Tutti |
| `/login` | Login | Non autenticati |
| `/register` | Registrazione | Non autenticati |
| `/organizations` | God Page | Solo Super Admin |
| `/dev-login` | Dev login (cookie) | Solo development |
| `/access-denied` | Errore accesso | Utenti non autorizzati |

---

## 🔐 Comandi Utili

### Crea Super Admin
```bash
npx tsx scripts/create-super-admin.ts
```

### Verifica utenti nel DB
```sql
-- In Supabase SQL Editor
SELECT email, "firstName", "lastName", "isSuperAdmin", active 
FROM "User";
```

### Rendi un utente Super Admin
```sql
-- In Supabase SQL Editor
UPDATE "User" 
SET "isSuperAdmin" = true 
WHERE email = 'user@example.com';
```

### Reset database (attenzione!)
```bash
npx prisma migrate reset --force
```

---

## 📚 Documentazione Completa

- **`AUTHENTICATION_GUIDE.md`** - Guida completa autenticazione (LEGGI QUI!) ⭐
- **`SECURITY_SUPER_ADMIN_SETUP.md`** - Guida sicurezza middleware
- **`DEV_LOGIN_GUIDE.md`** - Come usare dev login con cookie

---

## 🆘 Problemi?

### "Comando npx tsx non trovato"
```bash
npm install -g tsx
```

### "Non riesco ad accedere a /organizations"
Verifica di essere Super Admin:
```sql
SELECT "isSuperAdmin" FROM "User" WHERE email = 'tua-email';
```

Se `false`, attivalo:
```sql
UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'tua-email';
```

### "Email già registrata"
Usa un'altra email oppure fai login invece di registrarti.

---

## ✅ Checklist Testing

- [ ] Super Admin creato con lo script
- [ ] Server avviato (`npm run dev`)
- [ ] Login effettuato su `/login`
- [ ] Accesso a `/organizations` funziona
- [ ] Registrazione nuovo utente su `/register` funziona
- [ ] Utente normale NON può accedere a `/organizations`
- [ ] Logout funziona

---

**🎉 Tutto funziona? Sei pronto per iniziare a sviluppare!**

**Next:** Leggi `AUTHENTICATION_GUIDE.md` per dettagli completi sul sistema di autenticazione.

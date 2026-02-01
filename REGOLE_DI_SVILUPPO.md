# Regole di Sviluppo - YottaErp

## 📋 Indice
1. [Principi Generali](#principi-generali)
2. [Convenzioni di Naming](#convenzioni-di-naming)
3. [Struttura del Codice](#struttura-del-codice)
4. [Gestione del Codice](#gestione-del-codice)
5. [Testing](#testing)
6. [Documentazione](#documentazione)
7. [Git e Versioning](#git-e-versioning)
8. [Security](#security)
9. [Performance](#performance)
10. [Code Review](#code-review)

---

## Principi Generali

### 1. Clean Code
- Il codice deve essere leggibile e auto-esplicativo
- Preferire nomi descrittivi a commenti esplicativi
- Seguire il principio KISS (Keep It Simple, Stupid)
- Applicare il principio DRY (Don't Repeat Yourself)
- Rispettare i principi SOLID

### 2. Consistenza
- Mantenere uno stile di codifica uniforme in tutto il progetto
- Utilizzare gli stessi pattern e approcci per problemi simili
- Seguire le convenzioni stabilite dal team

### 3. Manutenibilità
- Scrivere codice pensando a chi lo leggerà dopo
- Evitare ottimizzazioni premature
- Mantenere le funzioni piccole e focalizzate su un unico compito
- Limitare la complessità ciclomatica

---

## Convenzioni di Naming

### File e Directory
```
- PascalCase per componenti: UserProfile.tsx, OrderList.tsx
- kebab-case per utility e helper: string-utils.ts, date-helper.ts
- lowercase per directory: components/, services/, utils/
- Nomi descrittivi e specifici
```

### Variabili e Funzioni
```typescript
// camelCase per variabili e funzioni
const userName = "Mario Rossi";
function calculateTotal() { }

// PascalCase per classi e interfacce
class UserService { }
interface IUserData { }

// UPPER_SNAKE_CASE per costanti
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = "https://api.example.com";
```

### Componenti React
```typescript
// PascalCase per componenti
export const UserDashboard = () => { };

// Props interface con suffisso Props
interface UserDashboardProps {
  userId: string;
  onUpdate: () => void;
}
```

---

## Struttura del Codice

### Organizzazione delle Directory
```
src/
├── components/          # Componenti riutilizzabili
│   ├── common/         # Componenti comuni (Button, Input, etc.)
│   └── features/       # Componenti specifici per feature
├── pages/              # Pagine/Route dell'applicazione
├── services/           # Logica business e API calls
├── hooks/              # Custom React hooks
├── utils/              # Funzioni utility
├── types/              # TypeScript types e interfaces
├── constants/          # Costanti globali
├── assets/             # Immagini, font, etc.
└── styles/             # File di stile globali
```

### Ordine degli Import
```typescript
// 1. Import da librerie esterne
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// 2. Import da componenti interni
import { Button } from '@/components/common/Button';
import { UserService } from '@/services/UserService';

// 3. Import di types
import type { User, Order } from '@/types';

// 4. Import di stili
import styles from './Component.module.css';
```

---

## Gestione del Codice

### TypeScript
- Utilizzare TypeScript in modalità strict
- Evitare l'uso di `any`, preferire `unknown` se necessario
- Definire interfacce per oggetti complessi
- Utilizzare type guards per type narrowing
- Documentare tipi complessi con commenti JSDoc

### Gestione degli Errori
```typescript
// Sempre gestire gli errori in modo esplicito
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Errore in riskyOperation:', error);
  throw new CustomError('Operazione fallita', { cause: error });
}

// Validare sempre gli input
function processUser(user: unknown) {
  if (!isValidUser(user)) {
    throw new ValidationError('Dati utente non validi');
  }
  // ... elaborazione
}
```

### Async/Await
- Preferire async/await a Promise chains
- Gestire sempre i rejection
- Utilizzare Promise.all per operazioni parallele
- Evitare async operations in loop quando possibile

---

## Testing

### Requisiti Minimi
- Ogni feature deve avere test associati
- Coverage minimo del 80% per logica business
- Test di integrazione per flussi critici
- Test end-to-end per user journey principali

### Convenzioni di Naming
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Test implementation
    });

    it('should throw error when email is invalid', async () => {
      // Test implementation
    });
  });
});
```

### Best Practices
- Utilizzare AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test unitari devono essere veloci e isolati
- Evitare test fragili legati a implementazione interna

---

## Documentazione

### Codice
```typescript
/**
 * Calcola il totale dell'ordine includendo tasse e sconti
 * 
 * @param order - L'ordine da processare
 * @param taxRate - Aliquota fiscale (es. 0.22 per 22%)
 * @returns Oggetto contenente subtotale, tasse e totale
 * @throws {ValidationError} Se l'ordine è invalido
 * 
 * @example
 * ```typescript
 * const result = calculateOrderTotal(order, 0.22);
 * console.log(result.total);
 * ```
 */
function calculateOrderTotal(order: Order, taxRate: number): OrderTotal {
  // Implementation
}
```

### README
- Ogni modulo/package deve avere un README
- Documentare setup, configurazione e uso
- Includere esempi pratici
- Mantenere aggiornato

### Changelog
- Mantenere un CHANGELOG.md aggiornato
- Seguire il formato Keep a Changelog
- Documentare breaking changes in modo evidente

---

## Git e Versioning

### Branch Strategy
```
main/master     -> Codice in produzione
develop         -> Branch di sviluppo principale
feature/*       -> Nuove funzionalità
bugfix/*        -> Fix di bug
hotfix/*        -> Fix urgenti per produzione
release/*       -> Preparazione release
```

### Commit Messages
Seguire la convenzione Conventional Commits:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Tipi:
- `feat`: Nuova funzionalità
- `fix`: Bug fix
- `docs`: Documentazione
- `style`: Formattazione, lint
- `refactor`: Refactoring del codice
- `test`: Aggiunta/modifica test
- `chore`: Manutenzione, dipendenze

Esempi:
```
feat(auth): add JWT token refresh mechanism
fix(orders): correct tax calculation for EU customers
docs(api): update authentication endpoints documentation
```

### Pull Request
- Titolo chiaro e descrittivo
- Descrizione dettagliata delle modifiche
- Link a issue/ticket correlati
- Screenshot per modifiche UI
- Checklist di verifica completata
- Almeno un reviewer approvatore richiesto

---

## Security

### Best Practices
- Mai committare credenziali o secrets
- Utilizzare variabili d'ambiente per configurazioni sensibili
- Validare e sanitize tutti gli input utente
- Implementare rate limiting su API pubbliche
- Utilizzare HTTPS per tutte le comunicazioni
- Seguire OWASP Top 10
- Regular security audits delle dipendenze

### Gestione Dati Sensibili
- Crittografare dati sensibili at rest
- Utilizzare connessioni sicure (TLS/SSL)
- Implementare proper authorization checks
- Log audit per operazioni critiche
- Rispettare GDPR per dati personali

---

## Performance

### Frontend
- Lazy loading per componenti pesanti
- Code splitting appropriato
- Ottimizzazione immagini e assets
- Minimizzare re-renders non necessari
- Utilizzare React.memo, useMemo, useCallback strategicamente
- Implementare virtualization per liste lunghe

### Backend
- Implementare caching appropriato
- Ottimizzare query database
- Utilizzare indici database efficacemente
- Implementare pagination per liste
- Monitorare e ottimizzare bottleneck
- Connection pooling per database

### Monitoring
- Implementare logging strutturato
- Monitorare metriche chiave (response time, error rate)
- Alert per anomalie
- APM (Application Performance Monitoring)

---

## Code Review

### Checklist Reviewer
- [ ] Il codice è leggibile e comprensibile?
- [ ] Segue le convenzioni del progetto?
- [ ] Ha test adeguati?
- [ ] La documentazione è sufficiente?
- [ ] Non introduce regressioni?
- [ ] Non ci sono problemi di security evidenti?
- [ ] Le performance sono accettabili?
- [ ] Il commit message è appropriato?

### Checklist Autore
- [ ] Ho testato le modifiche localmente?
- [ ] Ho aggiunto/aggiornato i test?
- [ ] Ho aggiornato la documentazione?
- [ ] Ho rimosso codice commentato/debug?
- [ ] Ho verificato che non ci siano console.log dimenticati?
- [ ] Ho gestito casi edge e errori?
- [ ] Il codice è backward compatible o breaking changes sono documentati?

### Tempistiche
- Review entro 24 ore lavorative
- Feedback costruttivo e professionale
- Discussioni sui design decisions, non solo sui dettagli sintattici

---

## 🔄 Aggiornamenti

Questo documento è vivo e deve essere aggiornato quando:
- Emergono nuovi pattern o best practices
- Il team decide nuove convenzioni
- Si adottano nuovi tool o tecnologie
- Si identificano problemi ricorrenti

**Ultimo aggiornamento:** 2026-02-01  
**Prossima revisione:** Trimestrale

---

## 📞 Contatti

Per domande o proposte di modifica a queste regole, contattare:
- Team Lead / Tech Lead
- Architettura Team

---

*Ricorda: Queste regole esistono per aiutarci a lavorare meglio insieme. Se qualcosa non ha senso o può essere migliorato, parliamone!*

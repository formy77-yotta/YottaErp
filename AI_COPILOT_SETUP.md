# AI Copilot Setup Guide

## 📋 Panoramica

L'AI Copilot è un assistente vocale e testuale integrato in YottaErp che permette di:
- Creare lead e contatti tramite comandi vocali o testuali
- Creare opportunità commerciali
- Interagire con il sistema ERP in modo naturale

## 🔧 Configurazione

### 1. Installazione Dipendenze

Esegui il comando per installare le dipendenze necessarie:

```bash
npm install ai @ai-sdk/google
```

**Nota:** L'utente ha menzionato `zbd` ma probabilmente intendeva `zod`, che è già presente nel progetto.

### 2. Variabili d'Ambiente

Aggiungi la seguente variabile d'ambiente al tuo file `.env` (o `.env.local`):

```env
# Google Gemini API Key (per la chat AI e la trascrizione vocale)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key_here
```

#### Come ottenere la chiave API:

**Google Gemini:**
1. Vai su [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea un nuovo progetto o seleziona uno esistente
3. Genera una nuova API key
4. Copia la chiave e incollala in `.env`

**Nota:** La stessa chiave API viene usata sia per Gemini (chat) che per Google Cloud Speech-to-Text (trascrizione audio).

**Importante per Speech-to-Text:**
- Se la chiave Gemini non funziona per la trascrizione, potrebbe essere necessario:
  1. Abilitare l'API "Cloud Speech-to-Text" nel tuo progetto Google Cloud
  2. Creare una chiave API separata nel Google Cloud Console con permessi per Speech-to-Text
  3. Usare quella chiave invece di `GOOGLE_GENERATIVE_AI_API_KEY` (o configurare una variabile separata)

Per abilitare l'API Speech-to-Text:
1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Seleziona il tuo progetto
3. Vai su "API & Services" > "Library"
4. Cerca "Cloud Speech-to-Text API"
5. Clicca "Enable"

### 3. Riavvia il Server

Dopo aver aggiunto le variabili d'ambiente, riavvia il server di sviluppo:

```bash
npm run dev
```

## 🎯 Funzionalità

### Creazione Lead

Puoi chiedere all'AI di creare un lead in diversi modi:

**Testuale:**
- "Crea un nuovo lead chiamato Mario Rossi"
- "Salva un contatto: Azienda ABC, email info@abc.it"

**Vocale:**
1. Clicca sul pulsante microfono
2. Parla il comando (es. "Crea un lead per Mario Rossi")
3. L'AI trascriverà e eseguirà l'azione

### Creazione Opportunità

Puoi creare opportunità commerciali:

**Esempi:**
- "Crea un'opportunità per l'azienda XYZ, valore atteso 5000 euro"
- "Nuovo preventivo per cliente ABC"

## 🏗️ Architettura

### Componenti Principali

1. **`/api/chat`** - API route per la conversazione con Gemini
   - Gestisce i tools (createLead, createOpportunity)
   - Non accede mai direttamente al database
   - Chiama Server Actions sicure

2. **`/api/transcribe`** - API route per trascrizione audio
   - Usa Google Cloud Speech-to-Text API per convertire audio in testo
   - Supporta formati: webm, mp4, m4a, aac, wav, mpeg
   - Ottimizzato per italiano (it-IT)

3. **`use-audio-recorder`** - Hook per registrazione audio
   - Gestisce MediaRecorder API
   - Compatibile con iOS Safari e Android Chrome
   - Gestisce permessi microfono

4. **`CopilotSheet`** - Componente UI principale
   - Interfaccia chat
   - Integrazione microfono
   - Visualizzazione tool invocations

5. **`CopilotFab`** - Floating Action Button
   - Pulsante fisso in basso a destra
   - Apre/chiude il CopilotSheet

### Flusso di Esecuzione

```
Utente → CopilotSheet → /api/chat → Gemini AI
                              ↓
                         Tool Execution
                              ↓
                    Server Action (createEntityAction)
                              ↓
                         Database (Prisma)
```

## 🔒 Sicurezza

- **Nessun accesso diretto al DB:** L'AI chiama solo Server Actions validate
- **Validazione Zod:** Tutti i parametri dei tools sono validati con Zod
- **Multitenant:** Le Server Actions gestiscono automaticamente l'isolamento per organizzazione
- **Permessi:** Le Server Actions verificano i permessi utente prima di eseguire azioni

## 🐛 Troubleshooting

### Microfono non funziona

1. Verifica che il browser abbia i permessi per il microfono
2. Su iOS Safari, assicurati di usare HTTPS (richiesto per MediaRecorder)
3. Controlla la console del browser per errori

### Errore "API key non configurata"

1. Verifica che le variabili d'ambiente siano nel file `.env.local`
2. Riavvia il server dopo aver aggiunto le variabili
3. Verifica che i nomi delle variabili siano esatti (case-sensitive)

### Trascrizione non funziona

1. Verifica che `GOOGLE_GENERATIVE_AI_API_KEY` sia configurata correttamente
2. Assicurati che la chiave API abbia i permessi per Google Cloud Speech-to-Text
3. Controlla che il formato audio sia supportato
4. Verifica i log del server per errori dettagliati
5. Se necessario, abilita l'API Speech-to-Text nel tuo progetto Google Cloud

### Tool non viene eseguito

1. Verifica che la Server Action `createEntityAction` esista e funzioni
2. Controlla i log del server per errori
3. Verifica che l'utente abbia i permessi per creare entità

## 📝 Note Implementative

- Il modello Gemini usato è `gemini-1.5-flash` (veloce e economico)
- La trascrizione audio usa Google Cloud Speech-to-Text con lingua italiana (it-IT)
- I tools sono limitati a 5 step per evitare loop infiniti
- Il sistema prompt è configurato per rispondere sempre in italiano
- Tutti i servizi Google (Gemini + Speech-to-Text) usano la stessa API key

## 🚀 Prossimi Sviluppi

- [ ] Aggiungere più tools (creazione fatture, ordini, etc.)
- [ ] Supporto per query su dati esistenti
- [ ] Miglioramento gestione errori
- [ ] Cache delle trascrizioni per performance
- [ ] Supporto per più lingue

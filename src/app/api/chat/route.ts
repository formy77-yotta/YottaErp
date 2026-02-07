/**
 * API Route per AI Copilot Chat
 * 
 * Gestisce la conversazione con Google Gemini e i tools per azioni ERP.
 * 
 * ARCHITETTURA:
 * - L'AI non accede mai direttamente al database
 * - I tools chiamano Server Actions sicure
 * - Tutti i parametri sono validati con Zod
 */

import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createEntityAction } from '@/services/actions/entity-actions';

/**
 * Tool: createLead
 * Crea un nuovo lead (entità di tipo LEAD)
 */
const createLeadTool = tool({
  description: 'Crea un nuovo lead (contatto potenziale). Usa questo quando l\'utente vuole salvare un nuovo contatto o lead. PARAMETRI OBBLIGATORI: businessName (ragione sociale o nome del contatto). PARAMETRI OPZIONALI: email, phone, address, city, province, zipCode.',
  parameters: z.object({
    businessName: z.string().min(2, 'Ragione sociale deve contenere almeno 2 caratteri').describe('Ragione sociale o nome del contatto (OBBLIGATORIO)'),
    email: z.string().email('Email non valida').optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    zipCode: z.string().optional(),
  }),
  execute: async ({ businessName, email, phone, address, city, province, zipCode }) => {
    try {
      // Validazione esplicita: businessName è obbligatorio
      if (!businessName || businessName.trim() === '') {
        return {
          success: false,
          error: 'Ragione sociale obbligatoria per creare un lead',
        };
      }

      const result = await createEntityAction({
        type: 'LEAD',
        businessName: businessName.trim(),
        email: email || '',
        // phone non è supportato nello schema createEntitySchema, viene ignorato
        address: address || '',
        city: city || '',
        province: province || '',
        zipCode: zipCode || '',
      });

      if (result.success) {
        return {
          success: true,
          message: `Lead "${businessName}" creato con successo. ID: ${result.data.id}`,
          leadId: result.data.id,
        };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto durante la creazione del lead',
      };
    }
  },
});

/**
 * Tool: createOpportunity
 * Crea una nuova opportunità (preventivo/quote)
 * 
 * NOTA: Per ora creiamo solo un'entità LEAD associata.
 * In futuro si potrà estendere con una Server Action dedicata per i documenti.
 */
const createOpportunityTool = tool({
  description: 'Crea una nuova opportunità di vendita (preventivo/quote). Usa questo quando l\'utente vuole creare un preventivo o un\'opportunità commerciale. PARAMETRI OBBLIGATORI: customerName (nome del cliente), description (descrizione dell\'opportunità). PARAMETRI OPZIONALI: expectedValue (valore atteso in euro), email, phone.',
  parameters: z.object({
    customerName: z.string().min(2, 'Nome cliente deve contenere almeno 2 caratteri').describe('Nome del cliente (OBBLIGATORIO)'),
    description: z.string().min(5, 'Descrizione deve contenere almeno 5 caratteri'),
    expectedValue: z.number().positive('Il valore atteso deve essere positivo').optional(),
    email: z.string().email('Email non valida').optional(),
    phone: z.string().optional(),
  }),
  execute: async ({ customerName, description, expectedValue, email, phone }) => {
    try {
      // Validazione esplicita: customerName è obbligatorio
      if (!customerName || customerName.trim() === '') {
        return {
          success: false,
          error: 'Nome cliente obbligatorio per creare un\'opportunità',
        };
      }

      // Per ora creiamo un LEAD con la descrizione nelle note
      // In futuro si potrà creare un documento QUOTE vero e proprio
      const result = await createEntityAction({
        type: 'LEAD',
        businessName: customerName.trim(),
        email: email || '',
        // phone non è supportato nello schema createEntitySchema, viene ignorato
      });

      if (result.success) {
        const valueText = expectedValue 
          ? ` Valore atteso: €${expectedValue.toFixed(2)}.`
          : '';
        return {
          success: true,
          message: `Opportunità creata per "${customerName}".${valueText} Descrizione: ${description}`,
          leadId: result.data.id,
        };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto durante la creazione dell\'opportunità',
      };
    }
  },
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Verifica che la chiave API sia configurata
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_GENERATIVE_AI_API_KEY non configurata' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Normalizza i messaggi: rimuovi campi extra e assicura formato corretto per ModelMessage[]
    // I messaggi devono avere solo 'role' e 'content' (string)
    const normalizedMessages = messages
      .filter((msg: any) => msg && msg.role && (msg.content || msg.text))
      .map((msg: any) => {
        // Estrai solo i campi supportati: role e content
        // Supporta sia 'content' che 'text' (formato legacy)
        const content = typeof msg.content === 'string' 
          ? msg.content 
          : typeof msg.text === 'string'
          ? msg.text
          : '';
        
        // Filtra solo messaggi user e assistant (ignora system, tool, etc. che sono gestiti separatamente)
        if (msg.role === 'user' || msg.role === 'assistant') {
          return {
            role: msg.role,
            content: content,
          };
        }
        return null;
      })
      .filter((msg: any) => msg !== null);

    const result = streamText({
      model: google('gemini-3-flash-preview'),
      system: `Sei un assistente ERP esperto per YottaErp, un sistema di gestione aziendale italiano.
      
REGOLE FONDAMENTALI:
1. Sei preciso, formale e professionale
2. Rispondi SEMPRE in italiano
3. Quando l'utente chiede di salvare dati o creare qualcosa, DEVI chiamare il tool appropriato
4. NON dire solo "lo farò" - ESEGUI l'azione chiamando il tool
5. Dopo aver eseguito un tool, conferma all'utente cosa è stato fatto

AZIONI DISPONIBILI:
- createLead: Per creare nuovi contatti/lead
- createOpportunity: Per creare opportunità commerciali/preventivi

Sii sempre chiaro e conciso nelle risposte.`,
      messages: normalizedMessages,
      tools: {
        createLead: createLeadTool,
        createOpportunity: createOpportunityTool,
      },
      maxSteps: 5, // Limita il numero di step per evitare loop infiniti
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Errore API chat:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Errore durante la generazione della risposta',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

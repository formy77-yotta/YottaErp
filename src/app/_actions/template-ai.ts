/**
 * Server Action: AI Bridge per generare configurazione template PDF da prompt utente
 *
 * Mappa il testo dell'utente (es. "Voglio un layout elegante in blu") nel JSON
 * dello schema Zod PrintTemplateConfig. Se GOOGLE_GENERATIVE_AI_API_KEY non è
 * configurata, restituisce un mock.
 */

'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import {
  PrintTemplateConfigSchema,
  defaultPrintTemplateConfig,
  columnsConfigSchema,
  tableStyleSchema,
  positionsSchema,
  conditionalStyleSchema,
  type PrintTemplateConfig,
} from '@/lib/pdf/template-schema';

/** Schema per l'AI: fontSize come stringa (Gemini richiede enum stringa, non number) */
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const AITemplateConfigSchema = z.object({
  primaryColor: hexColor.default('#1e40af'),
  secondaryColor: hexColor.default('#64748b'),
  fontSize: z.enum(['8', '10', '12']).default('10'),
  layoutType: z.enum(['standard', 'modern', 'minimal']).default('standard'),
  showLogo: z.boolean().default(true),
  showWatermark: z.boolean().default(false),
  tableStyle: tableStyleSchema.default({ headerColor: '#374151', stripedRows: true, showBorders: true }),
  columnsConfig: columnsConfigSchema.default({
    showSku: true,
    showDiscount: false,
    showVatRate: true,
    showNetAmount: true,
    showVatAmount: true,
    showGrossAmount: true,
  }),
  positions: positionsSchema.default({ recipient: 'left', logo: 'left' }),
  conditionalStyles: z.array(conditionalStyleSchema).default([]),
});

export type GenerateTemplateConfigResult =
  | { success: true; config: PrintTemplateConfig }
  | { success: false; error: string; config?: PrintTemplateConfig };

/**
 * Genera una configurazione template (colori, layout, font, colonne) a partire
 * da un prompt in linguaggio naturale. Ogni salvataggio del JSON deve comunque
 * passare per SafeParse di Zod prima di essere persistito.
 */
export async function generateTemplateConfigViaAI(
  userPrompt: string
): Promise<GenerateTemplateConfigResult> {
  const trimmed = userPrompt?.trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Inserisci una descrizione del modello desiderato',
      config: defaultPrintTemplateConfig,
    };
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // Mock: interpretazione semplice del prompt senza LLM
    return mockGenerateTemplateConfig(trimmed);
  }

  try {
    const { object } = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: AITemplateConfigSchema,
      system: `Sei un assistente che traduce richieste in configurazione template PDF (posizioni blocchi, colori e stili condizionali).
REGOLE OBBLIGATORIE:
- "A destra" / "destinatario a destra" / "buste con finestra" / "finestra" -> imposta positions.recipient: "right".
- "A sinistra" / "destinatario a sinistra" -> imposta positions.recipient: "left".
- "Senza bordi" / "niente bordi" / "tabella senza bordi" -> imposta tableStyle.showBorders: false.
- "Con bordi" / "bordi alla tabella" -> tableStyle.showBorders: true.
- Layout "pulito", "minimal", "essenziale" -> layoutType: "minimal".
- positions.recipient: solo "left" o "right". positions.logo: solo "left", "right" o "center".
- primaryColor e secondaryColor: solo hex #RRGGBB. fontSize: solo "8", "10" o "12".
- STILI CONDIZIONALI (conditionalStyles): se l'utente chiede di evidenziare righe per tipo articolo (es. servizi, prodotti), aggiungi una regola con target "row", condition "productType", value il codice tipo (es. "SERVICE" per servizi, "GOODS" per merci). Usa colori pastello per backgroundColor (es. #fecaca rosso chiaro, #dbeafe blu chiaro) per mantenere leggibile il testo nero; oppure sfondo scuro con color "#ffffff".`,
      prompt: `L'utente vuole un modello grafico per stampa PDF di documenti (fatture, DDT, ordini). 
Traduci la sua richiesta in una configurazione JSON valida.

Richiesta utente: "${trimmed}"

Regole:
- primaryColor e secondaryColor: solo esadecimali #RRGGBB (es. #1e40af per blu)
- fontSize: solo "8", "10" o "12" (stringa)
- layoutType: solo "standard", "modern" o "minimal"
- positions.recipient: "left" o "right" (usa "right" per buste con finestra / destinatario a destra)
- positions.logo: "left", "right" o "center"
- showLogo, showWatermark, tableStyle.stripedRows, tableStyle.showBorders, columnsConfig.*: boolean
- tableStyle.headerColor: hex #RRGGBB
- conditionalStyles: array di regole. Ogni regola: target "row" o "cell", condition (campo riga, es. "productType"), value (valore che attiva la regola, es. "SERVICE"), backgroundColor (hex), color (hex, opzionale; se sfondo scuro usare "#ffffff").
- Esempio: evidenziare i servizi -> conditionalStyles: [{ target: "row", condition: "productType", value: "SERVICE", backgroundColor: "#fecaca" }].
Rispondi SOLO con l'oggetto JSON della configurazione, senza testo aggiuntivo.`,
    });

    const aiParsed = AITemplateConfigSchema.safeParse(object);
    if (!aiParsed.success) {
      return {
        success: false,
        error: 'La risposta del modello non è valida',
        config: defaultPrintTemplateConfig,
      };
    }
    const fromAi = aiParsed.data;
    const config: PrintTemplateConfig = {
      ...fromAi,
      fontSize: Number(fromAi.fontSize) as 8 | 10 | 12,
      positions: fromAi.positions ?? { recipient: 'left', logo: 'left' },
      conditionalStyles: fromAi.conditionalStyles ?? [],
    };
    const parsed = PrintTemplateConfigSchema.safeParse(config);
    if (parsed.success) {
      return { success: true, config: parsed.data };
    }
    return {
      success: false,
      error: 'La risposta del modello non è valida',
      config: defaultPrintTemplateConfig,
    };
  } catch (err) {
    console.error('generateTemplateConfigViaAI error:', err);
    const message = err instanceof Error ? err.message : 'Errore generazione configurazione';
    return {
      success: false,
      error: message,
      config: defaultPrintTemplateConfig,
    };
  }
}

/**
 * Mock: genera una config approssimativa da parole chiave (senza LLM)
 */
function mockGenerateTemplateConfig(userPrompt: string): GenerateTemplateConfigResult {
  const lower = userPrompt.toLowerCase();
  const config = { ...defaultPrintTemplateConfig };

  if (lower.includes('blu') || lower.includes('blue')) {
    config.primaryColor = '#1e40af';
    config.secondaryColor = '#3b82f6';
  }
  if (lower.includes('verde') || lower.includes('green')) {
    config.primaryColor = '#15803d';
    config.secondaryColor = '#22c55e';
  }
  if (lower.includes('rosso') || lower.includes('red')) {
    config.primaryColor = '#b91c1c';
    config.secondaryColor = '#dc2626';
  }
  if (lower.includes('grigio') || lower.includes('grey') || lower.includes('minimal')) {
    config.primaryColor = '#374151';
    config.secondaryColor = '#6b7280';
  }
  if (lower.includes('elegante') || lower.includes('modern')) {
    config.layoutType = 'modern';
    config.fontSize = 10;
  }
  if (lower.includes('minimal') || lower.includes('essenziale') || lower.includes('pulito')) {
    config.layoutType = 'minimal';
    config.showWatermark = false;
  }
  if (lower.includes('buste') || lower.includes('finestra') || lower.includes('destra') || lower.includes('invii postali')) {
    config.positions = { ...config.positions, recipient: 'right' };
  }
  if (lower.includes('senza bordi') || lower.includes('niente bordi') || lower.includes('tabella senza bordi')) {
    config.tableStyle = { ...config.tableStyle, showBorders: false };
  }
  if (lower.includes('watermark') || lower.includes('filigrana')) {
    config.showWatermark = true;
  }
  if (lower.includes('grande') || lower.includes('large')) {
    config.fontSize = 12;
  }
  if (lower.includes('piccolo') || lower.includes('small')) {
    config.fontSize = 8;
  }
  // Evidenziare servizi / Alert Service: righe con productType SERVICE in rosso pastello
  if (
    lower.includes('evidenzia') && (lower.includes('serviz') || lower.includes('service')) ||
    lower.includes('alert service') ||
    lower.includes('stili condizionali per servizi')
  ) {
    config.conditionalStyles = [
      {
        target: 'row',
        condition: 'productType',
        value: 'SERVICE',
        backgroundColor: '#fecaca',
      },
    ];
  }

  return { success: true, config };
}

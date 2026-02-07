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
import { PrintTemplateConfigSchema, defaultPrintTemplateConfig, type PrintTemplateConfig } from '@/lib/pdf/template-schema';

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
      schema: PrintTemplateConfigSchema,
      prompt: `L'utente vuole un modello grafico per stampa PDF di documenti (fatture, DDT, ordini). 
Traduci la sua richiesta in una configurazione JSON valida.

Richiesta utente: "${trimmed}"

Regole:
- primaryColor e secondaryColor: solo esadecimali #RRGGBB (es. #1e40af per blu)
- fontSize: solo 8, 10 o 12
- layoutType: solo "standard", "modern" o "minimal"
- showLogo, showWatermark, tableStyle.stripedRows, columnsConfig.*: boolean
- tableStyle.headerColor: hex #RRGGBB
Rispondi SOLO con l'oggetto JSON della configurazione, senza testo aggiuntivo.`,
    });

    const parsed = PrintTemplateConfigSchema.safeParse(object);
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
  if (lower.includes('minimal') || lower.includes('essenziale')) {
    config.layoutType = 'minimal';
    config.showWatermark = false;
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

  return { success: true, config };
}

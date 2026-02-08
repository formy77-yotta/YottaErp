/**
 * Server Action: AI Bridge per generare configurazione template PDF (V2) da prompt utente
 */

'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import {
  PrintTemplateConfigSchemaV2,
  parseTemplateConfigV2,
  type PrintTemplateConfigV2,
} from '@/lib/pdf/config-schema-v2';

export type GenerateTemplateConfigResult =
  | { success: true; config: PrintTemplateConfigV2 }
  | { success: false; error: string; config?: PrintTemplateConfigV2 };

const defaultConfig = parseTemplateConfigV2({});

export async function generateTemplateConfigViaAI(
  userPrompt: string
): Promise<GenerateTemplateConfigResult> {
  const trimmed = userPrompt?.trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Inserisci una descrizione del modello desiderato',
      config: defaultConfig,
    };
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return mockGenerateTemplateConfigV2(trimmed);
  }

  try {
    const { object } = await generateObject({
      model: google('gemini-3-flash-preview'),
      schema: PrintTemplateConfigSchemaV2,
      system: `Sei un assistente che traduce richieste in configurazione template PDF V2 (baseLayout, sezioni, colori, stili condizionali).
REGOLE:
- baseLayout: "invoice-standard" | "invoice-modern" | "invoice-minimal" | "ddt-standard" | "ddt-minimal" | "order-standard". Per "modern" usa "invoice-modern", per "minimal" "invoice-minimal".
- sections: showHeader, showRecipient, showTable, showTotals, showNotes, showFooter, showWatermark, showLogo (boolean).
- header.logoPosition: "left" | "center" | "right". "buste con finestra" / "destinatario a destra" -> non cambia header, è per il blocco destinatario (puoi documentare in note).
- table.style: headerColor (hex), stripedRows, showBorders, fontSize "8"|"10"|"12".
- table.columns: showSku, showDescription, showQuantity, showUnitPrice, showDiscount, showVatRate, showNetAmount, showVatAmount, showGrossAmount.
- colors: primary, secondary, text (hex #RRGGBB).
- conditionalStyles: array. Ogni regola: target "row"|"cell", condition (es. "productType"), value (es. "SERVICE"), backgroundColor (hex), color opzionale. Per evidenziare i servizi: [{ target: "row", condition: "productType", value: "SERVICE", backgroundColor: "#fecaca" }].`,
      prompt: `Traduci la richiesta dell'utente in una configurazione template PDF V2 (JSON valido).

Richiesta: "${trimmed}"

Rispondi SOLO con l'oggetto JSON della configurazione (baseLayout, sections, header, table, conditionalStyles, colors).`,
    });

    const config = parseTemplateConfigV2(object);
    return { success: true, config };
  } catch (err) {
    console.error('generateTemplateConfigViaAI error:', err);
    const message = err instanceof Error ? err.message : 'Errore generazione configurazione';
    return {
      success: false,
      error: message,
      config: defaultConfig,
    };
  }
}

function mockGenerateTemplateConfigV2(userPrompt: string): GenerateTemplateConfigResult {
  const lower = userPrompt.toLowerCase();
  const config = parseTemplateConfigV2({});

  if (lower.includes('blu') || lower.includes('blue')) {
    config.colors.primary = '#1e40af';
    config.colors.secondary = '#3b82f6';
  }
  if (lower.includes('verde') || lower.includes('green')) {
    config.colors.primary = '#15803d';
    config.colors.secondary = '#22c55e';
  }
  if (lower.includes('rosso') || lower.includes('red')) {
    config.colors.primary = '#b91c1c';
    config.colors.secondary = '#dc2626';
  }
  if (lower.includes('grigio') || lower.includes('grey')) {
    config.colors.primary = '#374151';
    config.colors.secondary = '#6b7280';
  }
  if (lower.includes('elegante') || lower.includes('modern')) {
    config.baseLayout = 'invoice-modern';
  }
  if (lower.includes('minimal') || lower.includes('essenziale') || lower.includes('pulito')) {
    config.baseLayout = 'invoice-minimal';
    config.sections.showWatermark = false;
  }
  if (lower.includes('ddt')) {
    config.baseLayout = 'ddt-minimal';
  }
  if (lower.includes('senza bordi') || lower.includes('niente bordi')) {
    config.table.style.showBorders = false;
  }
  if (lower.includes('watermark') || lower.includes('filigrana')) {
    config.sections.showWatermark = true;
  }
  if (lower.includes('logo') && lower.includes('centro')) {
    config.header.logoPosition = 'center';
  }
  if (
    (lower.includes('evidenzia') && (lower.includes('serviz') || lower.includes('service'))) ||
    lower.includes('alert service')
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

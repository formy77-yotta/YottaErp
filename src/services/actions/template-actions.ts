/**
 * Server Actions per gestione Modelli di stampa PDF (PrintTemplate)
 *
 * MULTITENANT: Ogni modello appartiene a una Organization.
 * Ogni salvataggio del JSON config passa per SafeParse di Zod.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthContext, canWrite, verifyOrganizationAccess, ForbiddenError } from '@/lib/auth';
import {
  parseTemplateConfigV2,
  PrintTemplateConfigSchemaV2,
  type PrintTemplateConfigV2,
} from '@/lib/pdf/config-schema-v2';
import { renderDocumentPDF } from '@/lib/pdf/render-document';
import { sampleDocument } from '@/components/features/templates/sample-document';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export type PrintTemplateOutput = {
  id: string;
  name: string;
  config: PrintTemplateConfigV2;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function getTemplatesAction(): Promise<ActionResult<PrintTemplateOutput[]>> {
  try {
    const ctx = await getAuthContext();
    const rows = await prisma.printTemplate.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    const data = rows.map((t) => {
      const config = parseTemplateConfigV2(t.config);
      return {
        id: t.id,
        name: t.name,
        config,
        isDefault: t.isDefault,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });
    return { success: true, data };
  } catch (error) {
    console.error('getTemplatesAction:', error);
    if (error instanceof ForbiddenError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Errore nel recupero dei modelli' };
  }
}

export async function createTemplateAction(
  name: string,
  config: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!canWrite(ctx)) {
      return { success: false, error: 'Non hai i permessi per creare modelli' };
    }
    const parsed = PrintTemplateConfigSchemaV2.safeParse(config);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Configurazione non valida: ' + (parsed.error.flatten().formErrors.join(', ') || 'schema non riconosciuto'),
      };
    }
    const isFirst = (await prisma.printTemplate.count({ where: { organizationId: ctx.organizationId } })) === 0;
    const created = await prisma.printTemplate.create({
      data: {
        organizationId: ctx.organizationId,
        name: name.trim(),
        config: parsed.data as object,
        isDefault: isFirst,
      },
    });
    revalidatePath('/settings/templates');
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error('createTemplateAction:', error);
    if (error instanceof ForbiddenError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Errore durante la creazione del modello' };
  }
}

export async function updateTemplateAction(
  id: string,
  payload: { name?: string; config?: unknown }
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!canWrite(ctx)) {
      return { success: false, error: 'Non hai i permessi per modificare i modelli' };
    }
    const existing = await prisma.printTemplate.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });
    if (!existing) {
      return { success: false, error: 'Modello non trovato' };
    }
    verifyOrganizationAccess(ctx, existing);
    const updateData: { name?: string; config?: object } = {};
    if (payload.name !== undefined) updateData.name = payload.name.trim();
    if (payload.config !== undefined) {
      const parsed = PrintTemplateConfigSchemaV2.safeParse(payload.config);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Configurazione non valida: ' + (parsed.error.flatten().formErrors.join(', ') || 'schema non riconosciuto'),
        };
      }
      updateData.config = parsed.data as object;
    }
    await prisma.printTemplate.update({
      where: { id },
      data: updateData,
    });
    revalidatePath('/settings/templates');
    revalidatePath('/settings/document-types');
    return { success: true, data: { id } };
  } catch (error) {
    console.error('updateTemplateAction:', error);
    if (error instanceof ForbiddenError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Errore durante l\'aggiornamento del modello' };
  }
}

export async function deleteTemplateAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!canWrite(ctx)) {
      return { success: false, error: 'Non hai i permessi per eliminare i modelli' };
    }
    const existing = await prisma.printTemplate.findUnique({
      where: { id },
      select: { id: true, organizationId: true, isDefault: true },
    });
    if (!existing) {
      return { success: false, error: 'Modello non trovato' };
    }
    verifyOrganizationAccess(ctx, existing);
    const linked = await prisma.documentTypeConfig.count({ where: { templateId: id } });
    if (linked > 0) {
      return {
        success: false,
        error: `Impossibile eliminare: ${linked} tipo/i documento usano questo modello. Rimuovi prima l'associazione.`,
      };
    }
    await prisma.printTemplate.delete({ where: { id } });
    revalidatePath('/settings/templates');
    revalidatePath('/settings/document-types');
    return { success: true, data: { id } };
  } catch (error) {
    console.error('deleteTemplateAction:', error);
    if (error instanceof ForbiddenError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Errore durante l\'eliminazione del modello' };
  }
}

export async function setDefaultTemplateAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!canWrite(ctx)) {
      return { success: false, error: 'Non hai i permessi per modificare i modelli' };
    }
    const existing = await prisma.printTemplate.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });
    if (!existing) {
      return { success: false, error: 'Modello non trovato' };
    }
    verifyOrganizationAccess(ctx, existing);
    await prisma.$transaction([
      prisma.printTemplate.updateMany({
        where: { organizationId: ctx.organizationId },
        data: { isDefault: false },
      }),
      prisma.printTemplate.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
    revalidatePath('/settings/templates');
    return { success: true, data: { id } };
  } catch (error) {
    console.error('setDefaultTemplateAction:', error);
    if (error instanceof ForbiddenError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Errore durante l\'impostazione del modello predefinito' };
  }
}

/** Risultato anteprima PDF (base64 per invio al client) */
export type PreviewPDFResult = ActionResult<{ pdfData: string }>;

/**
 * Genera anteprima PDF del modello usando la pipeline con layout modulari.
 */
export async function generatePreviewPDFAction(templateId: string): Promise<PreviewPDFResult> {
  try {
    const ctx = await getAuthContext();
    const template = await prisma.printTemplate.findUnique({
      where: { id: templateId, organizationId: ctx.organizationId },
    });
    if (!template) {
      return { success: false, error: 'Template non trovato' };
    }
    const config = parseTemplateConfigV2(template.config);
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { businessName: true, logoUrl: true },
    });
    if (!org) {
      return { success: false, error: 'Organizzazione non trovata' };
    }
    const blob = await renderDocumentPDF({
      document: sampleDocument,
      templateConfig: config,
      organization: { name: org.businessName, logoUrl: org.logoUrl },
    });
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return {
      success: true,
      data: { pdfData: `data:application/pdf;base64,${base64}` },
    };
  } catch (error) {
    console.error('generatePreviewPDFAction:', error);
    if (error instanceof ForbiddenError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore generazione anteprima PDF',
    };
  }
}

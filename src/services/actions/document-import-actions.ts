'use server';

import { getAuthContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadDocumentFile } from '@/lib/supabase-storage';
import { uploadDocumentSchema } from '@/schemas/document-import-schema';

export async function uploadDocumentAction(formData: FormData) {
  try {
    const ctx = await getAuthContext();

    const file = formData.get('file') as File;
    const validated = uploadDocumentSchema.parse({ file });

    const { url, path } = await uploadDocumentFile(validated.file, ctx.organizationId);

    const documentImport = await prisma.documentImport.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        fileUrl: url,
        fileStoragePath: path,
        fileName: validated.file.name,
        fileType: validated.file.type.includes('pdf')
          ? 'PDF'
          : validated.file.type.includes('xml')
            ? 'XML'
            : 'IMAGE',
        fileSize: validated.file.size,
        status: 'UPLOADED',
      },
    });

    return {
      success: true,
      importId: documentImport.id,
      fileUrl: url,
    };
  } catch (error) {
    console.error('Errore upload documento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}

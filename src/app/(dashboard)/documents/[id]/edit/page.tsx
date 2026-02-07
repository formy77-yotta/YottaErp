/**
 * Pagina modifica Documento
 * 
 * Permette di modificare un documento esistente.
 * MULTITENANT: Verifica che il documento appartenga all'organizzazione corrente
 */

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getDocumentAction } from '@/services/actions/document-actions';
import { Button } from '@/components/ui/button';
import { DocumentFormWrapper } from '@/components/features/DocumentFormWrapper';

interface DocumentEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentEditPage({ params }: DocumentEditPageProps) {
  const { id } = await params;
  
  // Recupera documento per verificare esistenza e permessi
  const result = await getDocumentAction(id);

  if (!result.success) {
    if (result.error.includes('non trovato') || result.error.includes('Accesso negato')) {
      notFound();
    }
    // Altri errori: reindirizza alla lista
    redirect('/documents');
  }

  return (
    <div className="space-y-6">
      {/* Header con breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/documents/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              Modifica Documento {result.data.number}
            </h1>
            <p className="text-muted-foreground mt-1">
              Modifica i dati del documento
            </p>
          </div>
        </div>
      </div>

      {/* Form modifica documento */}
      <DocumentFormWrapper
        documentId={id}
        redirectUrl={`/documents/${id}`}
      />
    </div>
  );
}

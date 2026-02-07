/**
 * Wrapper Client Component per DocumentForm
 * 
 * Necessario perché non possiamo passare funzioni da Server Component a Client Component
 * in Next.js 14+ con App Router.
 */

'use client';

import { useRouter } from 'next/navigation';
import { DocumentForm } from './DocumentForm';

interface DocumentFormWrapperProps {
  /**
   * Documento da modificare (undefined = creazione nuova)
   */
  documentId?: string;
  
  /**
   * URL di redirect dopo salvataggio con successo
   * Se non specificato, reindirizza alla lista documenti
   */
  redirectUrl?: string;
}

export function DocumentFormWrapper({ documentId, redirectUrl }: DocumentFormWrapperProps) {
  const router = useRouter();

  const handleSuccess = () => {
    if (redirectUrl) {
      router.push(redirectUrl);
    } else if (documentId) {
      router.push(`/documents/${documentId}`);
    } else {
      router.push('/documents');
    }
    router.refresh(); // Aggiorna i dati della pagina
  };

  const handleError = (error: string) => {
    console.error('Errore documento:', error);
    // Potresti anche mostrare un toast qui
  };

  return (
    <DocumentForm
      documentId={documentId}
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}

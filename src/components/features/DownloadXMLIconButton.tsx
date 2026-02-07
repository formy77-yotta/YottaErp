/**
 * Componente icona per download XML FatturaPA (versione compatta per tabelle)
 * 
 * Mostra solo un'icona cliccabile per scaricare l'XML
 */

'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadInvoiceXMLAction } from '@/services/actions/document-actions';
import { Loader2 } from 'lucide-react';

interface DownloadXMLIconButtonProps {
  documentId: string;
}

/**
 * Componente client per download XML FatturaPA (solo icona)
 */
export function DownloadXMLIconButton({ documentId }: DownloadXMLIconButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const result = await downloadInvoiceXMLAction(documentId);
      if (result.success) {
        // Crea blob e scarica
        const blob = new Blob([result.data.xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(`Errore: ${result.error}`);
      }
    } catch (error) {
      console.error('Errore download XML:', error);
      alert('Errore durante il download dell\'XML');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={handleDownload}
      disabled={isDownloading}
      className="h-8 w-8"
      title="Scarica XML FatturaPA"
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
}

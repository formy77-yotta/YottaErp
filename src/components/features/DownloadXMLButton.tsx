'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadInvoiceXMLAction } from '@/services/actions/document-actions';

interface DownloadXMLButtonProps {
  documentId: string;
}

/**
 * Componente client per download XML FatturaPA
 */
export function DownloadXMLButton({ documentId }: DownloadXMLButtonProps) {
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
      variant="outline" 
      onClick={handleDownload}
      disabled={isDownloading}
    >
      <Download className="h-4 w-4 mr-2" />
      {isDownloading ? 'Download...' : 'Scarica XML FatturaPA'}
    </Button>
  );
}

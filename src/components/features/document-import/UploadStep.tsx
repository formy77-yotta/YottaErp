'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDocumentAction } from '@/services/actions/document-import-actions';
import { Card } from '@/components/ui/card';
import { Upload, FileText, Image as ImageIcon, FileCode } from 'lucide-react';
import { toast } from 'sonner';

interface UploadStepProps {
  onUploadComplete: (importId: string, fileUrl: string) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const result = await uploadDocumentAction(formData);

        if (result.success && result.importId && result.fileUrl) {
          toast.success('File caricato con successo');
          onUploadComplete(result.importId, result.fileUrl);
        } else {
          toast.error(result.error || 'Errore durante il caricamento');
        }
      } catch (error) {
        toast.error('Errore durante il caricamento');
        console.error(error);
      } finally {
        setUploading(false);
      }
    },
  });

  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Importa Documento</h2>
        <p className="text-muted-foreground mt-2">
          Carica una fattura in formato PDF, immagine o XML
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}
        `}
      >
        <input {...getInputProps()} disabled={uploading} />

        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Caricamento in corso...</p>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

            {isDragActive ? (
              <p className="text-lg font-medium">Rilascia il file qui</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Trascina un file qui o clicca per selezionare
                </p>
                <p className="text-sm text-muted-foreground">
                  Formati supportati: PDF, JPG, PNG, XML (max 10MB)
                </p>
              </>
            )}

            <div className="flex gap-6 justify-center mt-6">
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-red-500" />
                <span className="text-xs text-muted-foreground">PDF</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="w-8 h-8 text-blue-500" />
                <span className="text-xs text-muted-foreground">Immagine</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <FileCode className="w-8 h-8 text-green-500" />
                <span className="text-xs text-muted-foreground">XML</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Nota:</strong> Il sistema estrarrà automaticamente i dati dal documento.
          Potrai revisionare e modificare tutti i dati prima del salvataggio definitivo.
        </p>
      </div>
    </Card>
  );
};

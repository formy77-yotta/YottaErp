/**
 * Pagina creazione nuovo documento
 * 
 * Permette di creare un nuovo documento (Fattura, DDT, Carico, etc.)
 * utilizzando il form universale DocumentForm.
 */

import { DocumentForm } from '@/components/features/DocumentForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function NewDocumentPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Nuovo Documento</h1>
        <p className="text-muted-foreground mt-1">
          Crea un nuovo documento (Fattura, DDT, Carico, etc.)
        </p>
      </div>

      {/* Form Documento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dati Documento
          </CardTitle>
          <CardDescription>
            Compila i dati del documento e le righe prodotto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentForm />
        </CardContent>
      </Card>
    </div>
  );
}

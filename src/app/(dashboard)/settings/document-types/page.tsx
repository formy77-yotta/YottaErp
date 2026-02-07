/**
 * Pagina gestione Configurazioni Tipi Documento
 * 
 * Permette di visualizzare, creare e modificare le configurazioni tipi documento dell'organizzazione.
 * MULTITENANT: Tutte le configurazioni sono filtrate per organizationId
 */

import { Suspense } from 'react';
import { getDocumentTypesAction } from '@/services/actions/document-type-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateDocumentTypeDialog } from '@/components/features/CreateDocumentTypeDialog';
import { EditDocumentTypeDialog } from '@/components/features/EditDocumentTypeDialog';
import { DeleteDocumentTypeButton } from '@/components/features/DeleteDocumentTypeButton';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

/**
 * Componente principale della pagina
 */
export default function DocumentTypesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tipi Documento</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci le configurazioni tipi documento della tua organizzazione
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateDocumentTypeDialog />
        </div>
      </div>

      {/* Tabella Configurazioni */}
      <Suspense fallback={<DocumentTypesTableSkeleton />}>
        <DocumentTypesTable />
      </Suspense>
    </div>
  );
}

/**
 * Tabella configurazioni con dati dal server
 */
async function DocumentTypesTable() {
  const result = await getDocumentTypesAction();

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const documentTypes = result.data;

  if (documentTypes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessuna configurazione tipo documento configurata</p>
          <p className="text-sm text-muted-foreground mt-2">
            Crea la tua prima configurazione tipo documento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurazioni Tipi Documento</CardTitle>
        <CardDescription>
          {documentTypes.length} configurazione{documentTypes.length !== 1 ? 'i' : ''} configurata{documentTypes.length !== 1 ? 'e' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Numerazione</TableHead>
                <TableHead>Movimenta Stock</TableHead>
                <TableHead>Impatto Valutazione</TableHead>
                <TableHead>Segno</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentTypes.map((docType) => (
                <DocumentTypeRow key={docType.id} documentType={docType} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Riga singola della tabella
 */
function DocumentTypeRow({ documentType }: { documentType: {
  id: string;
  code: string;
  description: string;
  numeratorCode: string;
  inventoryMovement: boolean;
  valuationImpact: boolean;
  operationSign: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
} }) {
  return (
    <TableRow>
      <TableCell className="font-medium font-mono">
        {documentType.code}
      </TableCell>
      <TableCell>
        {documentType.description}
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {documentType.numeratorCode}
        </Badge>
      </TableCell>
      <TableCell>
        {documentType.inventoryMovement ? (
          <Badge variant="default" className="bg-green-600">
            Sì
          </Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        )}
      </TableCell>
      <TableCell>
        {documentType.valuationImpact ? (
          <Badge variant="default" className="bg-blue-600">
            Sì
          </Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={documentType.operationSign === 1 ? 'default' : 'destructive'}>
          {documentType.operationSign === 1 ? '+1' : '-1'}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={documentType.active ? 'default' : 'secondary'}>
          {documentType.active ? 'Attiva' : 'Disattiva'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <EditDocumentTypeDialog documentType={documentType} />
          <DeleteDocumentTypeButton documentTypeId={documentType.id} />
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton per caricamento tabella
 */
function DocumentTypesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurazioni Tipi Documento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Numerazione</TableHead>
                <TableHead>Movimenta Stock</TableHead>
                <TableHead>Impatto Valutazione</TableHead>
                <TableHead>Segno</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-16 bg-muted animate-pulse rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

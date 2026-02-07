/**
 * Pagina gestione Documenti
 * 
 * Mostra una tabella con tutti i documenti dell'organizzazione corrente.
 * MULTITENANT: Tutti i documenti sono filtrati per organizationId
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getDocumentsAction } from '@/services/actions/document-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/decimal-utils';
import { Decimal } from 'decimal.js';
import { VatNumberDisplay } from '@/components/features/VatNumberDisplay';

/**
 * Componente principale della pagina
 */
export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documenti</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci preventivi, ordini, DDT, fatture e note credito
          </p>
        </div>
        <Link href="/documents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Documento
          </Button>
        </Link>
      </div>

      {/* Tabella Documenti */}
      <Suspense fallback={<DocumentsTableSkeleton />}>
        <DocumentsTable />
      </Suspense>
    </div>
  );
}

/**
 * Tabella documenti con dati dal server
 */
async function DocumentsTable() {
  const result = await getDocumentsAction();

  if (!result.success) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Errore: {result.error}</p>
        </CardContent>
      </Card>
    );
  }

  const documents = result.data;

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessun documento presente</p>
          <p className="text-sm text-muted-foreground mt-2">
            Crea il tuo primo documento utilizzando il pulsante "Nuovo Documento"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documenti</CardTitle>
        <CardDescription>
          {documents.length} documento{documents.length !== 1 ? 'i' : ''} presente{documents.length !== 1 ? 'i' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente/Fornitore</TableHead>
                <TableHead className="text-right">Imponibile</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Totale</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.number}</TableCell>
                  <TableCell>
                    {new Date(doc.date).toLocaleDateString('it-IT', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.documentType.description}</Badge>
                  </TableCell>
                  <TableCell>
                    {doc.entity ? (
                      <div>
                        <div className="font-medium">{doc.entity.businessName}</div>
                        {doc.entity.vatNumber && (
                          <VatNumberDisplay vatNumber={doc.entity.vatNumber} />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(new Decimal(doc.netTotal))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(new Decimal(doc.vatTotal))}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(new Decimal(doc.grossTotal))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/documents/${doc.id}`}>
                      <Button variant="ghost" size="sm">
                        Dettagli
                      </Button>
                    </Link>
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

/**
 * Skeleton per caricamento tabella
 */
function DocumentsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documenti</CardTitle>
        <CardDescription>Caricamento...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente/Fornitore</TableHead>
                <TableHead className="text-right">Imponibile</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Totale</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto" />
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

/**
 * Pagina dettaglio Documento
 * 
 * Mostra i dettagli completi di un documento con tutte le righe.
 * MULTITENANT: Verifica che il documento appartenga all'organizzazione corrente
 * 
 * NOTA: I documenti sono IMMUTABILI (regola snapshot). Non è possibile modificarli,
 * ma è possibile visualizzarli e scaricare l'XML FatturaPA se è una fattura.
 */

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getDocumentAction } from '@/services/actions/document-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/decimal-utils';
import { Decimal } from 'decimal.js';
import { DownloadXMLButton } from '@/components/features/DownloadXMLButton';
import { VatNumberDisplay } from '@/components/features/VatNumberDisplay';

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = await params;
  
  // Recupera documento
  const result = await getDocumentAction(id);

  if (!result.success) {
    if (result.error.includes('non trovato') || result.error.includes('Accesso negato')) {
      notFound();
    }
    // Altri errori: reindirizza alla lista
    redirect('/documents');
  }

  const document = result.data;

  // Mappa categoria a label
  const categoryLabels: Record<string, string> = {
    QUOTE: 'Preventivo',
    ORDER: 'Ordine',
    DELIVERY_NOTE: 'DDT',
    INVOICE: 'Fattura',
    CREDIT_NOTE: 'Nota Credito',
  };

  const categoryVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    QUOTE: 'outline',
    ORDER: 'secondary',
    DELIVERY_NOTE: 'default',
    INVOICE: 'default',
    CREDIT_NOTE: 'destructive',
  };


  return (
    <div className="space-y-6">
      {/* Header con breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {document.documentType.description} {document.number}
            </h1>
            <p className="text-muted-foreground mt-1">
              Dettaglio documento
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={categoryVariants[document.category] || 'default'}>
            {categoryLabels[document.category] || document.category}
          </Badge>
          {(document.category === 'INVOICE' || document.category === 'CREDIT_NOTE') && (
            <DownloadXMLButton documentId={id} />
          )}
          <Link href={`/documents/${id}/edit`}>
            <Button variant="outline">
              Modifica
            </Button>
          </Link>
        </div>
      </div>

      {/* Card Informazioni Documento */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Documento</CardTitle>
          <CardDescription>
            Dati principali del documento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Numero</Label>
              <p className="text-lg font-mono">{document.number}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Data</Label>
              <p className="text-lg">
                {new Date(document.date).toLocaleDateString('it-IT', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Tipo Documento</Label>
              <p className="text-lg">{document.documentType.description}</p>
            </div>
            {document.entity && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Cliente/Fornitore</Label>
                <p className="text-lg">{document.entity.businessName}</p>
                {document.entity.vatNumber && (
                  <VatNumberDisplay vatNumber={document.entity.vatNumber} />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card Dati Cliente (Snapshot) */}
      <Card>
        <CardHeader>
          <CardTitle>Dati Cliente/Fornitore</CardTitle>
          <CardDescription>
            Dati al momento della creazione del documento (snapshot immutabile)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Ragione Sociale</Label>
              <p className="text-base">{document.customerNameSnapshot || '-'}</p>
            </div>
            {document.customerVatSnapshot && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">P.IVA</Label>
                <p className="text-base">{document.customerVatSnapshot}</p>
              </div>
            )}
            {document.customerFiscalCodeSnapshot && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Codice Fiscale</Label>
                <p className="text-base">{document.customerFiscalCodeSnapshot}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Indirizzo</Label>
              <p className="text-base">
                {document.customerAddressSnapshot || '-'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Città</Label>
              <p className="text-base">
                {[document.customerZip, document.customerCity, document.customerProvince]
                  .filter(Boolean)
                  .join(' ') || '-'}
              </p>
            </div>
            {document.customerSdiSnapshot && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Codice SDI</Label>
                <p className="text-base">{document.customerSdiSnapshot}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card Righe Documento */}
      <Card>
        <CardHeader>
          <CardTitle>Righe Documento</CardTitle>
          <CardDescription>
            {document.lines.length} riga{document.lines.length !== 1 ? 'e' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead className="text-right">Quantità</TableHead>
                  <TableHead className="text-right">Prezzo Unit.</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Imponibile</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.lines.map((line) => {
                  const vatPercent = (parseFloat(line.vatRate) * 100).toFixed(0);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono text-sm">
                        {line.productCode}
                      </TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">
                        {new Decimal(line.quantity).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(new Decimal(line.unitPrice))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{vatPercent}%</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(new Decimal(line.netAmount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(new Decimal(line.vatAmount))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(new Decimal(line.grossAmount))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Card Totali */}
      <Card>
        <CardHeader>
          <CardTitle>Totali Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Imponibile:</span>
                <span className="font-medium">
                  {formatCurrency(new Decimal(document.netTotal))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA:</span>
                <span className="font-medium">
                  {formatCurrency(new Decimal(document.vatTotal))}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Totale:</span>
                <span>{formatCurrency(new Decimal(document.grossTotal))}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Note e Termini di Pagamento */}
      {(document.notes || document.paymentTerms) && (
        <Card>
          <CardHeader>
            <CardTitle>Note e Termini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {document.notes && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Note</Label>
                <p className="text-base whitespace-pre-wrap">{document.notes}</p>
              </div>
            )}
            {document.paymentTerms && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Termini di Pagamento</Label>
                <p className="text-base">{document.paymentTerms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

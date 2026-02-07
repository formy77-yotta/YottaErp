/**
 * Body della DataTable Documenti: righe documento con link e azioni.
 */

import Link from 'next/link';
import {
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/decimal-utils';
import { Decimal } from 'decimal.js';
import { VatNumberDisplay } from '@/components/features/VatNumberDisplay';
import { DownloadXMLIconButton } from '@/components/features/DownloadXMLIconButton';
import type { DocumentRow } from '@/services/actions/document-actions';

interface DocumentsTableBodyProps {
  documents: DocumentRow[];
}

export function DocumentsTableBody({ documents }: DocumentsTableBodyProps) {
  return (
    <TableBody>
      {documents.map((doc) => {
        const cells = [
          <TableCell key="num" className="font-medium">{doc.number}</TableCell>,
          <TableCell key="date">
            {new Date(doc.date).toLocaleDateString('it-IT', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </TableCell>,
          <TableCell key="type">
            <Badge variant="outline">{doc.documentType.description}</Badge>
          </TableCell>,
          <TableCell key="entity">
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
          </TableCell>,
          <TableCell key="net" className="text-right">
            {formatCurrency(new Decimal(doc.netTotal))}
          </TableCell>,
          <TableCell key="vat" className="text-right">
            {formatCurrency(new Decimal(doc.vatTotal))}
          </TableCell>,
          <TableCell key="gross" className="text-right font-medium">
            {formatCurrency(new Decimal(doc.grossTotal))}
          </TableCell>,
          <TableCell key="search" />,
          <TableCell key="actions" className="text-right">
            <div className="flex items-center justify-end gap-2">
              {(doc.category === 'INVOICE' || doc.category === 'CREDIT_NOTE') && (
                <DownloadXMLIconButton documentId={doc.id} />
              )}
              <Link href={`/documents/${doc.id}`}>
                <Button variant="ghost" size="sm">
                  Dettagli
                </Button>
              </Link>
            </div>
          </TableCell>,
        ];
        return <TableRow key={doc.id}>{cells}</TableRow>;
      })}
    </TableBody>
  );
}


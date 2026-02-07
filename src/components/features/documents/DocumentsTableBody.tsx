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
          <TableCell /> {/* Colonna ricerca (header) */}
          <TableCell className="text-right">
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
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
